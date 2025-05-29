from django.core.files.images import get_image_dimensions
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import ValidationError, PermissionDenied
from .models import Poll, Contestant


def validate_image(image):
    valid_mime_types = ['image/jpeg', 'image/png']
    if image.content_type not in valid_mime_types:
        raise serializers.ValidationError(
            "Image must be in JPG or PNG format.")

    max_size = 3 * 1024 * 1024  # 3MB
    if image.size > max_size:
        raise serializers.ValidationError("Image size must be less than 3MB.")

    width, height = get_image_dimensions(image)
    max_width, max_height = 3000, 3000
    if width > max_width or height > max_height:
        raise serializers.ValidationError(
            f"Image dimensions must not exceed {
                max_width}x{max_height} pixels."
        )


def validate_poll_type(data):
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

        if data.get('expected_voters') < 20:
            raise serializers.ValidationError(
                "Expected voters should be at least 20 for creator-pay polls.")

        if data.get('expected_voters') > 350:
            raise serializers.ValidationError(
                "Expected voters cannot exceed 350 for creator-pay polls.")
        data['setup_fee'] = calculate_setup_fee(data['expected_voters'])
    return data


def calculate_setup_fee(expected_voters):
    if 20 <= expected_voters <= 30:
        return 35
    elif 31 <= expected_voters <= 50:
        return 40
    elif 51 <= expected_voters <= 100:
        return 100
    elif 101 <= expected_voters <= 200:
        return 180
    elif 201 <= expected_voters <= 350:
        return 250
    return 0


class PollSerializer(serializers.ModelSerializer):
    poll_image = serializers.SerializerMethodField()

    class Meta:
        model = Poll
        fields = [
            'id', 'title', 'poll_image', 'description', 'start_time', 'end_time',
            'poll_type', 'expected_voters', 'voting_fee', 'active', 'setup_fee'
        ]

    def get_poll_image(self, obj):
        if obj.poll_image:
            return str(obj.poll_image.url)
        return None

    def validate(self, data):
        start_time = data.get('start_time')
        image = data.get('poll_image')

        if image:
            validate_image(image)

        if start_time and start_time < timezone.now():
            raise serializers.ValidationError(
                "Start time must be in the future.")

        validate_poll_type(data)
        return data

    def create(self, validated_data):
        validated_data['creator'] = self.context['request'].user
        return Poll.objects.create(**validated_data)


class UpdatePollSerializer(serializers.ModelSerializer):
    class Meta:
        model = Poll
        fields = [
            'id', 'title', 'poll_image', 'description', 'start_time', 'end_time',
            'poll_type', 'expected_voters', 'voting_fee', 'active', 'setup_fee'
        ]

    def validate(self, data):
        if not self.instance.can_be_edited():
            raise PermissionDenied(
                "Poll cannot be edited after start time or if votes have been cast"
            )

        image = data.get('poll_image')

        if image:
            validate_image(image)

        # Prevent reducing end_time for active polls
        if self.instance and self.instance.active and 'end_time' in data and data['end_time'] < self.instance.end_time:
            raise ValidationError(
                "End time cannot be reduced for an active poll.")
        return data

    def update(self, instance, validated_data):
        if instance.active:
            for field in ['poll_type', 'expected_voters', 'voting_fee']:
                if field in validated_data and validated_data[field] != getattr(instance, field):
                    raise ValidationError(
                        f"{field} cannot be modified for an active poll.")

            if 'start_time' in validated_data and validated_data['start_time'] != instance.start_time:
                raise ValidationError(
                    "Start time cannot be modified for an active poll.")

            if instance.end_time <= timezone.now():
                raise ValidationError(
                    "You cannot update a poll that has already ended.")

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ContestantSerializer(serializers.ModelSerializer):
    contestant_image = serializers.SerializerMethodField()

    class Meta:
        model = Contestant
        fields = ['id', 'poll', 'category', 'name',
                  'nominee_code', 'contestant_image']
        read_only_fields = ['nominee_code']

    def get_contestant_image(self, obj):
        if obj.contestant_image:
            return str(obj.contestant_image.url)
        return None

    def validate(self, data):
        if 'contestant_image' in data and data['contestant_image']:
            validate_image(data['contestant_image'])
        return data

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if 'name' in validated_data:
            instance.nominee_code = instance.generate_nominee_code()
        instance.save()
        return instance
