from djangochannelsrestframework.generics import GenericAsyncAPIConsumer
from djangochannelsrestframework.decorators import action
from djangochannelsrestframework.observer import model_observer
from vote.models import Vote
from .serializers import PollSerializer
from vote.serializers import VoteSerializer
from django.db.models import Sum


class VoteConsumer(GenericAsyncAPIConsumer):
    queryset = Vote.objects.all()
    serializer_class = VoteSerializer

    @model_observer(Vote)
    async def vote_activity_handler(self, message, observer=None, **kwargs):
        """
        Sends real-time updates to the connected clients when a new vote is added.
        """
        await self.send_json(message)

    @vote_activity_handler.serializer
    def vote_activity_serializer(self, instance: Vote, action, **kwargs):
        """
        Serializes the vote data in real-time.
        """
        poll = instance.poll
        votes = Vote.objects.filter(poll=poll).values('contestant').annotate(
            total_votes=Sum('number_of_votes')
        ).order_by('-total_votes')

        poll_data = PollSerializer(poll).data
        poll_data['votes'] = votes
        return {
            "action": action,
            "poll_results": poll_data
        }

    @action()
    async def subscribe_to_poll_results(self, poll_id, **kwargs):
        """
        This subscribes the client to updates for the given poll.
        """
        await self.vote_activity_handler.subscribe(poll_id=poll_id)

    @action()
    async def unsubscribe_from_poll_results(self, poll_id, **kwargs):
        """
        This unsubscribes the client from updates for the given poll.
        """
        await self.vote_activity_handler.unsubscribe(poll_id=poll_id)
