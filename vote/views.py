from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.db import transaction
from .serializers import VoteSerializer
from poll.models import Poll, Contestant
from .models import Vote
from payment.models import Transaction
import logging

logger = logging.getLogger(__name__)


class VoteView(APIView):
    def post(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id)
        nominee_code = request.data.get("nominee_code")
        contestant_id = request.data.get("contestant_id")
        num_votes = int(request.data.get("number_of_votes", 1))
        # For creator-pay polls, voter code is required
        code = request.data.get("code")

        # Check if poll type is CREATOR_PAY or VOTERS_PAY and handle accordingly
        if poll.poll_type == Poll.CREATOR_PAY:
            return self.handle_creator_pay(request, poll, nominee_code, contestant_id, code)

        elif poll.poll_type == Poll.VOTERS_PAY:
            return self.handle_voter_pay(request, poll, nominee_code, contestant_id, num_votes)

        return Response({"error": "Invalid poll type."}, status=status.HTTP_400_BAD_REQUEST)

    def handle_creator_pay(self, request, poll, nominee_code, contestant_id, code):
        """
        Handle the creator-pay poll type logic.
        Since voting is free in creator-pay polls, skip payment verification.
        """
        if not code:
            return Response(
                {"error": "Voter code is required for creator-pay polls."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Fetch the contestant
        contestant = self.get_contestant(poll, nominee_code, contestant_id)

        # Validate the voter code and poll status using the serializer
        serializer = VoteSerializer(data={
            'poll': poll.id,
            'contestant': contestant.id,
            'number_of_votes': 1,  # Default to 1 vote
            'code': code
        })

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Create and save the vote
        with transaction.atomic():
            vote = serializer.save()
            # Mark the code as used once the vote is recorded
            Vote.objects.filter(poll=poll, code=code).update(used=True)

        return Response({"message": "Vote cast successfully."}, status=status.HTTP_201_CREATED)

    def handle_voter_pay(self, request, poll, nominee_code, contestant_id, num_votes):
        """
        Handle the voter-pay poll type logic.
        Ensure payment verification before casting the vote.
        """
        # Fetch the contestant
        contestant = self.get_contestant(poll, nominee_code, contestant_id)

        # Validate the poll status using the serializer
        serializer = VoteSerializer(data={
            'poll': poll.id,
            'contestant': contestant.id,
            'number_of_votes': num_votes
        })

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Verify the payment before recording the vote
        if not self.is_payment_verified(poll, contestant, num_votes):
            return Response(
                {"error": "Payment for voting has not been completed. Please complete the payment."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create and save the vote
        with transaction.atomic():
            vote = serializer.save()

        return Response({"message": "Vote cast successfully."}, status=status.HTTP_201_CREATED)

    def get_contestant(self, poll, nominee_code, contestant_id):
        """
        Helper function to fetch contestant using nominee_code or contestant_id.
        """
        if nominee_code:
            return get_object_or_404(Contestant, nominee_code=nominee_code, poll=poll)
        elif contestant_id:
            return get_object_or_404(Contestant, id=contestant_id, poll=poll)
        else:
            raise ValueError(
                "Either nominee_code or contestant_id must be provided.")

    def is_payment_verified(self, poll, contestant, num_votes=1):
        """
        Verify if the payment for the vote has been successfully made.
        For voter-pay polls, ensure payment is verified before recording vote.
        """
        payment_reference = f"vote-{poll.id}-{contestant.id}"
        payment = Transaction.objects.filter(
            payment_reference=payment_reference, success=True).first()

        # Ensure that the payment is successful before proceeding
        if not payment:
            return False
        return True
