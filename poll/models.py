from django.db import models
from authentication.models import User


class Poll(models.Model):
    CREATOR_PAY = 'creator-pay'
    VOTERS_PAY = 'voters-pay'

    POLL_TYPES = [
        (CREATOR_PAY, 'Creator-Pay'),
        (VOTERS_PAY, 'Voters-Pay')
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    poll_type = models.CharField(max_length=20, choices=POLL_TYPES)
    expected_voters = models.PositiveIntegerField(
        null=True, blank=True)
    voting_fee = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, default=0)
    setup_fee = models.PositiveIntegerField(null=True, blank=True, default=0)
    creator = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="polls")
    active = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.title} ({self.poll_type})"


class Contestant(models.Model):
    poll = models.ForeignKey(
        Poll, on_delete=models.CASCADE, related_name="contestants")
    category = models.CharField(max_length=100)
    name = models.CharField(max_length=100)
    award = models.CharField(max_length=100, blank=True)
    # nominee_code = models.CharField(max_length=10, unique=True)
    image = models.ImageField(upload_to='contestant_images/', blank=True, null=True)

    def __str__(self):
        return f"{self.name} - {self.category} in {self.poll.title}"


class Vote(models.Model):
    poll = models.ForeignKey(
        Poll, on_delete=models.CASCADE, related_name="votes")
    contestant = models.ForeignKey(
        Contestant, on_delete=models.CASCADE, related_name="votes")
    number_of_votes = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.number_of_votes} votes for {self.contestant.name}"
