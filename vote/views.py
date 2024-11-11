import requests
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.db import transaction
from .serializers import VoteSerializer
from poll.models import Poll, Contestant
from .models import Vote, VoterCode
from payment.models import Transaction
import logging

logger = logging.getLogger(__name__)


class VoteView(APIView):
    def post(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id)
        nominee_code = request.data.get("nominee_code")
        contestant_id = request.data.get("contestant_id")
        num_votes = int(request.data.get("number_of_votes", 1))
        code = request.data.get("code")

        # Handle based on poll type
        if poll.poll_type == Poll.CREATOR_PAY:
            return self.handle_creator_pay(poll, nominee_code, contestant_id, code)
        elif poll.poll_type == Poll.VOTERS_PAY:
            return self.handle_voter_pay(poll, nominee_code, contestant_id, num_votes)

        return Response({"error": "Invalid poll type."}, status=status.HTTP_400_BAD_REQUEST)

    def handle_creator_pay(self, poll, nominee_code, contestant_id, code):
        """
        Handle the creator-pay poll type logic.
        """
        if not code:
            return Response({"error": "Voter code is required for creator-pay polls."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Validate and retrieve voter code
        voter_code = self.validate_voter_code(poll, code)
        if isinstance(voter_code, Response):
            return voter_code

        # Fetch the contestant
        contestant = self.get_contestant(poll, nominee_code, contestant_id)

        # Validate vote data
        serializer = VoteSerializer(data={
            'poll': poll.id,
            'contestant': contestant.id,
            'number_of_votes': 1  # Default to 1 vote
        })

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Save vote and mark the code as used
        with transaction.atomic():
            serializer.save()
            voter_code.used = True
            voter_code.save()

        return Response({"message": "Vote cast successfully."}, status=status.HTTP_201_CREATED)

    def validate_voter_code(self, poll, code):
        """
        Validate if the voter code is valid and unused.
        """
        try:
            voter_code = VoterCode.objects.get(poll=poll, code=code)
        except VoterCode.DoesNotExist:
            return Response({"error": "Invalid voter code."}, status=status.HTTP_400_BAD_REQUEST)

        if voter_code.used:
            return Response({"error": "This voter code has already been used."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if expected voters limit is reached for creator-pay polls
        if poll.poll_type == Poll.CREATOR_PAY:
            if VoterCode.objects.filter(poll=poll, used=True).count() >= poll.expected_voters:
                return Response({"error": "The maximum number of votes has been reached for this poll."},
                                status=status.HTTP_400_BAD_REQUEST)

        return voter_code

    def handle_voter_pay(self, poll, nominee_code, contestant_id, num_votes):
        # Fetch contestant
        contestant = self.get_contestant(poll, nominee_code, contestant_id)

        # Validate vote data
        serializer = VoteSerializer(data={
            'poll': poll.id,
            'contestant': contestant.id,
            'number_of_votes': num_votes
        })

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Calculate amount and generate payment link
        vote_price = poll.voting_fee
        amount_to_pay = vote_price * num_votes
        payment_reference = f"vote-{poll.id}"
        payment_link = self.generate_payment_link(
            amount_to_pay, payment_reference)

        if not payment_link:
            return Response({"error": "Unable to generate payment link."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Create a transaction record
        Transaction.objects.create(
            poll=poll,
            amount=amount_to_pay,
            payment_reference=payment_reference,
            success=False
        )

        # Return the payment link
        return Response({"payment_url": payment_link}, status=status.HTTP_200_OK)

    def generate_payment_link(self, amount, reference):
        url = "https://api.paystack.co/transaction/initialize"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "amount": int(amount * 100),
            "reference": reference
        }

        response = requests.post(url, json=data, headers=headers)
        if response.status_code == 200:
            return response.json().get('data').get('authorization_url')
        return None

    def get_contestant(self, poll, nominee_code, contestant_id):
        if nominee_code:
            return get_object_or_404(Contestant, nominee_code=nominee_code, poll=poll)
        elif contestant_id:
            return get_object_or_404(Contestant, id=contestant_id, poll=poll)
        raise ValueError(
            "Either nominee_code or contestant_id must be provided.")


class VerifyPaymentCallback(APIView):
    def get(self, request):
        payment_reference = request.GET.get("reference")
        if not payment_reference:
            return Response({"error": "Payment reference missing."}, status=status.HTTP_400_BAD_REQUEST)

        url = f"https://api.paystack.co/transaction/verify/{payment_reference}"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"
        }
        response = requests.get(url, headers=headers)

        if response.status_code == 200 and response.json().get('data').get('status') == "success":
            Transaction.objects.filter(
                payment_reference=payment_reference).update(success=True)

            # Check if transaction is for voting
            if "vote" in payment_reference:
                poll_id, contestant_id = payment_reference.split("-")[1:]
                poll = get_object_or_404(Poll, id=poll_id)
                contestant = get_object_or_404(
                    Contestant, id=contestant_id, poll=poll)

                # Create vote after payment is verified
                Vote.objects.create(
                    poll=poll,
                    contestant=contestant,
                    number_of_votes=Transaction.objects.get(
                        payment_reference=payment_reference).amount // poll.voting_fee
                )
                return Response({"message": "Vote recorded after successful payment."}, status=status.HTTP_201_CREATED)

            return Response({"message": "Payment verified successfully."}, status=status.HTTP_200_OK)

        return Response({"error": "Payment verification failed."}, status=status.HTTP_400_BAD_REQUEST)
