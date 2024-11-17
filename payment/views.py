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
from django.utils import timezone

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
            # Setup a session with retry
            session = requests.Session()
            retries = Retry(total=3, backoff_factor=0.3,
                            status_forcelist=[500, 502, 503, 504])
            session.mount("https://", HTTPAdapter(max_retries=retries))

            # Send verification request to Paystack
            response = session.get(url, headers=headers)
            response_data = response.json()

            # Ensure response is successful
            if not response_data['status']:
                logger.error(f"Paystack verification failed: {response_data}")
                return Response({"error": "Payment verification failed"}, status=status.HTTP_400_BAD_REQUEST)

            # Convert amount_paid to Decimal
            amount_paid = Decimal(
                response_data['data']['amount']) / Decimal(100)
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
                contestant = get_object_or_404(
                    Contestant, id=contestant_id, poll=poll)
                transaction_type = get_transaction_type(poll)

                # Ensure poll.voting_fee is also Decimal
                vote_count = amount_paid // Decimal(poll.voting_fee)

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
            reference = f"poll-{
                poll_id}-activation" if poll.poll_type == Poll.CREATOR_PAY else f"vote-{poll_id}"
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
                    logger.error(f"Paystack error: {
                                 response_data.get('message')}")
                    return Response({"error": "An error occurred during payment link generation."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                logger.error(f"Failed to connect to Paystack. Status Code: {
                             response.status_code}")
                return Response({"error": "Failed to connect to payment gateway."}, status=status.HTTP_400_BAD_REQUEST)

        except requests.RequestException as e:
            logger.error(f"Exception during Paystack initialization: {e}")
            return Response({"error": "An error occurred during payment link generation."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InitiateWithdrawalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id, creator=request.user)

        if poll.poll_type != "voter-pay":
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


class AccountBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        polls = Poll.objects.filter(
            creator=request.user, poll_type=Poll.VOTERS_PAY)
        total_amount_collected = Decimal('0.0')
        total_withdrawn = Decimal('0.0')

        for poll in polls:
            vote_count = sum(vote.number_of_votes for vote in poll.votes.all())
            total_amount_collected += Decimal(poll.voting_fee) * vote_count

            withdrawals = Withdrawal.objects.filter(
                poll=poll, status='successful')
            total_withdrawn += sum(withdrawal.amount for withdrawal in withdrawals)

        available_balance = (total_amount_collected *
                             Decimal('0.6')) - total_withdrawn

        data = {
            'available_balance': float(available_balance),
            'total_withdrawn': float(total_withdrawn),
        }

        return Response(data, status=status.HTTP_200_OK)




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
            # Setup a session with retry
            session = requests.Session()
            retries = Retry(total=3, backoff_factor=0.3,
                            status_forcelist=[500, 502, 503, 504])
            session.mount("https://", HTTPAdapter(max_retries=retries))

            # Send verification request to Paystack
            response = session.get(url, headers=headers)
            response_data = response.json()

            # Ensure response is successful
            if not response_data['status']:
                logger.error(f"Paystack verification failed: {response_data}")
                return Response({"error": "Payment verification failed"}, status=status.HTTP_400_BAD_REQUEST)

            # Convert amount_paid to Decimal
            amount_paid = Decimal(
                response_data['data']['amount']) / Decimal(100)
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
                contestant = get_object_or_404(
                    Contestant, id=contestant_id, poll=poll)
                transaction_type = get_transaction_type(poll)

                # Ensure poll.voting_fee is also Decimal
                vote_count = amount_paid // Decimal(poll.voting_fee)

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
            reference = f"poll-{
                poll_id}-activation" if poll.poll_type == Poll.CREATOR_PAY else f"vote-{poll_id}"
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
                    logger.error(f"Paystack error: {
                                 response_data.get('message')}")
                    return Response({"error": "An error occurred during payment link generation."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                logger.error(f"Failed to connect to Paystack. Status Code: {
                             response.status_code}")
                return Response({"error": "Failed to connect to payment gateway."}, status=status.HTTP_400_BAD_REQUEST)

        except requests.RequestException as e:
            logger.error(f"Exception during Paystack initialization: {e}")
            return Response({"error": "An error occurred during payment link generation."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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


class AccountBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        polls = Poll.objects.filter(
            creator=request.user, poll_type=Poll.VOTERS_PAY)
        total_amount_collected = Decimal('0.0')
        total_withdrawn = Decimal('0.0')

        for poll in polls:
            vote_count = sum(vote.number_of_votes for vote in poll.votes.all())
            total_amount_collected += Decimal(poll.voting_fee) * vote_count

            withdrawals = Withdrawal.objects.filter(
                poll=poll, status='successful')
            total_withdrawn += sum(withdrawal.amount for withdrawal in withdrawals)

        available_balance = (total_amount_collected *
                             Decimal('0.6')) - total_withdrawn

        data = {
            'available_balance': float(available_balance),
            'total_withdrawn': float(total_withdrawn),
        }

        return Response(data, status=status.HTTP_200_OK)


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
