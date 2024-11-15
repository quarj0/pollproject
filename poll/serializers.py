from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from .models import Poll, Contestant


class ContestantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contestant
        fields = [
            'id', 'category', 'name', 'award', 'nominee_code',
            'image'
        ]
        read_only_fields = ['nominee_code']

    def create(self, validated_data):
        return Contestant.objects.create(**validated_data)


class PollSerializer(serializers.ModelSerializer):
    contestants = ContestantSerializer(many=True)

    class Meta:
        model = Poll
        fields = [
            'id', 'title', 'description', 'start_time', 'end_time',
            'poll_type', 'expected_voters', 'voting_fee',
            'active', 'contestants', 'setup_fee'
        ]

    def validate(self, data):
        start_time = data.get('start_time')
        end_time = data.get('end_time')

        # Check if start time is in the future and end time is after start time
        if start_time and start_time < timezone.now():
            raise serializers.ValidationError(
                "Start time must be in the future.")
        if end_time and start_time >= end_time:
            raise serializers.ValidationError(
                "End time must be after start time.")

        if 'contestants' not in data or len(data['contestants']) < 2:
            raise serializers.ValidationError(
                "A poll must have at least 2 contestants")
            
        if end_time and end_time < timezone.now():
            data['active'] = False

        # Validate poll_type and voting conditions
        poll_type = data.get('poll_type')
        if poll_type == Poll.VOTERS_PAY:
            if data.get('voting_fee') is None or data['voting_fee'] <= 0:
                raise serializers.ValidationError(
                    "Voting fee is required for voters-pay polls.")

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

            if data.get('expected_voters') < 20:
                raise serializers.ValidationError(
                    "Expected voters should be at least 20 for creator-pay polls.")

            if data.get('expected_voters') > 200:
                raise serializers.ValidationError(
                    "Expected voters cannot exceed 200 for creator-pay polls.")

        return data

    def calculate_setup_fee(self, expected_voters):
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


class UpdatePollSerializer(serializers.ModelSerializer):
    contestants = ContestantSerializer(many=True)

    class Meta:
        model = Poll
        fields = [
            'id', 'title', 'description', 'start_time', 'end_time',
            'poll_type', 'expected_voters', 'voting_fee',
            'active', 'contestants', 'setup_fee'
        ]

    def validate(self, data):

        # Prevent reducing end_time for active polls
        if self.instance and self.instance.active and 'end_time' in data and data['end_time'] < self.instance.end_time:
            raise ValidationError(
                "End time can only be extended, not reduced, for an active poll.")

        return data

    def update(self, instance, validated_data):
        contestants_data = validated_data.pop('contestants', [])

        if instance.active:
            for field in ['poll_type', 'expected_voters', 'voting_fee']:
                if field in validated_data and validated_data[field] != getattr(instance, field):
                    raise ValidationError(
                        f"{field} cannot be modified for an active poll.")
            if 'start_time' in validated_data and validated_data['start_time'] != instance.start_time:
                raise ValidationError(
                    "Start time cannot be modified for an active poll.")

            if instance.end_time < timezone.now():
                raise ValidationError(
                    "Poll has already ended and cannot be modified.")

        # Update instance fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update contestants
        existing_contestants = list(instance.contestants.all())
        for contestant_data, contestant in zip(contestants_data, existing_contestants):
            new_name = contestant_data.get('name', contestant.name)
            contestant.nominee_code = self.generate_nominee_code(
                new_name, instance.id)
            contestant.category = contestant_data.get(
                'category', contestant.category)
            contestant.name = new_name
            contestant.award = contestant_data.get('award', contestant.award)
            contestant.image = contestant_data.get('image', contestant.image)
            contestant.save()

        return instance

    def generate_nominee_code(self, name, poll_id):
        name_parts = name.split()
        if len(name_parts) == 1:
            code = name_parts[0][:3].upper()
        elif len(name_parts) == 2:
            code = (name_parts[0][:2] + name_parts[1][:1]).upper()
        else:
            code = (name_parts[0][:1] + name_parts[1]
                    [:1] + name_parts[2][:1]).upper()
        return f"{code}{poll_id}"
