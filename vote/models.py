from django.db import models
from poll.models import Poll, Contestant


class Vote(models.Model):
    poll = models.ForeignKey(
        Poll, on_delete=models.CASCADE, related_name="votes")
    contestant = models.ForeignKey(
        Contestant, on_delete=models.CASCADE, related_name="votes")
    number_of_votes = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.number_of_votes} votes for {self.contestant.name}"
