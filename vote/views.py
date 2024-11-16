import uuid
import requests
import logging

from django.http import JsonResponse
from django.http import Http404
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

from vote import serializers

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


class USSDVotingView(APIView):
    def post(self, request, poll_id=None):
        phone_number = request.data.get("phone_number")
        text = request.data.get("user_input", "").strip()
        user_inputs = text.split("*")  # Separate inputs by *
        
        if not serializers.is_valid():
            return Response(serializers.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Step 1: Handle no poll_id provided
            if poll_id is None:
                polls = Poll.objects.filter(
                    active=True)  # Only active polls
                if not polls:
                    return JsonResponse({"message": "END No polls available at the moment."}, status=400)

                if len(user_inputs) == 1:  # List available polls
                    message = "Available Polls:\n"
                    options = "\n".join(
                        [f"{i+1}. {poll.title}" for i,
                            poll in enumerate(polls)]
                    )
                    return JsonResponse({"message": f"CON {message}{options}"})
                else:  # User selects a poll
                    try:
                        selected_poll = int(user_inputs[1]) - 1
                        poll = polls[selected_poll]
                        poll_id = poll.id  # Update poll_id for subsequent steps
                    except (IndexError, ValueError):
                        return JsonResponse({"message": "END Invalid selection. Please try again."}, status=400)

            # Step 2: Retrieve poll and proceed
            poll = get_object_or_404(Poll, id=poll_id)

            # Welcome Stage: Display categories
            if len(user_inputs) == 1:
                if not poll.active or poll.end_time < timezone.now():
                    return JsonResponse({"message": "END This poll is inactive or has ended."}, status=400)

                message = f"Welcome to {poll.title}! Select a category:"
                categories = Contestant.objects.filter(
                    poll=poll).values_list('category', flat=True).distinct()
                if not categories:
                    return JsonResponse({"message": "END No categories available for this poll."}, status=400)

                options = "\n".join(
                    [f"{i+1}. {category}" for i,
                        category in enumerate(categories)]
                )
                return JsonResponse({"message": f"CON {message}\n{options}"})

            # Select Category: Display contestants
            elif len(user_inputs) == 2:
                try:
                    category_index = int(user_inputs[1]) - 1
                    categories = Contestant.objects.filter(
                        poll=poll).values_list('category', flat=True).distinct()
                    category = categories[category_index]
                except (IndexError, ValueError):
                    return JsonResponse({"message": "END Invalid category selection. Try again."}, status=400)

                contestants = Contestant.objects.filter(
                    poll=poll, category=category)
                if not contestants:
                    return JsonResponse({"message": f"END No contestants in the category '{category}'."}, status=400)

                message = f"Category: {category}. Select a contestant:"
                options = "\n".join(
                    [f"{i+1}. {contestant.name}" for i,
                        contestant in enumerate(contestants)]
                )
                return JsonResponse({"message": f"CON {message}\n{options}"})

            # Select Contestant: Process votes or voter code
            elif len(user_inputs) == 3:
                try:
                    category_index = int(user_inputs[1]) - 1
                    categories = Contestant.objects.filter(
                        poll=poll).values_list('category', flat=True).distinct()
                    category = categories[category_index]

                    contestant_index = int(user_inputs[2]) - 1
                    contestants = Contestant.objects.filter(
                        poll=poll, category=category)
                    contestant = contestants[contestant_index]
                except (IndexError, ValueError):
                    return JsonResponse({"message": "END Invalid contestant selection. Try again."}, status=400)

                if poll.poll_type == 'voter-pay':
                    return JsonResponse({"message": f"CON You selected {contestant.name}. Enter the number of votes:"})
                elif poll.poll_type == 'creator-pay':
                    return JsonResponse({"message": f"CON You selected {contestant.name}. Enter your voter code:"})

            # Enter Votes or Voter Code
            elif len(user_inputs) == 4:
                if poll.poll_type == 'voter-pay':
                    try:
                        votes_count = int(user_inputs[3])
                    except ValueError:
                        return JsonResponse({"message": "END Invalid number of votes. Try again."}, status=400)

                    # Process payment
                    url = "https://api.paystack.co/transaction/initialize"
                    headers = {
                        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
                        "Content-Type": "application/json"
                    }
                    amount = poll.voting_fee * votes_count
                    data = {
                        # Generate pseudo-email from phone
                        "email": f"{phone_number}@example.com",
                        "amount": int(amount * 100),
                        "reference": f"vote-{poll.id}-{uuid.uuid4().hex[:8]}"
                    }

                    response = requests.post(url, json=data, headers=headers)
                    if response.status_code == 200 and response.json().get("status") == "success":
                        payment_url = response.json(
                        )["data"]["authorization_url"]
                        return JsonResponse({
                            "message": "END Payment initiated. Follow the link sent to complete your vote.",
                            "payment_url": payment_url
                        })
                    else:
                        return JsonResponse({"message": "END Failed to initiate payment. Try again later."}, status=500)

                elif poll.poll_type == 'creator-pay':
                    voter_code = user_inputs[3]
                    # Validate voter code
                    valid_voter_code = VoterCode.objects.filter(
                        code=voter_code, used=False).first()

                    if not valid_voter_code:
                        return JsonResponse({"message": "END Invalid or already used voter code. Try again."}, status=400)

                    # Mark voter code as used and record the vote
                    valid_voter_code.used = True
                    valid_voter_code.save()

                    category_index = int(user_inputs[1]) - 1
                    categories = Contestant.objects.filter(
                        poll=poll).values_list('category', flat=True).distinct()
                    category = categories[category_index]

                    contestant_index = int(user_inputs[2]) - 1
                    contestants = Contestant.objects.filter(
                        poll=poll, category=category)
                    contestant = contestants[contestant_index]

                    Vote.objects.create(
                        poll=poll,
                        contestant=contestant,
                        voter_code=voter_code
                    )
                    return JsonResponse({"message": "END Vote successfully cast! Thank you for participating."})

            # Fallback for invalid inputs
            return JsonResponse({"message": "END Invalid input. Please try again."}, status=400)

        except Exception as e:
            # Handle unexpected errors gracefully
            return JsonResponse({"message": f"END An error occurred: {str(e)}"}, status=500)


class VoteResultView(APIView):
    def get(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id)
        results = Contestant.objects.filter(poll=poll).annotate(
            vote_count=Sum('votes__number_of_votes')
        ).values(
            'name', 'vote_count'
        )
        return Response(results, status=status.HTTP_200_OK)
