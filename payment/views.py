import logging
import requests
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from poll.models import Poll
from .models import Transaction

logger = logging.getLogger(__name__)


def get_transaction_type(poll):
    return 'poll_activation' if poll.poll_type == Poll.CREATOR_PAY else 'vote'


class VerifyPaymentView(APIView):
    """
    Verify payment with Paystack and activate poll if successful.
    """

    def get(self, request, reference):
        url = f"https://api.paystack.co/transaction/verify/{reference}"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"
        }

        # Fetch the transaction with the computed transaction type
        transaction = Transaction.objects.filter(
            payment_reference=reference
        ).first()

        # Check if the transaction was already successfully processed
        if transaction and transaction.success:
            return Response({"message": "Transaction already verified."}, status=status.HTTP_200_OK)

        try:
            response = requests.get(url, headers=headers)
            response_data = response.json()

            if not transaction:
                poll_id = reference.split("-")[1]
                poll = get_object_or_404(Poll, id=poll_id)
                transaction_type = get_transaction_type(poll)

                transaction = Transaction.objects.create(
                    payment_reference=reference,
                    transaction_type=transaction_type,
                    amount=response_data['data']['amount'] / 100,
                    success=False,
                    poll_id=poll_id,
                    user_id=request.user.id
                )

            if response_data['status'] and response_data['data']['status'] == 'success':
                transaction.success = True
                transaction.save()

                if transaction.transaction_type == 'poll_activation':
                    poll = get_object_or_404(Poll, id=transaction.poll_id)
                    poll.active = True
                    poll.save()

                if transaction.transaction_type == 'vote':
                    return Response({"message": "Payment verified and vote recorded."}, status=status.HTTP_200_OK)
                
                return Response({"message": "Payment verified and poll activated."}, status=status.HTTP_200_OK)
            else:
                logger.error(f"Paystack verification failed: {response_data}")
                return Response({"error": "Payment verification failed"}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Exception during Paystack verification: {e}")
            return Response({"error": "An error occurred during verification"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PaymentHistoryView(APIView):
    """
    Get payment history for a user.
    """

    def get(self, request):
        transactions = Transaction.objects.filter(user_id=request.user.id)
        data = [{"amount": transaction.amount, "success": transaction.success,
                 "poll_id": transaction.poll_id} for transaction in transactions]

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
            reference = f"poll-{poll_id}-{transaction_type}"
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


