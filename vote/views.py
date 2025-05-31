from .ussd_service import USSDService
from vote.models import Vote, VoterCode
import uuid
import requests
import logging

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum

from .serializers import VoteSerializer
from .models import VoterCode, Vote
from poll.models import Poll, Contestant
from payment.models import Transaction
from .ussd_service import USSDService
from .decorators import cache_poll_data, PaymentRateThrottle

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
        
        # Create a unique reference for the transaction
        reference = f"creator-vote-{poll.id}-{contestant.id}-{uuid.uuid4().hex[:8]}"
        
        # Create transaction first
        transaction = Transaction.objects.create(
            poll=poll,
            amount=0,  # Creator-pay polls don't have a direct payment
            payment_reference=reference,
            transaction_type='vote',
            success=True  # Mark as successful since no payment is needed
        )

        serializer = VoteSerializer(data={
            'poll': poll.id,
            'contestant': contestant.id,
            'number_of_votes': 1,
            'transaction': transaction.id  # Link the vote to the transaction
        })

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            vote = serializer.save()
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

        # Get the current site URL from the request
        protocol = 'https' if self.request.is_secure() else 'http'
        current_site = f"{protocol}://{self.request.get_host()}"
        
        data = {
            "email": "customer@castsure.com",
            "amount": int(amount * 100),
            "reference": reference,
            "callback_url": f"{current_site}/payment/verify/{reference}",
            "metadata": {
                "reference": reference,
                "type": "vote"
            }
        }

        response = requests.post(url, json=data, headers=headers)
        if response.status_code == 200:
            response_data = response.json()
            if response_data.get("status"):
                return response_data["data"]["authorization_url"]
        return None

    def get_contestant(self, poll, nominee_code, contestant_id):
        if nominee_code:
            return get_object_or_404(Contestant, nominee_code=nominee_code, poll=poll)
        elif contestant_id:
            return get_object_or_404(Contestant, id=contestant_id, poll=poll)
        raise ValueError(
            "Either nominee_code or contestant_id must be provided.")


logger = logging.getLogger(__name__)


