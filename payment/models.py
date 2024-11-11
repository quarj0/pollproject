from django.conf import settings
from django.db import models
from authentication.models import User
from poll.models import Poll
from django.core.exceptions import ValidationError


from django.db import models
from django.core.exceptions import ValidationError
from poll.models import Poll
from django.contrib.auth.models import User


class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('poll_activation', 'Poll Activation'),
        ('vote', 'Vote Payment')
    ]

    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name="transactions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,related_name="transactions", null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_reference = models.CharField(max_length=100, unique=True)
    success = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_type} - {self.poll.title} by {self.user.username if self.user else 'voter'}"

    def clean(self):
        if self.transaction_type == 'poll_activation' and not self.user:
            raise ValidationError(
                'User must be set for poll activation transactions.')
        if self.transaction_type == 'vote' and self.user:
            raise ValidationError(
                'User should not be set for vote transactions.')


class Withdrawal(models.Model):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name="withdrawals")
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="withdrawals")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    account_number = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Withdrawal of {self.amount} for {self.poll.title} by {self.creator.username}"
