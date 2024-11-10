from django.utils import timezone
from rest_framework import serializers
from django.utils import timezone
from poll.models import Poll, Contestant
from .models import Vote, VoterCode


class VoteSerializer(serializers.ModelSerializer):
    poll = serializers.PrimaryKeyRelatedField(
        queryset=Poll.objects.all(), required=False)
    contestant = serializers.PrimaryKeyRelatedField(
        queryset=Contestant.objects.all(), required=False)
    number_of_votes = serializers.IntegerField(required=False, default=1)

    class Meta:
        model = Vote
        fields = ['id', 'poll', 'contestant', 'number_of_votes', 'created_at']
        read_only_fields = ['created_at']

    def validate(self, data):
        # Ensure poll is active and within voting period
        poll = data.get('poll')
        contestant = data.get('contestant')
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
        return data

    def create(self, validated_data):
        return super().create(validated_data)


class VoterCodeSerializer(serializers.ModelSerializer):
    pass