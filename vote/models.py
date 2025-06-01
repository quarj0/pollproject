from django.db import models
from poll.models import Poll, Contestant
from payment.models import Transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone


class Vote(models.Model):
    poll = models.ForeignKey(
        Poll, on_delete=models.CASCADE, related_name="votes")
    contestant = models.ForeignKey(
        Contestant, on_delete=models.CASCADE, related_name="votes")
    number_of_votes = models.PositiveIntegerField(default=1)
    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="votes"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.number_of_votes} vote(s) for {self.contestant.name}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)


class VoterCode(models.Model):
    poll = models.ForeignKey(
        Poll, on_delete=models.CASCADE, related_name="voter_codes")
    code = models.CharField(max_length=20, unique=True)
    used = models.BooleanField(default=False)

    def __str__(self):
        return f"Voter Code: {self.code} for Poll: {self.poll.title}"





@receiver(post_save, sender=Vote)
def vote_created_handler(sender, instance, created, **kwargs):
    """Trigger WebSocket update when a vote is created or updated."""
    if created or kwargs.get('update_fields'):
        channel_layer = get_channel_layer()
        poll_id = instance.poll.id
        
        # Send update to all connections in the poll group
        async_to_sync(channel_layer.group_send)(
            f'poll_{poll_id}',
            {
                'type': 'vote_update',
                'poll_id': poll_id,
                'vote_id': instance.id,
                'contestant_id': instance.contestant.id,
                'timestamp': timezone.now().isoformat()
            }
        )
