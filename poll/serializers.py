from django.utils import timezone
from rest_framework import serializers
from django.utils import timezone
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
        contestant = Contestant.objects.create(**validated_data)
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


class UpdatePollSerializer(serializers.ModelSerializer):
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

    def generate_nominee_code(self, name, poll_id):
        name_parts = name.split()
        if len(name_parts) == 1:
            # Use first 3 letters if there's only one name part
            code = name_parts[0][:3].upper()
        elif len(name_parts) == 2:
            # Use first 2 letters of the first part and 1 letter of the second part
            code = (name_parts[0][:2] + name_parts[1][:1]).upper()
        else:
            # Use first letters of the first three parts
            code = (name_parts[0][:1] + name_parts[1]
                    [:1] + name_parts[2][:1]).upper()

        return f"{code}{poll_id}"

    def validate_expected_voters(self, value):
        if self.initial_data.get('poll_type') == Poll.CREATOR_PAY:
            if not (20 <= value <= 200):
                raise serializers.ValidationError(
                    "Expected voters must be between 20 and 200 for creator-pay polls."
                )
        return value

    def validate(self, data):
        start_time = data.get('start_time')
        end_time = data.get('end_time')

        if start_time and end_time:
            if start_time >= end_time:
                raise serializers.ValidationError("End time must be after start time.")
            if start_time < timezone.now():
                raise serializers.ValidationError("Start time must be in the future.")
            
        if 'end_time' in data and self.instance.active and data['end_time'] < self.instance.end_time:
            raise serializers.ValidationError(
                "End time can only be extended, not reduced, for an active poll.")

        if self.instance:
            if self.instance.end_time < timezone.now():
                raise ValidationError(
                    "Voting has ended; the poll cannot be modified.")

        poll_type = data.get('poll_type')
        if poll_type == Poll.VOTERS_PAY:
            if data.get('voting_fee') is None or data['voting_fee'] <= 0:
                raise serializers.ValidationError(
                    "Voting fee is required and must be positive for voters-pay polls."
                )
            if data.get('expected_voters') is not None:
                raise serializers.ValidationError(
                    "Expected voters should not be set for voters-pay polls."
                )

        elif poll_type == Poll.CREATOR_PAY:
            if data.get('voting_fee') is not None:
                raise serializers.ValidationError(
                    "Voting fee should not be set for creator-pay polls."
                )
            if data.get('expected_voters') is None:
                raise serializers.ValidationError(
                    "Expected voters is required for creator-pay polls."
                )
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

    def update(self, instance, validated_data):
        contestants_data = validated_data.pop('contestants', [])

        if instance.active:
            for field in ['poll_type', 'expected_voters', 'voting_fee']:
                if field in validated_data and validated_data[field] != getattr(instance, field):
                    raise ValidationError(
                        f"{field} cannot be modified for an active poll."
                    )

            if 'start_time' in validated_data and validated_data['start_time'] != instance.start_time:
                raise ValidationError(
                    "Start time cannot be modified for an active poll.")

            
        

        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get(
            'description', instance.description)
        instance.start_time = validated_data.get(
            'start_time', instance.start_time)
        instance.end_time = validated_data.get('end_time', instance.end_time)
        instance.poll_type = validated_data.get(
            'poll_type', instance.poll_type)
        instance.expected_voters = validated_data.get(
            'expected_voters', instance.expected_voters)
        instance.voting_fee = validated_data.get(
            'voting_fee', instance.voting_fee)
        instance.active = validated_data.get('active', instance.active)
        instance.setup_fee = validated_data.get(
            'setup_fee', instance.setup_fee)
        instance.save()

        existing_contestants = list(instance.contestants.all())
        for contestant_data, contestant in zip(contestants_data, existing_contestants):
            new_name = contestant_data.get('name', contestant.name)
            if new_name != contestant.name:
                contestant.nominee_code = contestant.nominee_code = f"{
                    self.generate_nominee_code(new_name, instance.id)}"
            contestant.category = contestant_data.get(
                'category', contestant.category)
            contestant.name = new_name
            contestant.award = contestant_data.get('award', contestant.award)
            contestant.image = contestant_data.get('image', contestant.image)
            contestant.save()

        return instance
