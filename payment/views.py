import uuid
from rest_framework.pagination import PageNumberPagination
import hmac
import hashlib
import json
from decimal import Decimal, InvalidOperation
import logging
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListAPIView

from .serializers import TransactionSerializer
from vote.serializers import VoteSerializer
from .models import Withdrawal, Transaction
from poll.models import Contestant, Poll


logger = logging.getLogger(__name__)


def get_transaction_type(poll):
    return 'poll_activation' if poll.poll_type == Poll.CREATOR_PAY else 'vote'


class VerifyPaymentView(APIView):
    """
    Verify payment with Paystack and activate poll or record votes if successful.
    """

    def get(self, request, reference):
        url = f"https://api.paystack.co/transaction/verify/{reference}"
        headers = {"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}

        try:
            # Fetch or create the transaction
            transaction = Transaction.objects.filter(
                payment_reference=reference).first()
            if transaction and transaction.success:
                return Response({"message": "Transaction already verified."}, status=status.HTTP_200_OK)

            # Verify with Paystack
            session = requests.Session()
            retries = Retry(total=3, backoff_factor=0.3,
                            status_forcelist=[500, 502, 503, 504])
            session.mount("https://", HTTPAdapter(max_retries=retries))
            response = session.get(url, headers=headers)
            response_data = response.json()

            if not response_data.get('status', False):
                logger.error(f"Paystack verification failed: {response_data}")
                return Response({"error": "Payment verification failed"}, status=status.HTTP_400_BAD_REQUEST)

            amount_paid = Decimal(
                response_data['data']['amount']) / Decimal(100)
            reference_parts = reference.split("-")
            if len(reference_parts) < 2:
                logger.error(f"Invalid reference format: {reference}")
                return Response({"error": "Invalid payment reference format"}, status=status.HTTP_400_BAD_REQUEST)

            poll_id = reference_parts[1]
            poll = get_object_or_404(Poll, id=poll_id)

            if "activate" in reference:
                self._process_poll_activation(
                    transaction, poll, amount_paid, reference)
                return Response({"message": "Payment verified and poll activated."}, status=status.HTTP_200_OK)

            elif "vote" in reference:
                if len(reference_parts) < 3:
                    logger.error(
                        f"Invalid voting reference format: {reference}")
                    return Response({"error": "Invalid voting reference format"}, status=status.HTTP_400_BAD_REQUEST)

                contestant_id = reference_parts[2]
                contestant = get_object_or_404(
                    Contestant, id=contestant_id, poll=poll)
                self._process_vote(transaction, poll,
                                   contestant, amount_paid, reference)
                return Response({"message": "Vote recorded."}, status=status.HTTP_201_CREATED)

            return Response({"message": "Payment verified."}, status=status.HTTP_200_OK)

        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP request error: {e}")
            return Response({"error": "Verification service unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            logger.error(f"Exception during verification: {e}")
            return Response({"error": "An error occurred during verification"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _process_poll_activation(self, transaction, poll, amount_paid, reference):
        transaction_type = get_transaction_type(poll)
        if not transaction:
            transaction = Transaction.objects.create(
                payment_reference=reference,
                transaction_type=transaction_type,
                amount=amount_paid,
                success=False,
                poll=poll,
            )
        transaction.success = True
        transaction.save()
        poll.active = True
        poll.save()

    def _process_vote(self, transaction, poll, contestant, amount_paid, reference):
        voting_fee = Decimal(poll.voting_fee)
        vote_count = amount_paid // voting_fee

        if vote_count < 1:
            raise ValueError("Insufficient amount for voting.")

        if not transaction:
            transaction = Transaction.objects.create(
                payment_reference=reference,
                transaction_type=get_transaction_type(poll),
                amount=amount_paid,
                success=True,
                poll=poll,
            )
        transaction.success = True
        transaction.save()

        vote_data = {'poll': poll.id, 'contestant': contestant.id,
                     'number_of_votes': vote_count}
        voter_serializer = VoteSerializer(data=vote_data)
        if voter_serializer.is_valid():
            voter_serializer.save()
        else:
            logger.error(f"VoteSerializer validation failed: {
                         voter_serializer.errors}")
            raise ValueError("Vote recording failed.")


class PaymentLinkView(APIView):
    """
    Get payment link for a poll.
    """

    def get(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id)
        transaction_type = get_transaction_type(poll)
        amount = Decimal(poll.setup_fee if poll.poll_type ==
                         Poll.CREATOR_PAY else poll.voting_fee)

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
            reference = f"activate-{poll_id}-{uuid.uuid4(
            ).hex[:5]}" if poll.poll_type == Poll.CREATOR_PAY else f"vote-{poll_id}"
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
            # Setup a session with retry
            session = requests.Session()
            session.mount("https://", HTTPAdapter(max_retries=Retry(total=3,
                          backoff_factor=0.3, status_forcelist=[500, 502, 503, 504])))

            response = session.post(
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
                    logger.error(
                        f"Paystack error: {response_data.get('message')}")
                    return Response({"error": "An error occurred during payment link generation."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                logger.error(
                    f"Failed to connect to Paystack. Status Code: {response.status_code}")
                return Response({"error": "Failed to connect to payment gateway."}, status=status.HTTP_400_BAD_REQUEST)

        except requests.RequestException as e:
            logger.error(f"Exception during Paystack initialization: {e}")
            return Response({"error": "An error occurred during payment link generation."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AccountBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            polls = Poll.objects.filter(
                creator=request.user,
                poll_type=Poll.VOTERS_PAY,
                active=True  # Only count active polls
            )

            total_amount_collected = Decimal('0.0')
            total_withdrawn = Decimal('0.0')

            # Calculate total amount collected
            for poll in polls:
                successful_votes = poll.votes.filter(payment_verified=True)
                vote_count = sum(
                    vote.number_of_votes for vote in successful_votes)
                total_amount_collected += Decimal(
                    str(poll.voting_fee)) * vote_count

            # Calculate total withdrawals
            withdrawals = Withdrawal.objects.filter(
                creator=request.user,
                status='successful'
            )
            total_withdrawn = sum(w.amount for w in withdrawals)

            # Calculate available balance (60% of total collected)
            available_balance = (total_amount_collected *
                                 Decimal('0.6')) - total_withdrawn

            data = {
                'available_balance': float(max(Decimal('0.0'), available_balance)),
                'total_withdrawn': float(total_withdrawn),
                'total_collected': float(total_amount_collected),
            }

            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(
                f"Error calculating balance for user {request.user.id}: {str(e)}")
            return Response(
                {"error": "Failed to calculate balance. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PaymentHistoryView(ListAPIView):
    """
    Get payment history, both successful and pending transactions.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = TransactionSerializer
    pagination_class = PageNumberPagination

    def get_queryset(self):
        return Transaction.objects.filter(user_id=self.request.user.id).order_by('-created_at')


class InitiateWithdrawalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id, creator=request.user)

        if poll.poll_type != "voters-pay":
            return Response(
                {"error": "Withdrawals are only allowed for voter-pay polls."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        requested_amount = request.data.get("amount")
        if not requested_amount:
            return Response(
                {"error": "Please specify the amount you want to withdraw."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            requested_amount = Decimal(requested_amount)
        except InvalidOperation:
            return Response(
                {"error": "Invalid amount specified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        vote_count = sum(vote.number_of_votes for vote in poll.votes.all())
        total_amount_collected = Decimal(poll.voting_fee) * vote_count
        max_withdrawable_amount = total_amount_collected * Decimal("0.6")

        if requested_amount <= 0:
            return Response(
                {"error": "Withdrawal amount must be greater than zero."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if requested_amount > max_withdrawable_amount:
            return Response(
                {
                    "error": "Requested amount exceeds the available balance.",
                    "max_withdrawable_amount": float(max_withdrawable_amount),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_withdrawal = Withdrawal.objects.filter(
            poll=poll, creator=request.user, status__in=[
                "pending", "successful"]
        ).first()

        if existing_withdrawal:
            message = (
                "A withdrawal is already pending. Please wait for confirmation."
                if existing_withdrawal.status == "pending"
                else "A withdrawal for this poll has already been successfully processed."
            )
            return Response({"message": message}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.account_number != poll.creator.account_number:
            return Response(
                {"error": "Withdrawals can only be made to your registered account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reference = f"{
            poll_id}-{request.user.id}-{Withdrawal.objects.count() + 1}"

        withdrawal = Withdrawal.objects.create(
            poll=poll,
            creator=request.user,
            amount=requested_amount,
            account_number=request.user.account_number,
            reference=reference,
            status="pending",
        )

        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json",
        }
        data = {
            "type": "mobile_money",
            "name": request.user.username,
            "account_number": request.user.account_number,
            "bank_code": "MTN",
            "currency": "GHS",
        }

        try:
            response = requests.post(
                "https://api.paystack.co/transferrecipient", json=data, headers=headers
            )
            response_data = response.json()

            if response.status_code == 200 and response_data.get("status") == "true":
                recipient_code = response_data["data"]["recipient_code"]

                transfer_data = {
                    "source": "balance",
                    "amount": int(requested_amount * 100),
                    "recipient": recipient_code,
                    "reason": f"Withdrawal for poll {poll_id}",
                }

                transfer_response = requests.post(
                    "https://api.paystack.co/transfer", json=transfer_data, headers=headers
                )
                transfer_response_data = transfer_response.json()

                if (
                    transfer_response.status_code == 200
                    and transfer_response_data.get("status") == "true"
                ):
                    withdrawal.status = "successful"
                    withdrawal.save()
                    return Response({"status": "Withdrawal initiated successfully."})
                else:
                    withdrawal.status = "failed"
                    withdrawal.save()
                    logger.error(f"Failed to initiate transfer: {
                                 transfer_response_data}")
                    return Response(
                        {"error": "Failed to initiate transfer. Please try again later."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )
            else:
                withdrawal.status = "failed"
                withdrawal.save()
                logger.error(f"Failed to initiate withdrawal: {response_data}")
                return Response(
                    {"error": "Failed to initiate withdrawal. Please try again later."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except requests.RequestException as e:
            withdrawal.status = "failed"
            withdrawal.save()
            logger.error(f"Exception during Paystack request: {e}")
            return Response(
                {"error": "An error occurred while processing the withdrawal. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@csrf_exempt
def paystack_webhook(request):
    paystack_signature = request.headers.get('X-Paystack-Signature')

    # Recompute the hash with the secret key to verify
    payload_body = request.body
    secret_key = settings.PAYSTACK_SECRET_KEY.encode('utf-8')
    computed_hash = hmac.new(secret_key, payload_body,
                             hashlib.sha512).hexdigest()

    # Check if the computed hash matches the Paystack signature
    if computed_hash != paystack_signature:
        return JsonResponse({"status": "error", "message": "Invalid signature"}, status=400)

    # Proceed with event handling if signature is valid
    payload = json.loads(payload_body)
    event = payload.get('event')

    if event == 'transfer.success':
        reference = payload.get('data', {}).get('reference')
        try:
            withdrawal = Withdrawal.objects.get(reference=reference)
            withdrawal.status = 'successful'
            withdrawal.save()
        except Withdrawal.DoesNotExist:
            logger.error(f"Successful withdrawal not found: {reference}")
            return JsonResponse({"status": "error", "message": "Withdrawal not found"}, status=404)
    elif event == 'transfer.failed':
        reference = payload.get('data', {}).get('reference')
        try:
            withdrawal = Withdrawal.objects.get(reference=reference)
            withdrawal.status = 'failed'
            withdrawal.save()
        except Withdrawal.DoesNotExist:
            logger.error(f"Failed withdrawal not found: {reference}")
            return JsonResponse({"status": "error", "message": "Withdrawal not found"}, status=404)

    return JsonResponse({"status": "success"})
