from .ussd_service import USSDService
from vote.models import Vote, VoterCode
import uuid
import logging

from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.utils import timezone
from django.db.models import Sum
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import models

from .models import VoterCode, Vote
from poll.models import Poll, Contestant
from payment.models import Transaction
from .ussd_service import USSDService
from .decorators import cache_poll_data

logger = logging.getLogger(__name__)


class VoterPayVoteView(APIView):
    def post(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id, poll_type=Poll.VOTERS_PAY)
        nominee_code = request.data.get("nominee_code")
        contestant_id = request.data.get("contestant_id")
        num_votes = int(request.data.get("number_of_votes", 1))

        if not nominee_code and not contestant_id:
            return Response({"error": "Either nominee_code or contestant_id must be provided."},
                            status=status.HTTP_400_BAD_REQUEST)

        contestant = self.get_contestant(poll, nominee_code, contestant_id)
        
        # DON'T CREATE VOTE YET - only create payment reference and transaction
        
        # Calculate payment details
        vote_price = poll.voting_fee
        amount_to_pay = vote_price * num_votes
        unique_reference = f"vote-{poll.id}-{contestant.id}-{uuid.uuid4().hex[:8]}"

        # Create pending transaction with metadata for vote creation
        Transaction.objects.create(
            poll=poll,
            amount=amount_to_pay,
            payment_reference=unique_reference,
            transaction_type='vote',
            success=False,
            
        )

        return Response({
            "message": "Payment initialized. Vote will be recorded after successful payment.",
            "payment_pending": True,  # Indicate this is pending payment
            "amount": int(amount_to_pay * 100),  
            "email": getattr(request.user, "email", "customer@castsure.com"), 
            "reference": unique_reference
        }, status=status.HTTP_201_CREATED)

    def get_contestant(self, poll, nominee_code, contestant_id):
        if nominee_code:
            return get_object_or_404(Contestant, nominee_code=nominee_code, poll=poll)
        elif contestant_id:
            return get_object_or_404(Contestant, id=contestant_id, poll=poll)
        raise ValueError("Either nominee_code or contestant_id must be provided.")

    def get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class CreatorPayVoteView(APIView):
    def post(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id, poll_type=Poll.CREATOR_PAY)
        code = request.data.get("code")
        nominee_code = request.data.get("nominee_code")
        contestant_id = request.data.get("contestant_id")

        if not code:
            return Response({"error": "Voter code is required for creator-pay polls."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Validate voter code FIRST
        voter_code = self.validate_voter_code(poll, code)
        if isinstance(voter_code, Response):
            return voter_code

        contestant = self.get_contestant(poll, nominee_code, contestant_id)
        
        # Only create vote if voter code is valid
        vote = Vote.objects.create(
            poll=poll,
            contestant=contestant,
            number_of_votes=1,
        )

        # Mark voter code as used
        voter_code.used = True
        voter_code.save()

        # Trigger real-time update - vote is confirmed immediately for creator-pay
        self.trigger_realtime_update(poll_id, vote)
        
        return Response({
            "message": "Vote recorded successfully",
            "vote_id": vote.id,
            "vote_confirmed": True  # Indicate vote is immediately confirmed
        }, status=status.HTTP_201_CREATED)

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
        raise ValueError("Either nominee_code or contestant_id must be provided.")

    def get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def trigger_realtime_update(self, poll_id, vote):
        """Manually trigger real-time update for WebSocket clients."""
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'poll_{poll_id}',
            {
                'type': 'vote_update',
                'poll_id': poll_id,
                'vote_id': vote.id,
                'contestant_id': vote.contestant.id,
                'number_of_votes': vote.number_of_votes,
                'timestamp': timezone.now().isoformat()
            }
        )



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


class VoteResultView(APIView):
    @cache_poll_data(timeout=300)  # Cache for 5 minutes
    def get(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id)
        
        # Get all categories in the poll
        categories = Contestant.objects.filter(poll=poll).values_list('category', flat=True).distinct()
        
        categorized_results = {}
        total_votes = 0
        
        # Process results by category - only count votes with successful transactions for voter-pay polls
        for category in categories:
            if poll.poll_type == Poll.VOTERS_PAY:
                # Only count votes with successful transactions
                category_results = Contestant.objects.filter(
                    poll=poll,
                    category=category
                ).annotate(
                    vote_count=Sum('votes__number_of_votes', 
                                 filter=models.Q(votes__transaction__success=True))
                ).values(
                    'id', 'name', 'vote_count', 'category', 'contestant_image'
                ).order_by('-vote_count')
            else:
                # For creator-pay polls, count all votes (they're only created after validation)
                category_results = Contestant.objects.filter(
                    poll=poll,
                    category=category
                ).annotate(
                    vote_count=Sum('votes__number_of_votes')
                ).values(
                    'id', 'name', 'vote_count', 'category', 'contestant_image'
                ).order_by('-vote_count')
            
            # Format results for this category
            formatted_results = []
            for result in category_results:
                vote_count = result['vote_count'] or 0
                total_votes += vote_count
                
                formatted_results.append({
                    'name': result['name'],
                    'vote_count': vote_count,
                    'category': result['category'],
                    'image': str(result['contestant_image'].url) if result['contestant_image'] else None,
                    'percentage': 0  # Will be calculated after we have category total
                })
            
            # Calculate percentages within category
            category_total = sum(r['vote_count'] for r in formatted_results)
            if category_total > 0:
                for result in formatted_results:
                    result['percentage'] = round((result['vote_count'] / category_total) * 100, 1)
            
            categorized_results[category] = {
                'contestants': formatted_results,
                'total_votes': category_total
            }

        return Response({
            'poll_title': poll.title,
            'total_votes': total_votes,
            'categories': categorized_results,
            'category_list': list(categories)  # Include list of categories for easy iteration
        })


class VoteResultsView(APIView):
    def get(self, request, poll_id):
        try:
            poll = get_object_or_404(Poll, id=poll_id)
            # Get contestant info first
            contestants = Contestant.objects.filter(
                poll=poll).values('id', 'name')
            contestant_dict = {c['id']: c['name'] for c in contestants}

            # Get vote counts - only successful transactions for voter-pay polls
            if poll.poll_type == Poll.VOTERS_PAY:
                votes = Vote.objects.filter(
                    poll=poll, 
                    transaction__success=True
                ).values(
                    'contestant_id'
                ).annotate(
                    total_votes=Sum('number_of_votes')
                )
            else:
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