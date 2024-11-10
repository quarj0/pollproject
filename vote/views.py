from django.conf import settings
from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
import requests
from rest_framework import status

from poll.models import Poll, Contestant
from payment.models import Transaction
from .models import Vote
from .serializers import VoteSerializer


class VoteView(APIView):
    def post(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id)
        nominee_code = request.data.get("nominee_code")
        contestant_id = request.data.get("contestant_id")
        num_votes = int(request.data.get("number_of_votes", 1))

        # Identify contestant based on poll type and input data
        if poll.poll_type == Poll.CREATOR_PAY:
            if not nominee_code and not contestant_id:
                return Response(
                    {"error": "Provide either nominee_code or contestant_id for creator-pay polls."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Fetch contestant using nominee_code or contestant_id
            if nominee_code:
                contestant = get_object_or_404(
                    Contestant, nominee_code=nominee_code, poll=poll)
            else:
                contestant = get_object_or_404(
                    Contestant, id=contestant_id, poll=poll)

            # Check if the user has already voted for this contestant
            existing_vote = Vote.objects.filter(
                poll=poll, contestant=contestant).first()
            if existing_vote:
                return Response(
                    {"error": "You can only vote once per contestant in each category."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Prepare data for serializer and validate
            serializer = VoteSerializer(data={
                'poll': poll.id,
                'contestant': contestant.id,
                'number_of_votes': 1
            })
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Register a single vote
            serializer.save()
            return Response({"message": "Vote cast successfully."}, status=status.HTTP_201_CREATED)

        elif poll.poll_type == Poll.VOTERS_PAY:
            # Ensure correct inputs: nominee_code for USSD, contestant_id for web
            if nominee_code:
                contestant = get_object_or_404(
                    Contestant, nominee_code=nominee_code, poll=poll)
            elif contestant_id:
                contestant = get_object_or_404(
                    Contestant, id=contestant_id, poll=poll)
            else:
                return Response(
                    {"error": "For voter-pay polls, provide nominee_code for USSD or contestant_id for web."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Prepare data for serializer and validate
            serializer = VoteSerializer(data={
                'poll': poll.id,
                'contestant': contestant.id,
                'number_of_votes': num_votes
            })
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Calculate payment amount
            amount_due = num_votes * poll.voting_fee
            vote_reference = f"vote-{poll.id}-{contestant.id}"

            # Create payment transaction
            with transaction.atomic():
                transaction = Transaction.objects.create(
                    poll=poll,
                    amount=amount_due,
                    transaction_type='vote',
                    payment_reference=vote_reference,
                    success=False
                )

                headers = {
                    "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
                    "Content-Type": "application/json",
                }
                payment_data = {
                    "email": request.data.get("email", "test@example.com"),
                    "amount": amount_due * 100,  # Paystack expects amount in kobo
                    "reference": vote_reference,
                }

                try:
                    # Initialize payment with Paystack
                    response = requests.post(
                        "https://api.paystack.co/transaction/initialize",
                        json=payment_data,
                        headers=headers,
                    )
                    response_data = response.json()

                    if response.status_code == 200 and response_data.get("status"):
                        transaction.payment_url = response_data["data"]["authorization_url"]
                        transaction.save()
                        return Response(
                            {
                                "message": "Payment initialized",
                                "payment_url": response_data["data"]["authorization_url"]
                            },
                            status=status.HTTP_201_CREATED
                        )
                    else:
                        transaction.delete()  # Clean up failed transactions
                        return Response(
                            {"error": "Payment initialization failed"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except requests.RequestException:
                    return Response(
                        {"error": "Payment gateway connection failed"},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

        return Response({"error": "Invalid poll type."}, status=status.HTTP_400_BAD_REQUEST)
