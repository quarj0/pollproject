from django.db import models
from poll.models import Poll, Contestant


class Vote(models.Model):
    poll = models.ForeignKey(
        Poll, on_delete=models.CASCADE, related_name="votes")
    contestant = models.ForeignKey(
        Contestant, on_delete=models.CASCADE, related_name="votes")
    number_of_votes = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    payment_verified = models.BooleanField(default=False)
    def __str__(self):
        return f"{self.number_of_votes} votes for {self.contestant.name}"

    def save(self, *args, **kwargs):
        if not self.pk:  
            poll = self.poll
            if poll.poll_type == 'voters-pay' and not self.payment_verified:
                raise ValueError(
                    "Payment verification required for voter-pay polls")
        super().save(*args, **kwargs)


class VoterCode(models.Model):
    poll = models.ForeignKey(
        Poll, on_delete=models.CASCADE, related_name="voter_codes")
    code = models.CharField(max_length=20, unique=True)
    used = models.BooleanField(default=False)

    def __str__(self):
        return f"Voter Code: {self.code} for Poll: {self.poll.title}"
