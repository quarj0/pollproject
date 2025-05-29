from djangochannelsrestframework.generics import GenericAsyncAPIConsumer
from djangochannelsrestframework.decorators import action
from djangochannelsrestframework.observer import model_observer
from channels.exceptions import StopConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
from django.core.cache import cache
from django.db.models import Sum
from django.utils import timezone
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
import json

from .models import Poll
from vote.models import Vote
from .serializers import PollSerializer
from vote.serializers import VoteSerializer

logger = logging.getLogger(__name__)


class VoteConsumer(GenericAsyncAPIConsumer):
    queryset = Vote.objects.all()
    serializer_class = VoteSerializer

    async def connect(self):
        """
        Handle new WebSocket connections.
        """
        try:
            await self.accept()
            logger.info(
                f"New WebSocket connection established: {self.channel_name}")
        except Exception as e:
            logger.error(f"Error in WebSocket connection: {str(e)}")
            await self.close()

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnections.
        """
        try:
            logger.info(
                f"WebSocket disconnected: {self.channel_name}, code: {close_code}")
            if hasattr(self, 'room_group_name'):
                await self.channel_layer.group_discard(
                    self.room_group_name,
                    self.channel_name
                )
        except Exception as e:
            logger.error(f"Error in WebSocket disconnection: {str(e)}")
        finally:
            raise StopConsumer()

    @model_observer(Vote)
    async def vote_activity_handler(self, message, observer=None, poll_id=None, **kwargs):
        """
        Sends real-time updates to the connected clients when a new vote is added.
        """
        try:
            if poll_id:
                message["poll_id"] = poll_id

                # Rate limit updates to prevent flooding
                cache_key = f"vote_update_{poll_id}"
                if not cache.get(cache_key):
                    await self.send_json(message)
                    # Set a small cache timeout to prevent flooding (e.g., 1 second)
                    cache.set(cache_key, True, timeout=1)
        except Exception as e:
            logger.error(f"Error in vote activity handler: {str(e)}")
            await self.send_error("Error processing vote update")

    @vote_activity_handler.serializer
    def vote_activity_serializer(self, instance: Vote, action, **kwargs):
        """
        Serializes and caches the vote data in real-time with optimized caching.
        """
        try:
            poll = instance.poll
            poll_id = poll.id
            cache_key = f"poll_{poll_id}_results"

            # Check Redis cache for existing poll results
            cached_results = cache.get(cache_key)
            if cached_results:
                return {"action": action, "poll_results": cached_results}

            # Calculate the current vote results if not cached
            votes = Vote.objects.filter(poll=poll).values('contestant').annotate(
                total_votes=Sum('number_of_votes')
            ).order_by('-total_votes')

            poll_data = PollSerializer(poll).data
            poll_data['votes'] = votes
            poll_data['last_updated'] = timezone.now().isoformat()

            # Cache the results with progressive timeout
            vote_count = len(votes)
            # Longer cache for polls with more votes
            timeout = min(30 + (vote_count // 100) * 5, 300)  # Max 5 minutes
            cache.set(cache_key, poll_data, timeout=timeout)

            return {
                "action": action,
                "poll_results": poll_data
            }
        except Exception as e:
            logger.error(f"Error in vote serializer: {str(e)}")
            return {"error": "Failed to process vote data"}

    @action()
    async def subscribe_to_poll_results(self, poll_id, **kwargs):
        """
        Subscribes the client to real-time updates for the given poll with validation.
        """
        try:
            if not poll_id:
                return await self.send_json({"error": "Poll ID is required"})

            poll_exists = await database_sync_to_async(Poll.objects.filter(id=poll_id).exists)()
            if not poll_exists:
                return await self.send_json({"error": "Poll not found"})

            self.room_group_name = f"poll_{poll_id}"
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            # Send initial poll data
            await self.vote_activity_handler.subscribe(poll_id=poll_id)
            await self.send_json({"status": "subscribed", "poll_id": poll_id})

        except Exception as e:
            logger.error(f"Error in poll subscription: {str(e)}")
            await self.send_json({"error": "Failed to subscribe to poll updates"})

    @action()
    async def unsubscribe_from_poll_results(self, poll_id, **kwargs):
        """
        Unsubscribes the client from updates for the given poll.
        """
        try:
            await self.vote_activity_handler.unsubscribe(poll_id=poll_id)
            if hasattr(self, 'room_group_name'):
                await self.channel_layer.group_discard(
                    f"poll_{poll_id}",
                    self.channel_name
                )
            await self.send_json({"status": "unsubscribed", "poll_id": poll_id})
        except Exception as e:
            logger.error(f"Error in poll unsubscription: {str(e)}")
            await self.send_json({"error": "Failed to unsubscribe from poll updates"})

    async def send_error(self, message):
        """
        Helper method to send error messages to the client.
        """
        await self.send_json({
            "type": "error",
            "message": message,
            "timestamp": timezone.now().isoformat()
        })


class PollConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.poll_id = self.scope['url_route']['kwargs']['poll_id']
        self.room_group_name = f'poll_{self.poll_id}'

        # Join room group
        try:
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()
        except Exception as e:
            raise DenyConnection(str(e))

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'vote_update',
                    'data': text_data_json
                }
            )
        except json.JSONDecodeError:
            pass

    async def vote_update(self, event):
        data = event['data']
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'vote_update',
            'data': data
        }))
