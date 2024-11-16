from djangochannelsrestframework.generics import GenericAsyncAPIConsumer
from djangochannelsrestframework.decorators import action
from djangochannelsrestframework.observer import model_observer
from .models import Poll
from vote.models import Vote
from .serializers import PollSerializer
from vote.serializers import VoteSerializer
from django.db.models import Sum
from channels.db import database_sync_to_async
from django.core.cache import cache


class VoteConsumer(GenericAsyncAPIConsumer):
    queryset = Vote.objects.all()
    serializer_class = VoteSerializer

    @model_observer(Vote)
    async def vote_activity_handler(self, message, observer=None, poll_id=None, **kwargs):
        """
        Sends real-time updates to the connected clients when a new vote is added.
        """
        if poll_id:
            message["poll_id"] = poll_id
        await self.send_json(message)

    @vote_activity_handler.serializer
    def vote_activity_serializer(self, instance: Vote, action, **kwargs):
        """
        Serializes and caches the vote data in real-time.
        """
        poll = instance.poll
        poll_id = poll.id

        # Check Redis cache for existing poll results
        cached_results = cache.get(f"poll_{poll_id}_results")
        if cached_results:
            return {"action": action, "poll_results": cached_results}

        # Calculate the current vote results if not cached
        votes = Vote.objects.filter(poll=poll).values('contestant').annotate(
            total_votes=Sum('number_of_votes')
        ).order_by('-total_votes')
        poll_data = PollSerializer(poll).data
        poll_data['votes'] = votes

        # Cache the results for a specified timeout (e.g., 30 seconds)
        cache.set(f"poll_{poll_id}_results", poll_data, timeout=30)

        return {
            "action": action,
            "poll_results": poll_data
        }

    @action()
    async def subscribe_to_poll_results(self, poll_id, **kwargs):
        """
        Subscribes the client to real-time updates for the given poll.
        """
        if not await database_sync_to_async(Poll.objects.filter(id=poll_id).exists)():
            return await self.send_json({"error": "Poll not found."})
        await self.vote_activity_handler.subscribe(poll_id=poll_id)

    @action()
    async def unsubscribe_from_poll_results(self, poll_id, **kwargs):
        """
        Unsubscribes the client from updates for the given poll.
        """
        await self.vote_activity_handler.unsubscribe(poll_id=poll_id)
