from channels.exceptions import DenyConnection, StopConsumer
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
        Sends real-time updates to connected clients when a new vote is added.
        """
        try:
            if poll_id:
                message["poll_id"] = poll_id

                # Rate limit updates to prevent flooding
                cache_key = f"vote_update_{poll_id}"
                if not cache.get(cache_key):
                    await self.send_json(message)
                    cache.set(cache_key, True, timeout=1) 
        except Exception as e:
            logger.error(f"Error in vote activity handler: {str(e)}")
            await self.send_error("Error processing vote update")

    @vote_activity_handler.serializer
    def vote_activity_serializer(self, instance: Vote, action, **kwargs):
        """
        Serializes and caches vote data in real-time with optimized caching.
        """
        try:
            poll = instance.poll
            poll_id = poll.id
            cache_key = f"poll_{poll_id}_results"

            # Check Redis cache for existing poll results
            cached_results = cache.get(cache_key)
            if cached_results:
                return {"action": action, "poll_results": cached_results}

            # Fetch poll and vote data
            poll_data = PollSerializer(poll).data
            votes = Vote.objects.filter(poll=poll).values('contestant').annotate(
                total_votes=Sum('number_of_votes')
            ).order_by('-total_votes')

            # Convert to list to handle empty querysets
            poll_data['votes'] = list(votes)
            poll_data['last_updated'] = timezone.now().isoformat()

            # Cache results with progressive timeout
            vote_count = len(votes)
            timeout = min(30 + (vote_count // 100) * 5, 300)  # Max 5 minutes
            cache.set(cache_key, poll_data, timeout=timeout)

            return {
                "action": action,
                "poll_results": poll_data
            }
        except Exception as e:
            logger.error(f"Error in vote serializer: {str(e)}")
            return {
                "action": action,
                "poll_results": {
                    "id": poll_id if 'poll_id' in locals() else None,
                    "votes": [],
                    "last_updated": timezone.now().isoformat()
                }
            }

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
                return await self.send_json({"error": f"Poll {poll_id} not found"})

            self.room_group_name = f"poll_{poll_id}"
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            # Send initial poll data
            poll_data = await database_sync_to_async(
                lambda: PollSerializer(Poll.objects.get(id=poll_id)).data
            )()
            votes = await database_sync_to_async(
                lambda: Vote.objects.filter(poll_id=poll_id).values('contestant').annotate(
                    total_votes=Sum('number_of_votes')
                ).order_by('-total_votes')
            )()
            poll_data['votes'] = list(votes)
            poll_data['last_updated'] = timezone.now().isoformat()

            await self.send_json({
                "status": "subscribed",
                "poll_id": poll_id,
                "poll_results": poll_data
            })
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

    async def vote_update(self, event):
        """
        Handle vote update events sent to the group.
        """
        try:
            poll_id = event['data'].get('poll_id')
            # Fetch latest poll results
            poll = await database_sync_to_async(Poll.objects.get)(id=poll_id)
            poll_data = PollSerializer(poll).data
            votes = await database_sync_to_async(
                lambda: list(Vote.objects.filter(poll_id=poll_id).values('contestant').annotate(
                    total_votes=Sum('number_of_votes')
                ).order_by('-total_votes'))
            )()
            poll_data['votes'] = votes
            poll_data['last_updated'] = timezone.now().isoformat()
            await self.send_json({
                'type': 'poll_results',
                'poll_results': poll_data
            })
        except Exception as e:
            logger.error(f"Error in vote_update: {str(e)}")
            await self.send_json({
                'type': 'error',
                'message': 'Failed to process vote update'
            })


class PollConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Handle WebSocket connections with poll ID validation and initial data."""
        self.poll_id = self.scope['url_route']['kwargs']['poll_id']
        self.room_group_name = f'poll_{self.poll_id}'

        # Validate poll existence
        poll_exists = await database_sync_to_async(Poll.objects.filter(id=self.poll_id).exists)()
        if not poll_exists:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Poll {self.poll_id} not found'
            }))
            await self.close()
            return

        try:
            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()

            # Send initial poll results
            await self.send_poll_results()
            
            logger.info(f"WebSocket connected for poll {self.poll_id}: {self.channel_name}")
        except Exception as e:
            logger.error(f"Error in WebSocket connect for poll {self.poll_id}: {str(e)}")
            await self.close()

    async def disconnect(self, close_code):
        """Handle WebSocket disconnections."""
        try:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            logger.info(f"WebSocket disconnected for poll {self.poll_id}: {self.channel_name}, code: {close_code}")
        except Exception as e:
            logger.error(f"Error in WebSocket disconnection: {str(e)}")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        try:
            if not text_data:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Empty message received'
                }))
                return
                
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type', 'vote_update')
            
            # Handle different message types
            if message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            elif message_type == 'request_update':
                await self.send_poll_results()
            else:
                # Broadcast to group for vote updates
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'vote_update',
                        'data': text_data_json
                    }
                )
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error for poll {self.poll_id}: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid message format'
            }))
        except Exception as e:
            logger.error(f"Error receiving message for poll {self.poll_id}: {str(e)}")

    async def vote_update(self, event):
        """Send vote update to WebSocket clients."""
        try:
            await self.send_poll_results()
        except Exception as e:
            logger.error(f"Error in vote update for poll {self.poll_id}: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to process vote update'
            }))

    async def send_poll_results(self):
        """Fetch and send current poll results."""
        try:
            # Get poll data
            poll = await database_sync_to_async(Poll.objects.get)(id=self.poll_id)
            poll_data = await database_sync_to_async(lambda: PollSerializer(poll).data)()
            
            # Get vote totals
            votes = await database_sync_to_async(
                lambda: list(Vote.objects.filter(poll_id=self.poll_id).values('contestant').annotate(
                    total_votes=Sum('number_of_votes')
                ).order_by('-total_votes'))
            )()
            
            poll_data['votes'] = votes
            poll_data['last_updated'] = timezone.now().isoformat()

            # Cache results for performance
            cache_key = f"poll_{self.poll_id}_results"
            cache.set(cache_key, poll_data, timeout=60)  # Cache for 1 minute

            await self.send(text_data=json.dumps({
                'type': 'poll_results',
                'poll_results': poll_data
            }))
        except Exception as e:
            logger.error(f"Error sending poll results for poll {self.poll_id}: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to fetch poll results'
            }))