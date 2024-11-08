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


class PaystackVerifyPaymentView(APIView):
    """
    Verify payment with Paystack and activate poll if successful.
    """

    def get(self, request, reference):
        url = f"https://api.paystack.co/transaction/verify/{reference}"

        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"
        }

        transaction = Transaction.objects.filter(
            payment_reference=reference, transaction_type='poll_payment').first()
        if transaction and transaction.success:
            return Response({"message": "Transaction already verified."}, status=status.HTTP_200_OK)

        try:
            response = requests.get(url, headers=headers)
            response_data = response.json()

            if not transaction:
                poll_id = reference.split("-")[1]
                transaction = Transaction.objects.create(
                    payment_reference=reference,
                    transaction_type='poll_payment',
                    amount=response_data['data']['amount'] / 100,
                    success=False,
                    poll_id=poll_id,
                    user_id=request.user.id
                )

            if response_data['status'] and response_data['data']['status'] == 'success':
                poll_id = reference.split("-")[1]
                poll = get_object_or_404(Poll, id=poll_id)

                Transaction.objects.filter(
                    payment_reference=reference).update(success=True)

                poll.active = True
                poll.save()

                return Response({"message": "Payment verified and poll activated."}, status=status.HTTP_200_OK)
            else:
                logger.error(f"Paystack verification failed: {response_data}")
                return Response({"error": "Payment verification failed"}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Exception during Paystack verification: {e}")
            return Response({"error": "An error occurred during verification"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
