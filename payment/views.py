from decimal import Decimal
import logging
import requests
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from poll.models import Contestant, Poll
from .models import Transaction
from vote.serializers import VoteSerializer

logger = logging.getLogger(__name__)


def get_transaction_type(poll):
    return 'poll_activation' if poll.poll_type == Poll.CREATOR_PAY else 'vote'


class VerifyPaymentView(APIView):
    """
    Verify payment with Paystack and activate poll or record votes if successful.
    """

    def get(self, request, reference):
        # Prepare the Paystack verification request
        url = f"https://api.paystack.co/transaction/verify/{reference}"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"
        }

        # Attempt to fetch any existing transaction
        transaction = Transaction.objects.filter(
            payment_reference=reference
        ).first()

        # Check if the transaction was already successfully processed
        if transaction and transaction.success:
            return Response({"message": "Transaction already verified."}, status=status.HTTP_200_OK)

        try:
            # Send verification request to Paystack
            response = requests.get(url, headers=headers)
            response_data = response.json()

            # Ensure response is successful
            if not response_data['status']:
                logger.error(f"Paystack verification failed: {response_data}")
                return Response({"error": "Payment verification failed"}, status=status.HTTP_400_BAD_REQUEST)

            
            amount_paid = response_data['data']['amount'] / 100
            reference_parts = reference.split("-")
            poll_id = reference_parts[1]

            # Check if this is a poll activation or vote payment
            if "activation" in reference:
                poll = get_object_or_404(Poll, id=poll_id)
                transaction_type = get_transaction_type(poll)

                # Create or update the transaction
                if not transaction:
                    transaction = Transaction.objects.create(
                        payment_reference=reference,
                        transaction_type=transaction_type,
                        amount=amount_paid,
                        success=False,
                        poll=poll,
                        user=request.user
                    )
                else:
                    transaction.success = True
                    transaction.save()

                # Activate poll if payment was successful
                poll.active = True
                poll.save()
                return Response({"message": "Payment verified and poll activated."}, status=status.HTTP_200_OK)

            elif "vote" in reference:
                contestant_id = reference_parts[2]
                poll = get_object_or_404(Poll, id=poll_id)
                contestant = get_object_or_404(Contestant, id=contestant_id, poll=poll)
                transaction_type = get_transaction_type(poll)

                # Determine number of votes based on the amount paid
                vote_count = Decimal(amount_paid) // poll.voting_fee

                # Create or update the transaction
                if not transaction:
                    transaction = Transaction.objects.create(
                        payment_reference=reference,
                        transaction_type=transaction_type,
                        amount=amount_paid,
                        success=True,
                        poll=poll
                    )
                else:
                    transaction.success = True
                    transaction.save()

                # Record the vote using VoterSerializer
                vote_data = {
                    'poll': poll.id,
                    'contestant': contestant.id,
                    'number_of_votes': vote_count,
                }
                voter_serializer = VoteSerializer(data=vote_data)

                if voter_serializer.is_valid():
                    voter_serializer.save()
                    return Response({"message": "Vote recorded."}, status=status.HTTP_201_CREATED)
                else:
                    return Response(voter_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


            return Response({"message": "Payment verified for voting."}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Exception during Paystack verification: {e}")
            return Response({"error": "An error occurred during verification"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PaymentHistoryView(APIView):
    """
    Get payment history both successful and pending transactions.
    """

    def get(self, request):
        transactions = Transaction.objects.filter(user_id=request.user.id)
        data = []

        for transaction in transactions:
            data.append({
                "transaction_type": transaction.transaction_type,
                "poll_id": transaction.poll_id,
                "amount": transaction.amount,
                "success": transaction.success,
                "created_at": transaction.created_at
            })

        return Response(data, status=status.HTTP_200_OK)


class PaymentLinkView(APIView):
    """
    Get payment link for a poll.
    """

    def get(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id)
        transaction_type = get_transaction_type(poll)
        amount = poll.setup_fee if poll.poll_type == Poll.CREATOR_PAY else poll.voting_fee

        # Check if a successful payment transaction already exists
        existing_transaction = Transaction.objects.filter(
            user_id=request.user.id, poll_id=poll_id, transaction_type=transaction_type, success=True
        ).first()

        if existing_transaction:
            return Response(
                {"message": "Payment has already been completed for this poll."},
                status=status.HTTP_200_OK
            )

        # Check for any existing pending transaction
        pending_transaction = Transaction.objects.filter(
            user_id=request.user.id, poll_id=poll_id, transaction_type=transaction_type, success=False
        ).first()

        if pending_transaction:
            reference = pending_transaction.payment_reference
        else:
            # Create a unique reference for a new transaction
            reference = f"poll-{poll_id}-activation" if poll.poll_type == Poll.CREATOR_PAY else f"vote-{poll_id}"
            pending_transaction = Transaction.objects.create(
                user_id=request.user.id,
                poll_id=poll_id,
                transaction_type=transaction_type,
                amount=amount,
                payment_reference=reference,
                success=False
            )

        payment_data = {
            "email": request.user.email,
            "amount": int(amount * 100),
            "reference": reference,
        }

        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY.strip()}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(
                "https://api.paystack.co/transaction/initialize",
                json=payment_data,
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                response_data = response.json()
                if response_data.get("status"):
                    payment_url = response_data["data"]["authorization_url"]
                    pending_transaction.payment_url = payment_url
                    pending_transaction.save()
                    return Response({"payment_link": payment_url}, status=status.HTTP_200_OK)
                else:
                    logger.error(f"Paystack error: {
                                 response_data.get('message')}")
                    return Response({"error": "An error occurred during payment link generation."},
                                    status=status.HTTP_400_BAD_REQUEST)
            else:
                logger.error(f"Failed to connect to Paystack. Status Code: {
                             response.status_code}")
                return Response({"error": "Failed to connect to payment gateway."},
                                status=status.HTTP_400_BAD_REQUEST)

        except requests.RequestException as e:
            logger.error(f"Exception during Paystack initialization: {e}")
            return Response({"error": "An error occurred during payment link generation."},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
