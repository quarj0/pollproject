from rest_framework import serializers
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['transaction_type', 'poll_id',
                  'amount', 'success', 'created_at']
        read_only_fields = fields
