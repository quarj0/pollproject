from django.utils import timezone
from rest_framework import serializers
from django.utils import timezone

from .models import Poll, Contestant, Vote



class ContestantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contestant
        fields = [
            'id', 'category', 'name', 'award', 'nominee_code',
            'image'
        ]
        read_only_fields = ['nominee_code'] 

    def create(self, validated_data):
        contestant = Contestant.objects.create(**validated_data)
        contestant.save()
        return contestant


class PollSerializer(serializers.ModelSerializer):
    contestants = ContestantSerializer(many=True)
    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()

    class Meta:
        model = Poll
        fields = [
            'id', 'title', 'description', 'start_time', 'end_time',
            'poll_type', 'expected_voters', 'voting_fee',
            'active', 'contestants', 'setup_fee'
        ]

    def validate_expected_voters(self, value):
        if self.initial_data.get('poll_type') == Poll.CREATOR_PAY:
            if not (20 <= value <= 200):
                raise serializers.ValidationError(
                    "Expected voters must be between 20 and 200 for creator-pay polls."
                )
        return value

    def validate(self, data):
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError(
                "End time must be after start time.")
        if data['start_time'] < timezone.now():
            raise serializers.ValidationError(
                "Start time must be in the future.")

        poll_type = data.get('poll_type')
        if poll_type == Poll.VOTERS_PAY:
            if data.get('voting_fee') is None or data['voting_fee'] <= 0:
                raise serializers.ValidationError(
                    "Voting fee is required and must be positive for voters-pay polls.")
            if data.get('expected_voters') is not None:
                raise serializers.ValidationError(
                    "Expected voters should not be set for voters-pay polls.")

        elif poll_type == Poll.CREATOR_PAY:
            if data.get('voting_fee') is not None:
                raise serializers.ValidationError(
                    "Voting fee should not be set for creator-pay polls.")
            if data.get('expected_voters') is None:
                raise serializers.ValidationError(
                    "Expected voters is required for creator-pay polls.")
            data['setup_fee'] = self.calculate_setup_fee(
                data['expected_voters'])

        return data

    def calculate_setup_fee(self, expected_voters):
        """Calculate setup fee based on the expected voters."""
        if 20 <= expected_voters <= 60:
            return 25
        elif 61 <= expected_voters <= 100:
            return 35
        elif 101 <= expected_voters <= 200:
            return 50
        return 0

    def create(self, validated_data):
        contestants_data = validated_data.pop('contestants')
        validated_data['creator'] = self.context['request'].user
        poll = Poll.objects.create(**validated_data)

        for contestant_data in contestants_data:
            Contestant.objects.create(poll=poll, **contestant_data)

        return poll


class VoteSerializer(serializers.ModelSerializer):
    poll = serializers.PrimaryKeyRelatedField(queryset=Poll.objects.all())
    contestant = serializers.PrimaryKeyRelatedField(
        queryset=Contestant.objects.all())

    class Meta:
        model = Vote
        fields = [
            'id', 'poll', 'contestant', 'number_of_votes', 'created_at'
        ]
        read_only_fields = ['created_at']

    def validate(self, data):
        poll = data['poll']
        contestant = data['contestant']

        if not poll.active:
            raise serializers.ValidationError("Poll is not active.")

        if timezone.now() < poll.start_time:
            raise serializers.ValidationError(
                "Voting has not started for this poll.")

        if timezone.now() > poll.end_time:
            raise serializers.ValidationError(
                "Voting has ended for this poll.")

        if contestant.poll != poll:
            raise serializers.ValidationError(
                "Contestant does not belong to the selected poll.")

        return data

    def create(self, validated_data):
        return super().create(validated_data)
