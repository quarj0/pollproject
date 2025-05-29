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
            "email": "customer@castsure.com",
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
            return Response(
                {"message": "Phone number is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Handle rate limiting
        cache_key = f"ussd_request_{phone_number}"
        request_count = cache.get(cache_key, 0)

        if request_count >= 60:
            return Response(
                {"message": "Too many requests. Please try again later."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        cache.set(cache_key, request_count + 1, 60)

        try:
            service = USSDService(phone_number, text)
            result = service.process()
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"USSD processing error: {str(e)}")
            return Response(
                {"message": "An error occurred processing your request."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VoteResultView(APIView):
    @cache_poll_data(timeout=300)  # Cache for 5 minutes
    def get(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id)
        results = Contestant.objects.filter(poll=poll).annotate(
            vote_count=Sum('votes__number_of_votes')
        ).values(
            'id', 'name', 'vote_count', 'category'
        ).order_by('-vote_count')

        # Get all contestants with their images
        contestants = Contestant.objects.filter(poll=poll)
        image_map = {
            c.id: str(c.contestant_image.url) if c.contestant_image else None
            for c in contestants
        }

        # Group results by category
        categorized_results = {}
        for result in results:
            category = result['category']
            if category not in categorized_results:
                categorized_results[category] = []

            result_with_image = {
                'name': result['name'],
                'vote_count': result['vote_count'] or 0,
                'category': result['category'],
                'image': image_map.get(result['id'])
            }
            categorized_results[category].append(result_with_image)

        return Response({
            'poll_title': poll.title,
            'total_votes': sum(r['vote_count'] or 0 for r in results),
            'categories': categorized_results
        })


class VoteResultsView(APIView):
    def get(self, request, poll_id):
        try:
            poll = get_object_or_404(Poll, id=poll_id)
            # Get contestant info first
            contestants = Contestant.objects.filter(
                poll=poll).values('id', 'name')
            contestant_dict = {c['id']: c['name'] for c in contestants}

            # Get vote counts
            votes = Vote.objects.filter(poll=poll).values(
                'contestant_id'
            ).annotate(
                total_votes=Sum('number_of_votes')
            )

            # Format results
            results = [
                {
                    'name': contestant_dict.get(vote['contestant_id'], 'Unknown'),
                    'total_votes': vote['total_votes'] or 0
                }
                for vote in votes
            ]

            return Response({
                "results": results
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error getting vote results: {str(e)}")
            return Response(
                {"error": "Failed to fetch results"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
