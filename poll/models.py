from django.db import models
from authentication.models import User
import uuid
from cloudinary.models import CloudinaryField
from django.utils import timezone


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
    expected_voters = models.PositiveIntegerField(null=True, blank=True)
    voting_fee = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True, default=0)
    setup_fee = models.PositiveIntegerField(null=True, blank=True, default=0)
    creator = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="polls")
    active = models.BooleanField(default=False)
    poll_image = CloudinaryField('image', null=True, blank=True)

    def __str__(self):
        return f"{self.title} ({self.poll_type})"

    def can_be_edited(self):
        """Check if poll can still be edited"""
        if self.start_time and self.start_time <= timezone.now():
            return False

        # Check if any votes exist
        return not self.votes.exists()


class Contestant(models.Model):
    poll = models.ForeignKey(
        Poll, on_delete=models.CASCADE, related_name="contestants")
    category = models.CharField(max_length=100)
    name = models.CharField(max_length=100)
    nominee_code = models.CharField(max_length=15, unique=True)
    contestant_image = CloudinaryField(
        'image', null=True, blank=True, default='')

    def save(self, *args, **kwargs):
        if not self.nominee_code:
            self.nominee_code = self.generate_nominee_code()
        super().save(*args, **kwargs)

    def generate_nominee_code(self):
        name_parts = self.name.split()
        if len(name_parts) == 1:
            code = name_parts[0][:3].upper()
        elif len(name_parts) == 2:
            code = (name_parts[0][:2] + name_parts[1][:1]).upper()
        else:
            code = (name_parts[0][:1] + name_parts[1]
                    [:1] + name_parts[2][:1]).upper()
        return f"{code}{self.poll.id}{uuid.uuid4().hex[:2]}".upper()

    def __str__(self):
        return f"{self.name} - {self.category} in {self.poll.title}"

    def get_image_url(self):
        return self.contestant_image.url if self.contestant_image else "https://via.placeholder.com/300"
