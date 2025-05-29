from django.db import models
from poll.models import Poll, Contestant
from payment.models import Transaction


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
