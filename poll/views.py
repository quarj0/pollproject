from datetime import timezone
import requests
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.contrib.sites.shortcuts import get_current_site

from .models import Poll
from .serializers import PollSerializer
from paystackapi.paystack import Paystack

import logging

logger = logging.getLogger(__name__)

paystack = Paystack(secret_key=settings.PAYSTACK_SECRET_KEY)

class PollCreateView(APIView):
    def post(self, request):
        serializer = PollSerializer(
            data=request.data, context={'request': request})

        if serializer.is_valid():
            poll = serializer.save()

            ussd_code = f"*1398*{poll.id}#"

            short_url = self.generate_bitly_url(poll.id, request)

            if poll.poll_type == Poll.CREATOR_PAY:
                if poll.setup_fee:
                    payment_link = self.create_payment_link(
                        request.user, poll.setup_fee, poll.id)
                    return Response({
                        "poll_id": poll.id,
                        "short_url": short_url,
                        "ussd_code": ussd_code,
                        "payment_link": payment_link,
                        "message": "Poll created successfully. Please complete payment to activate the poll."
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({"detail": "Invalid setup fee."}, status=status.HTTP_400_BAD_REQUEST)

            poll.active = True
            poll.save()

            return Response({
                "poll_id": poll.id,
                "short_url": short_url,
                "ussd_code": ussd_code,
                "message": "Poll created successfully and is now active. Share the link and USSD code."
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def generate_bitly_url(self, poll_id, request):
        """
        Generate a shortened URL using Bitly API with dynamically built URL
        """
        bitly_url = "https://api-ssl.bitly.com/v4/shorten"
        headers = {
            "Authorization": f"Bearer {settings.BITLY_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }

        site = get_current_site(request)
        long_url = f"http://{site.domain}{
            reverse('poll_detail', args=[poll_id])}"

        payload = {
            "long_url": long_url,
        }

        try:
            response = requests.post(bitly_url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

            if "link" in data:
                return data['link']
            else:
                logger.error(
                    f"Bitly API response did not contain link. Data: {data}")
                return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Error shortening URL with Bitly: {e}")
            return None



    def create_payment_link(self, user, amount, poll_id):
        """
        Create a payment link with Paystack.
        """
        payment_data = {
            "email": user.email,
            "amount": int(amount * 100),
            "reference": f"poll-{poll_id}-setup-fees",
        }

        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(
                "https://api.paystack.co/transaction/initialize",
                json=payment_data,
                headers=headers
            )

            if response.status_code == 200:
                response_data = response.json()
                if response_data.get("status"):
                    return response_data["data"]["authorization_url"]
                else:
                    logger.error(f"Paystack error: {
                                 response_data.get('message')}")
                    return None
            else:
                logger.error(f"Failed to connect to Paystack. Status Code: {
                             response.status_code}")
                return None

        except requests.RequestException as e:
            logger.error(f"Exception during Paystack initialization: {e}")
            return None


class PollDetailView(APIView):
    def get(self, request, poll_id, *args, **kwargs):
        poll = get_object_or_404(Poll, id=poll_id)

        if not poll.active:
            return Response({"detail": "Poll is not active."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = PollSerializer(poll)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PollListView(APIView):
    def get(self, request, *args, **kwargs):
        polls = Poll.objects.all()
        serializer = PollSerializer(polls, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
