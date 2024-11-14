from decimal import Decimal
import uuid
import requests
import logging

from django.http import JsonResponse
from django.db.models import Count
from django.views import View
from django.http import Http404
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.db import transaction

from .serializers import VoteSerializer
from .models import VoterCode, Vote
from poll.models import Poll, Contestant
from payment.models import Transaction

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
        # Validate contestant and nominee code
        if not nominee_code and not contestant_id:
            return Response({"error": "Either nominee_code or contestant_id must be provided."}, status=status.HTTP_400_BAD_REQUEST)

        # Fetch contestant with error handling
        try:
            contestant = self.get_contestant(poll, nominee_code, contestant_id)
        except Http404:
            return Response({"error": "Contestant not found with provided nominee code or contestant ID."}, status=status.HTTP_404_NOT_FOUND)

        # Validate vote data with serializer
        serializer = VoteSerializer(data={
            'poll': poll.id,
            'contestant': contestant.id,
            'number_of_votes': num_votes,
        })

        # Check serializer validity
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Calculate amount and generate unique payment reference
        vote_price = poll.voting_fee
        amount_to_pay = vote_price * num_votes
        unique_reference = f"vote-{poll.id}-{
            contestant.id}-{uuid.uuid4().hex[:8]}"

        # Attempt to generate payment link
        payment_link = self.generate_payment_link(
            amount_to_pay, unique_reference)
        
        transaction_type = self.get_transaction_type(poll)

        # Verify that the payment link was created
        if not payment_link:
            return Response({"error": "Unable to generate payment link."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Record the transaction as pending
        Transaction.objects.create(
            poll=poll,
            amount=amount_to_pay,
            payment_reference=unique_reference,
            transaction_type=transaction_type,
            success=False
        )

        # Return the payment link for the user to proceed with payment
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
        print(response.json())

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

    def get_transaction_type(self, poll):
        return 'poll_activation' if poll.poll_type == Poll.CREATOR_PAY else 'vote'


class USSDVotingView(View):
    def post(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id)
        phone_number = request.POST.get("phone_number")
        session_stage = request.POST.get("session_stage")
        user_input = request.POST.get("user_input")

        if session_stage == "welcome":
            # Step 1: Display poll title and welcome message
            message = f"Welcome to {poll.title}! Please select a category to continue."
            
            categories = Contestant.objects.filter(poll=poll).values_list('category', flat=True).distinct()
            
            options = {str(i+1): category for i, category in enumerate(categories)}
            
            response_data = {"message": message,"options": options, "next_stage": "select_category"}
            return JsonResponse(response_data)

        elif session_stage == "select_category":
            # Step 2: Display contestants for the selected category
            categories = Contestant.objects.filter(poll=poll).values_list('category', flat=True).distinct()
           
            category = categories[int(user_input) - 1]
            
            contestants = Contestant.objects.filter(poll=poll, category=category)

            message = f"Category: {category}. Select a contestant:"
            options = {str(i+1): contestant.name for i, contestant in enumerate(contestants)}
            
            response_data = {"message": message, "options": options,"next_stage": "select_contestant", "selected_category": category}
            return JsonResponse(response_data)

        elif session_stage == "select_contestant":
            category = request.POST.get("selected_category")
            contestants = Contestant.objects.filter(poll=poll, category=category)
            contestant = contestants[int(user_input) - 1]

            if poll.poll_type == 'voter-pay':
                # For Voter-Pay Polls, ask for the number of votes
                message = f"You selected {contestant.name}. Enter the number of votes:"
                response_data = {
                    "message": message, "next_stage": "enter_votes", "contestant_id": contestant.id}
                return JsonResponse(response_data)

            elif poll.poll_type == 'creator-pay':
                # For Creator-Pay Polls, ask for voter code and validate it
                message = f"You selected {contestant.name}. Enter your voter code to proceed:"
                
                response_data = {
                    "message": message, "next_stage": "enter_voter_code", "contestant_id": contestant.id}
                return JsonResponse(response_data)

        elif session_stage == "enter_votes":
            # Step 4 (Voter-Pay Polls): Process payment
            votes_count = int(user_input)
            contestant_id = request.POST.get("contestant_id")
            contestant = get_object_or_404(Contestant, id=contestant_id)
            amount = Decimal(poll.voting_fee) * votes_count * \
                                100  # Convert to cents for Paystack

            # Initiate payment via Paystack
            headers = {"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}
            
            data = {"email": "customer@email.com", "amount": int(amount)}
            
            response = requests.post(
                "https://api.paystack.co/transaction/initialize", json=data, headers=headers)
            response_data = response.json()

            if response.status_code == 200 and response_data.get("status") == "success":
                return JsonResponse({"message": "Vote payment initiated. Complete payment to confirm your votes."})
            else:
                return JsonResponse({"error": "Failed to initiate payment."}, status=500)

        elif session_stage == "enter_voter_code":
            # Step 4 (Creator-Pay Polls): Validate voter code and register vote
            voter_code = user_input
            contestant_id = request.POST.get("contestant_id")
            contestant = get_object_or_404(Contestant, id=contestant_id)

            # Verify Voter Code
            if not VoterCode.objects.filter(code=voter_code, used=False).exists():
                return JsonResponse({"error": "Invalid or already used voter code."}, status=400)

            # Register the vote
            VoterCode.objects.filter(code=voter_code).update(used=True)
            Vote.objects.create(poll=poll, contestant=contestant)
            return JsonResponse({"message": "Vote successfully cast!"})



class VoteResultView(APIView):
    def get(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id)
        results = Contestant.objects.filter(poll=poll).annotate(vote_count=Count('votes')).values(
            'nominee_code', 'vote_count'
        )
        return Response(results, status=status.HTTP_200_OK)
