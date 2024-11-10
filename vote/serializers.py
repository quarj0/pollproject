from django.utils import timezone
from rest_framework import serializers
from poll.models import Poll, Contestant
from .models import Vote


class VoteSerializer(serializers.ModelSerializer):
    poll = serializers.PrimaryKeyRelatedField(
        queryset=Poll.objects.all(), required=False)
    contestant = serializers.PrimaryKeyRelatedField(
        queryset=Contestant.objects.all(), required=False)
    number_of_votes = serializers.IntegerField(required=False, default=1)
    code = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Vote
        fields = ['id', 'poll', 'contestant',
                  'number_of_votes', 'created_at', 'code']
        read_only_fields = ['created_at']

    def validate(self, data):
        poll = data.get('poll')
        contestant = data.get('contestant')

        # Validate poll status and voting period
        if poll:
            if not poll.active:
                raise serializers.ValidationError("Poll is not active.")
            if timezone.now() < poll.start_time:
                raise serializers.ValidationError("Voting has not started.")
            if timezone.now() > poll.end_time:
                raise serializers.ValidationError("Voting has ended.")

        if contestant and contestant.poll != poll:
            raise serializers.ValidationError(
                "Contestant does not belong to this poll.")

        # Additional validation for creator-pay polls
        if poll.poll_type == Poll.CREATOR_PAY:
            code = data.get('code')
            if not code:
                raise serializers.ValidationError(
                    "Voter code is required for creator-pay polls.")

            # Check if a vote with this code has already been used
            if Vote.objects.filter(poll=poll, code=code, used=True).exists():
                raise serializers.ValidationError(
                    "This voter code has already been used.")

            # Check if the expected voter limit has been reached
            if Vote.objects.filter(poll=poll, used=True).count() >= poll.expected_voters:
                raise serializers.ValidationError(
                    "The maximum number of votes has been reached for this poll.")

        return data

    def create(self, validated_data):
        if validated_data['poll'].poll_type == Poll.CREATOR_PAY:
            validated_data['used'] = True 

        return super().create(validated_data)
