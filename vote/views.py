import uuid
import requests
import logging

from django.http import JsonResponse
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum
from django.core.cache import cache

from .serializers import VoteSerializer
from .models import VoterCode, Vote
from poll.models import Poll, Contestant
from payment.models import Transaction
from .ussd_service import USSDService
from .decorators import cache_poll_data, USSDRateThrottle, PaymentRateThrottle

logger = logging.getLogger(__name__)


class CreatorPayVoteView(APIView):
    def post(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id, poll_type=Poll.CREATOR_PAY)
        code = request.data.get("code")
        nominee_code = request.data.get("nominee_code")
        contestant_id = request.data.get("contestant_id")

        if not code:
            return Response({"error": "Voter code is required for creator-pay polls."},
                            status=status.HTTP_400_BAD_REQUEST)

        voter_code = self.validate_voter_code(poll, code)
        if isinstance(voter_code, Response):
            return voter_code

        contestant = self.get_contestant(poll, nominee_code, contestant_id)
        serializer = VoteSerializer(data={
            'poll': poll.id,
            'contestant': contestant.id,
            'number_of_votes': 1
        })

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            serializer.save()
            voter_code.used = True
            voter_code.save()

        return Response({"message": "Vote cast successfully."}, status=status.HTTP_201_CREATED)

    def validate_voter_code(self, poll, code):
        try:
            voter_code = VoterCode.objects.get(poll=poll, code=code)
        except VoterCode.DoesNotExist:
            return Response({"error": "Invalid voter code."}, status=status.HTTP_400_BAD_REQUEST)

        if voter_code.used:
            return Response({"error": "This voter code has already been used."}, status=status.HTTP_400_BAD_REQUEST)

        if VoterCode.objects.filter(poll=poll, used=True).count() >= poll.expected_voters:
            return Response({"error": "The maximum number of votes has been reached for this poll."},
                            status=status.HTTP_400_BAD_REQUEST)

        return voter_code

    def get_contestant(self, poll, nominee_code, contestant_id):
        if nominee_code:
            return get_object_or_404(Contestant, nominee_code=nominee_code, poll=poll)
        elif contestant_id:
            return get_object_or_404(Contestant, id=contestant_id, poll=poll)
        raise ValueError(
            "Either nominee_code or contestant_id must be provided.")


class VoterPayVoteView(APIView):
    throttle_classes = [PaymentRateThrottle]

    def post(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id, poll_type=Poll.VOTERS_PAY)
        nominee_code = request.data.get("nominee_code")
        contestant_id = request.data.get("contestant_id")
        num_votes = int(request.data.get("number_of_votes", 1))

        if not nominee_code and not contestant_id:
            return Response({"error": "Either nominee_code or contestant_id must be provided."},
                            status=status.HTTP_400_BAD_REQUEST)

        contestant = self.get_contestant(poll, nominee_code, contestant_id)
        serializer = VoteSerializer(data={
            'poll': poll.id,
            'contestant': contestant.id,
            'number_of_votes': num_votes,
        })

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        vote_price = poll.voting_fee
        amount_to_pay = vote_price * num_votes
        unique_reference = f"vote-{poll.id}-{contestant.id}-{uuid.uuid4().hex[:8]}"
        payment_link = self.generate_payment_link(
            amount_to_pay, unique_reference)

        if not payment_link:
            return Response({"error": "Unable to generate payment link."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        Transaction.objects.create(
            poll=poll,
            amount=amount_to_pay,
            payment_reference=unique_reference,
            transaction_type='vote',
            success=False
        )

        return Response({"payment_url": payment_link}, status=status.HTTP_200_OK)

    def generate_payment_link(self, amount, reference):
        url = "https://api.paystack.co/transaction/initialize"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "email": "customer@email.com",
            "amount": int(amount * 100),
            "reference": reference
        }

        response = requests.post(url, json=data, headers=headers)
        if response.status_code == 200:
            return response.json().get('data', {}).get('authorization_url')
        return None

    def get_contestant(self, poll, nominee_code, contestant_id):
        if nominee_code:
            return get_object_or_404(Contestant, nominee_code=nominee_code, poll=poll)
        elif contestant_id:
            return get_object_or_404(Contestant, id=contestant_id, poll=poll)
        raise ValueError(
            "Either nominee_code or contestant_id must be provided.")


class USSDVotingView(APIView):
    throttle_classes = [USSDRateThrottle]

    def post(self, request, poll_id=None):
        phone_number = request.data.get("phone_number")
        text = request.data.get("user_input", "").strip()

        if not phone_number:
            return JsonResponse({"message": "END Phone number is required."}, status=400)

        service = USSDService(phone_number, text)
        result = service.process()
        return JsonResponse(result, status=200)


class VoteResultView(APIView):
    @cache_poll_data(timeout=300)  # Cache for 5 minutes
    def get(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id)
        results = Contestant.objects.filter(poll=poll).annotate(
            vote_count=Sum('votes__number_of_votes')
        ).values(
            'name', 'image', 'vote_count', 'category'  # Added category for better grouping
        ).order_by('-vote_count')  # Sort by votes in descending order

        # Group results by category
        categorized_results = {}
        for result in results:
            category = result['category']
            if category not in categorized_results:
                categorized_results[category] = []
            categorized_results[category].append(result)

        return Response({
            'poll_title': poll.title,
            'total_votes': sum(r['vote_count'] or 0 for r in results),
            'categories': categorized_results
        })
