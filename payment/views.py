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
from django.shortcuts import get_object_or_404, redirect
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListAPIView

from vote.models import Vote

from .serializers import TransactionSerializer
from vote.serializers import VoteSerializer
from .models import Withdrawal, Transaction
from poll.models import Contestant, Poll

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


logger = logging.getLogger(__name__)


def get_transaction_type(poll):
    return 'poll_activation' if poll.poll_type == Poll.CREATOR_PAY else 'vote'


class VerifyPaymentView(APIView):
    """
    Verify payment with Paystack and activate poll or record votes if successful.
    """

    def _get_frontend_url(self, request):
        """Get the frontend URL based on environment"""
        if settings.DEBUG:
            return 'http://localhost:5173'  # Development frontend URL
        return f"{'https' if request.is_secure() else 'http'}://{request.get_host()}"  # Production URL

    def _process_poll_activation(self, transaction, poll, amount_paid, reference):
        """Process poll activation after successful payment"""
        transaction_type = get_transaction_type(poll)
        
        # Create or update transaction
        if not transaction:
            transaction = Transaction.objects.create(
                payment_reference=reference,
                transaction_type=transaction_type,
                amount=amount_paid,
                success=True,
                poll=poll,
            )
        else:
            transaction.success = True
            transaction.save()

        # Activate the poll
        poll.active = True
        poll.save()

        return transaction

    def get(self, request, reference):
        url = f"https://api.paystack.co/transaction/verify/{reference}"
        headers = {"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}
        
        # Get the frontend URL
        frontend_url = self._get_frontend_url(request)
        
        # Check if this is an API request or direct browser request
        is_api_request = 'application/json' in request.headers.get('Accept', '')

        # Extract poll_id from reference before verification
        try:
            reference_parts = reference.split("-")
            poll_id = reference_parts[1]
            poll = get_object_or_404(Poll, id=poll_id)
            
            # Get return URL from query params or default to results page
            return_url = request.GET.get('return_url', f"{frontend_url}/poll/{poll.id}/results")
        except (IndexError, Poll.DoesNotExist):
            error_url = f"{frontend_url}/payment/verification-error"
            return Response({
                "error": "Invalid reference or poll not found",
                "redirect_url": error_url
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Verify with Paystack first
            response = requests.get(url, headers=headers)
            response_data = response.json()

            if not response_data.get('status'):
                logger.error(f"Paystack verification failed: {response_data}")
                return Response({
                    "error": "Payment verification failed",
                    "redirect_url": return_url
                }, status=status.HTTP_400_BAD_REQUEST)

            # Get the transaction data
            amount_paid = Decimal(response_data['data']['amount']) / Decimal(100)

            # Get or create transaction
            transaction = Transaction.objects.filter(payment_reference=reference).first()

            if transaction and transaction.success:
                return Response({
                    "message": "Transaction already verified.",
                    "redirect_url": return_url
                }, status=status.HTTP_200_OK)

            # Process the payment based on type
            if "activate" in reference:
                # Handle poll activation
                transaction = self._process_poll_activation(transaction, poll, amount_paid, reference)
            elif "vote" in reference:
                # Handle vote processing
                contestant_id = reference_parts[2]
                contestant = get_object_or_404(Contestant, id=contestant_id, poll=poll)
                vote = self._process_vote(transaction, poll, contestant, amount_paid, reference)
            else:
                raise ValueError("Invalid transaction type")

            # Return success response (always JSON, never redirect)
            return Response({
                "message": "Payment verified and processed successfully.",
                "redirect_url": return_url
            }, status=status.HTTP_200_OK)

        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP request error: {e}")
            return Response({
                "error": "Verification service unavailable.",
                "redirect_url": return_url
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        except Exception as e:
            logger.error(f"Exception during verification: {e}")
            return Response({
                "error": "An error occurred during verification",
                "redirect_url": return_url
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _process_vote(self, transaction, poll, contestant, amount_paid, reference):
        try:
            voting_fee = Decimal(poll.voting_fee)
            vote_count = int(amount_paid // voting_fee)

            if vote_count < 1:
                raise ValueError("Insufficient amount for voting.")

            # Update or create transaction
            if not transaction:
                transaction = Transaction.objects.create(
                    payment_reference=reference,
                    transaction_type='vote',
                    amount=amount_paid,
                    success=True,
                    poll=poll,
                )
            else:
                transaction.success = True
                transaction.save()

            # Create vote
            vote = Vote.objects.create(
                poll=poll,
                contestant=contestant,
                number_of_votes=vote_count,
                transaction=transaction
            )
            # Broadcast to WebSocket group
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"poll_{poll.id}",
                {
                    "type": "vote_update",
                    "data": {"poll_id": poll.id}
                }
            )
            return vote

        except Exception as e:
            logger.error(f"Error processing vote: {str(e)}")
            raise ValueError(f"Vote processing failed: {str(e)}")


class PaymentLinkView(APIView):
    """
    Get payment link for a poll.
    """

    def get(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id)
        transaction_type = get_transaction_type(poll)
        amount = Decimal(poll.setup_fee if poll.poll_type ==
                         Poll.CREATOR_PAY else poll.voting_fee)
        
        # Use settings.FRONTEND_URL for the frontend URL
        frontend_url = settings.FRONTEND_URL
        return_url = request.GET.get('return_url', f"{frontend_url}/poll/{poll_id}/results")
        callback_url = f"{frontend_url}/payment/verify/{reference}"
        
        # Check if a successful payment transaction already exists
        existing_transaction = Transaction.objects.filter(
            user_id=request.user.id, poll_id=poll_id, transaction_type=transaction_type, success=True
        ).first()

        if existing_transaction:
            return Response({
                "message": "Payment has already been completed for this poll.",
                "redirect_url": return_url
            }, status=status.HTTP_200_OK)

        # Check for any existing pending transaction
        pending_transaction = Transaction.objects.filter(
            user_id=request.user.id, poll_id=poll_id, transaction_type=transaction_type, success=False
        ).first()

        if pending_transaction:
            reference = pending_transaction.payment_reference
        else:
            # Create a unique reference for a new transaction
            reference = f"activate-{poll_id}-{uuid.uuid4().hex[:5]}" if poll.poll_type == Poll.CREATOR_PAY else f"vote-{poll_id}"
            pending_transaction = Transaction.objects.create(
                user_id=request.user.id,
                poll_id=poll_id,
                transaction_type=transaction_type,
                amount=amount,
                payment_reference=reference,
                success=False
            )

        payment_data = {
            "email": getattr(request.user, "email", "customer@castsure.com"),
            "amount": int(amount * 100),
            "reference": reference,
            "callback_url": callback_url,
            "metadata": {
                "return_url": return_url,
                "poll_id": poll_id,
                "transaction_type": transaction_type
            }
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
                    return Response({
                        "payment_link": payment_url,
                        "return_url": return_url
                    }, status=status.HTTP_200_OK)
                else:
                    logger.error(f"Paystack error: {response_data.get('message')}")
                    return Response({"error": "An error occurred during payment link generation."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                logger.error(f"Failed to connect to Paystack. Status Code: {response.status_code}")
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
                active=True
            )

            total_amount_collected = Decimal('0.0')
            total_withdrawn = Decimal('0.0')

            # Calculate total amount collected from successful transactions
            for poll in polls:
                successful_votes = Vote.objects.filter(
                    poll=poll,
                    transaction__success=True  # Use transaction success status
                )
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

        reference = f"{poll_id}-{request.user.id}-{Withdrawal.objects.count() + 1}"

        withdrawal = Withdrawal.objects.create(
            poll=poll,
            creator=request.user,
            amount=requested_amount,
            account_number=request.user.account_number,
            reference=reference,
            status="pending",
        )

        # FLUTTERWAVE WITHDRAWAL LOGIC
        FLUTTERWAVE_SECRET_KEY = settings.FLUTTERWAVE_SECRET_KEY
        headers = {
            "Authorization": f"Bearer {FLUTTERWAVE_SECRET_KEY}",
            "Content-Type": "application/json",
        }
        # Step 1: Create transfer recipient (if needed)
        recipient_data = {
            "account_bank": "MTN",  # or the correct bank code for mobile money
            "account_number": request.user.account_number,
            "currency": "GHS",
            "beneficiary_name": request.user.username,
        }
        try:
            recipient_response = requests.post(
                "https://api.flutterwave.com/v3/beneficiaries",
                json=recipient_data,
                headers=headers,
                timeout=10
            )
            recipient_json = recipient_response.json()
            if not recipient_json.get("status") == "success":
                withdrawal.status = "failed"
                withdrawal.save()
                logger.error(f"Flutterwave recipient error: {recipient_json}")
                return Response({"error": "Failed to create transfer recipient."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            recipient_id = recipient_json["data"]["id"]
        except Exception as e:
            withdrawal.status = "failed"
            withdrawal.save()
            logger.error(f"Exception during Flutterwave recipient creation: {e}")
            return Response({"error": "An error occurred while creating the recipient."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Step 2: Initiate transfer
        transfer_data = {
            "account_bank": "MTN",  # or the correct bank code
            "account_number": request.user.account_number,
            "amount": float(requested_amount),
            "currency": "GHS",
            "beneficiary_name": request.user.username,
            "reference": reference,
            "narration": f"Withdrawal for poll {poll_id}",
        }
        try:
            transfer_response = requests.post(
                "https://api.flutterwave.com/v3/transfers",
                json=transfer_data,
                headers=headers,
                timeout=10
            )
            transfer_json = transfer_response.json()
            if transfer_json.get("status") == "success":
                withdrawal.status = "successful"
                withdrawal.save()
                return Response({"status": "Withdrawal initiated successfully."})
            else:
                withdrawal.status = "failed"
                withdrawal.save()
                logger.error(f"Flutterwave transfer error: {transfer_json}")
                return Response({"error": "Failed to initiate transfer. Please try again later."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            withdrawal.status = "failed"
            withdrawal.save()
            logger.error(f"Exception during Flutterwave transfer: {e}")
            return Response({"error": "An error occurred while processing the withdrawal. Please try again later."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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

    if event == 'charge.success':
        # Handle successful payment
        data = payload.get('data', {})
        reference = data.get('reference')
        
        try:
            # Get the transaction
            transaction = Transaction.objects.filter(payment_reference=reference).first()
            if not transaction:
                logger.error(f"Transaction not found for reference: {reference}")
                return JsonResponse({"status": "error", "message": "Transaction not found"}, status=404)

            # If transaction is already verified, return success
            if transaction.success:
                return JsonResponse({"status": "success", "message": "Transaction already verified"})

            # Get poll and process based on transaction type
            poll = transaction.poll
            amount_paid = Decimal(data['amount']) / 100

            if "activate" in reference:
                # Handle poll activation
                poll.active = True
                poll.save()
                transaction.success = True
                transaction.save()
                logger.info(f"Poll {poll.id} activated via webhook")
            
            elif "vote" in reference:
                # Handle vote processing
                reference_parts = reference.split("-")
                contestant_id = reference_parts[2]
                contestant = get_object_or_404(Contestant, id=contestant_id, poll=poll)
                
                # Calculate votes based on amount paid
                voting_fee = Decimal(poll.voting_fee)
                vote_count = int(amount_paid // voting_fee)
                
                if vote_count >= 1:
                    # Create vote
                    Vote.objects.create(
                        poll=poll,
                        contestant=contestant,
                        number_of_votes=vote_count,
                        transaction=transaction
                    )
                    transaction.success = True
                    transaction.save()
                    logger.info(f"Vote recorded via webhook for poll {poll.id}, contestant {contestant_id}")
                    # Broadcast to WebSocket group
                    channel_layer = get_channel_layer()
                    async_to_sync(channel_layer.group_send)(
                        f"poll_{poll.id}",
                        {
                            "type": "vote_update",
                            "data": {"poll_id": poll.id}
                        }
                    )
                else:
                    logger.error(f"Insufficient amount for voting: {amount_paid}")
                    return JsonResponse({"status": "error", "message": "Insufficient amount for voting"}, status=400)

            return JsonResponse({"status": "success"})
            
        except Exception as e:
            logger.error(f"Error processing payment success webhook: {str(e)}")
            return JsonResponse({"status": "error", "message": str(e)}, status=500)

    elif event == 'transfer.success':
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