class USSDVotingView(APIView):
    """
    Main USSD endpoint for handling voting sessions
    """

    def post(self, request):
        """
        Handle USSD requests from telecom providers
        Expected payload:
        {
            "sessionId": "string",
            "serviceCode": "*1398*123#", 
            "phoneNumber": "+233xxxxxxxxx",
            "text": "user_input"
        }
        """
        try:
            session_id = request.data.get('sessionId', '')
            service_code = request.data.get('serviceCode', '')
            phone_number = request.data.get('phoneNumber', '')
            text = request.data.get('text', '')

            if not phone_number:
                return Response({
                    "message": "END Phone number is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Extract poll ID from service code (*1398*POLL_ID#)
            poll_id = self.extract_poll_id(service_code)
            if not poll_id:
                return Response({
                    "message": "END Invalid service code"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Initialize USSD service
            ussd_service = USSDService(phone_number, text, poll_id)
            response_data = ussd_service.process()

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"USSD processing error: {str(e)}")
            return Response({
                "message": "END Service temporarily unavailable. Please try again."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def extract_poll_id(self, service_code):
        """Extract poll ID from USSD service code"""
        try:
            # Service code format: *1398*POLL_ID#
            parts = service_code.strip('*#').split('*')
            if len(parts) >= 2 and parts[0] == '1398':
                return int(parts[1])
        except (ValueError, IndexError):
            pass
        return None


class USSDVoteView(APIView):
    """
    Handle direct voting via USSD
    """

    def post(self, request):
        """
        Process vote submission
        Expected payload:
        {
            "phone_number": "+233xxxxxxxxx",
            "poll_id": 123,
            "contestant_id": 456,
            "votes_count": 1,
            "voter_code": "ABC123" // optional for polls requiring codes
        }
        """
        try:
            phone_number = request.data.get('phone_number')
            poll_id = request.data.get('poll_id')
            contestant_id = request.data.get('contestant_id')
            votes_count = request.data.get('votes_count', 1)
            voter_code = request.data.get('voter_code')

            # Validation
            if not all([phone_number, poll_id, contestant_id]):
                return Response({
                    "error": "Missing required fields"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get poll and contestant
            poll = get_object_or_404(Poll, id=poll_id, active=True)
            contestant = get_object_or_404(
                Contestant, id=contestant_id, poll=poll)

            # Check if poll is active
            now = timezone.now()
            if not (poll.start_time <= now <= poll.end_time):
                return Response({
                    "error": "Poll is not currently active"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate voter code if poll requires it
            if poll.poll_type == Poll.CREATOR_PAY and voter_code:
                voter_code_obj = VoterCode.objects.filter(
                    poll=poll, code=voter_code, used=False
                ).first()
                if not voter_code_obj:
                    return Response({
                        "error": "Invalid or already used voter code"
                    }, status=status.HTTP_400_BAD_REQUEST)

            # Check if voter has already voted (for polls with restrictions)
            if poll.one_vote_per_person:
                existing_vote = Vote.objects.filter(
                    poll=poll,
                    voter_phone=phone_number
                ).first()
                if existing_vote:
                    return Response({
                        "error": "You have already voted in this poll"
                    }, status=status.HTTP_400_BAD_REQUEST)

            # Handle payment for voter-pay polls
            if poll.poll_type == Poll.VOTER_PAY:
                payment_response = self.initiate_payment(
                    poll, contestant, phone_number, votes_count
                )
                return Response(payment_response, status=status.HTTP_200_OK)

            # Create vote for free polls or creator-pay polls
            vote = Vote.objects.create(
                poll=poll,
                contestant=contestant,
                voter_phone=phone_number,
                votes_count=votes_count
            )

            # Mark voter code as used if applicable
            if poll.poll_type == Poll.CREATOR_PAY and voter_code:
                voter_code_obj.used = True
                voter_code_obj.save()

            return Response({
                "message": "Vote recorded successfully",
                "vote_id": vote.id,
                "contestant": contestant.name,
                "votes_count": votes_count
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Vote processing error: {str(e)}")
            return Response({
                "error": "Failed to process vote"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def initiate_payment(self, poll, contestant, phone_number, votes_count):
        """Initiate payment for voter-pay polls"""
        try:
            amount = poll.voting_fee * votes_count
            reference = f"vote-{poll.id}-{contestant.id}-{uuid.uuid4().hex[:8]}"

            # Create Paystack payment
            headers = {
                "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
                "Content-Type": "application/json"
            }

            # Get the current site URL from the request
            protocol = 'https' if self.request.is_secure() else 'http'
            current_site = f"{protocol}://{self.request.get_host()}"

            data = {
                "email": f"ussd_{phone_number.replace('+', '')}@votelab.com",
                "amount": int(amount * 100),  # Convert to kobo
                "reference": reference,
                "callback_url": f"{current_site}/payment/verify/{reference}",
                "metadata": {
                    "poll_id": poll.id,
                    "contestant_id": contestant.id,
                    "phone_number": phone_number,
                    "votes_count": votes_count
                }
            }

            response = requests.post(
                "https://api.paystack.co/transaction/initialize",
                json=data,
                headers=headers
            )

            if response.status_code == 200 and response.json().get("status"):
                # Create pending transaction
                Transaction.objects.create(
                    poll=poll,
                    amount=amount,
                    payment_reference=reference,
                    transaction_type='vote',
                    success=False
                )

                payment_url = response.json()["data"]["authorization_url"]
                return {
                    "message": "Payment required",
                    "payment_url": payment_url,
                    "amount": amount,
                    "reference": reference
                }

            return {"error": "Failed to initiate payment"}

        except Exception as e:
            logger.error(f"Payment initiation error: {str(e)}")
            return {"error": "Payment service unavailable"}


class USSDPaymentCallbackView(APIView):
    """
    Handle payment callbacks from Paystack
    """

    def post(self, request):
        """
        Process payment verification and create vote
        """
        try:
            reference = request.data.get('reference')
            if not reference:
                return Response({
                    "error": "Reference is required"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Verify payment with Paystack
            headers = {
                "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            }

            response = requests.get(
                f"https://api.paystack.co/transaction/verify/{reference}",
                headers=headers
            )

            if response.status_code != 200:
                return Response({
                    "error": "Payment verification failed"
                }, status=status.HTTP_400_BAD_REQUEST)

            payment_data = response.json()
            if not payment_data.get("status") or payment_data["data"]["status"] != "success":
                return Response({
                    "error": "Payment was not successful"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get transaction
            transaction = get_object_or_404(
                Transaction,
                payment_reference=reference,
                success=False
            )

            # Extract metadata
            metadata = payment_data["data"]["metadata"]
            poll_id = metadata.get("poll_id")
            contestant_id = metadata.get("contestant_id")
            phone_number = metadata.get("phone_number")
            votes_count = metadata.get("votes_count", 1)

            # Get poll and contestant
            poll = get_object_or_404(Poll, id=poll_id)
            contestant = get_object_or_404(Contestant, id=contestant_id)

            # Create vote
            vote = Vote.objects.create(
                poll=poll,
                contestant=contestant,
                voter_phone=phone_number,
                votes_count=votes_count
            )

            # Update transaction
            transaction.success = True
            transaction.save()

            return Response({
                "message": "Vote recorded successfully",
                "vote_id": vote.id,
                "contestant": contestant.name,
                "votes_count": votes_count
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Payment callback error: {str(e)}")
            return Response({
                "error": "Failed to process payment callback"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class USSDStatusView(APIView):
    """
    Check USSD service status and poll information
    """

    def get(self, request, poll_id=None):
        """
        Get poll status and voting information
        """
        try:
            if poll_id:
                poll = get_object_or_404(Poll, id=poll_id)
                contestants = poll.contestants.all()

                # Get vote counts
                vote_data = []
                for contestant in contestants:
                    votes = Vote.objects.filter(
                        poll=poll,
                        contestant=contestant
                    ).aggregate(
                        total_votes=Sum('votes_count')
                    )['total_votes'] or 0

                    vote_data.append({
                        "contestant_id": contestant.id,
                        "name": contestant.name,
                        "category": contestant.category,
                        "votes": votes
                    })

                return Response({
                    "poll": {
                        "id": poll.id,
                        "title": poll.title,
                        "description": poll.description,
                        "active": poll.active,
                        "start_time": poll.start_time,
                        "end_time": poll.end_time,
                        "poll_type": poll.poll_type,
                        "voting_fee": poll.voting_fee
                    },
                    "contestants": vote_data,
                    "ussd_code": f"*1398*{poll.id}#"
                }, status=status.HTTP_200_OK)

            # Return all active polls
            active_polls = Poll.objects.filter(
                active=True,
                start_time__lte=timezone.now(),
                end_time__gt=timezone.now()
            )

            polls_data = []
            for poll in active_polls:
                polls_data.append({
                    "id": poll.id,
                    "title": poll.title,
                    "ussd_code": f"*1398*{poll.id}#",
                    "voting_fee": poll.voting_fee,
                    "poll_type": poll.poll_type
                })

            return Response({
                "active_polls": polls_data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Status check error: {str(e)}")
            return Response({
                "error": "Failed to get status"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
