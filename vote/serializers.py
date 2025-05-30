from django.utils import timezone
from rest_framework import serializers
from poll.models import Poll, Contestant
from .models import Vote, VoterCode
from payment.models import Transaction


class VoteSerializer(serializers.ModelSerializer):
    poll = serializers.PrimaryKeyRelatedField(
        queryset=Poll.objects.all(), required=True)
    contestant = serializers.PrimaryKeyRelatedField(
        queryset=Contestant.objects.all(), required=True)
    number_of_votes = serializers.IntegerField(required=False, default=1)
    transaction = serializers.PrimaryKeyRelatedField(
        queryset=Transaction.objects.all(), required=False)

    class Meta:
        model = Vote
        fields = ['id', 'poll', 'contestant', 'number_of_votes', 'transaction', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, data):
        poll = data.get('poll')
        contestant = data.get('contestant')
        number_of_votes = data.get('number_of_votes')
        # Validate poll status and voting period
        if poll:
            if not poll.active:
                raise serializers.ValidationError("Poll is not active.")

            if timezone.now() < poll.start_time:
                raise serializers.ValidationError("Voting has not started.")

            if timezone.now() > poll.end_time:
                raise serializers.ValidationError("Voting has ended.")


        # Validate number of votes
        if number_of_votes < 1:
            raise serializers.ValidationError(
                "Number of votes must be at least 1.")

        # Validate contestant and nominee code relationship to poll
        if contestant and contestant.poll != poll:
            raise serializers.ValidationError(
                "Contestant does not belong to this poll.")

        if not contestant:
            raise serializers.ValidationError("Provide a valid contestant.")
        
        

        return data


class VoterCodeSerializer(serializers.ModelSerializer):
    poll = serializers.PrimaryKeyRelatedField(
        queryset=Poll.objects.all(), required=True)
    code = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = VoterCode
        fields = ['id', 'poll', 'code', 'used']
        read_only_fields = ['used']

    def validate(self, data):
        poll = data.get('poll')
        code = data.get('code')

        # Check if the code exists and is associated with the poll
        try:
            voter_code = VoterCode.objects.get(poll=poll, code=code)
        except VoterCode.DoesNotExist:
            raise serializers.ValidationError("Invalid voter code.")

        # Check if the code has already been used
        if voter_code.used:
            raise serializers.ValidationError(
                "This voter code has already been used.")

        # For creator-pay polls: validate expected voter limit
        if poll.poll_type == Poll.CREATOR_PAY:
            used_codes_count = VoterCode.objects.filter(
                poll=poll, used=True).count()
            if used_codes_count >= poll.expected_voters:
                raise serializers.ValidationError(
                    "The maximum number of votes has been reached for this poll.")

        return data

    def create(self, validated_data):
        poll = validated_data.get('poll')
        code = validated_data.get('code')

        # Mark the code as used
        voter_code = VoterCode.objects.get(poll=poll, code=code)
        voter_code.used = True
        voter_code.save()

        return voter_code
