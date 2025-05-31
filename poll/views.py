import csv
from uuid import uuid4
from django.http import HttpResponse
import requests
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.contrib.sites.shortcuts import get_current_site
from django.utils.crypto import get_random_string
from django.utils import timezone
import string

from vote.models import VoterCode
from .models import Poll, Contestant
from .serializers import PollSerializer, UpdatePollSerializer, ContestantSerializer

import logging
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)


class PollCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PollSerializer(
            data=request.data, context={'request': request})

        if serializer.is_valid():
            poll = serializer.save()

            ussd_code = f"*1398*{poll.id}#"
            short_url = self.generate_poll_url(poll.id, request)

            if poll.poll_type == Poll.CREATOR_PAY:
                if poll.setup_fee:
                    payment_link = self.create_payment_link(
                        request.user, poll.setup_fee, poll.id)

                    if poll.expected_voters:
                        self.generate_voter_codes(poll)

                    return Response({
                        "poll_id": poll.id,
                        "short_url": short_url,
                        "ussd_code": ussd_code,
                        "payment_link": payment_link,
                        "download_voter_codes": reverse('download-voter-codes', args=[poll.id]),
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
                "message": "Poll created successfully and is now active."
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def generate_voter_codes(self, poll):
        if not poll.expected_voters:
            return f"Poll '{poll.title}' does not have expected voters set."

        for _ in range(poll.expected_voters):
            code = get_random_string(
                length=5, allowed_chars=string.ascii_uppercase + string.digits)
            VoterCode.objects.create(poll=poll, code=code)

        return f"{poll.expected_voters} voter codes generated for Poll '{poll.title}'"

    def generate_poll_url(self, poll_id, request):
        """
        Generate a direct poll URL for users to share.
        """
        site = get_current_site(request)
        frontend_url = getattr(settings, "FRONTEND_URL", None)
        if frontend_url:
            return f"{frontend_url.rstrip('/')}/poll/{poll_id}"

    def create_payment_link(self, user, amount, poll_id):
        payment_data = {
            "email": user.email,
            "amount": int(amount * 100),
            "reference": f"activate-{poll_id}-{uuid4().hex[:5]}",
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
            )
            if response.status_code == 200:
                response_data = response.json()
                if response_data.get("status"):
                    return response_data["data"]["authorization_url"]
            logger.error(f"Paystack error: {response_data.get('message')}")
        except requests.RequestException as e:
            logger.error(
                f"Exception during payment gateway initialization: {e}")
        return None


class UpdatePollView(generics.UpdateAPIView):
    queryset = Poll.objects.all()
    serializer_class = UpdatePollSerializer

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


class PollDetailView(APIView):
    def get(self, request, poll_id, *args, **kwargs):
        poll = get_object_or_404(Poll, id=poll_id)

        if not poll.active:
            return Response({"detail": "Poll is not active."}, status=status.HTTP_400_BAD_REQUEST)

        contestants = poll.contestants.all()
        contestants_data = ContestantSerializer(contestants, many=True).data

        return Response({
            "poll": PollSerializer(poll).data,
            "contestants": contestants_data
        }, status=status.HTTP_200_OK)


class ContestantListView(APIView):
    def get(self, request, poll_id, *args, **kwargs):
        contestants = Contestant.objects.filter(poll_id=poll_id)
        serializer = ContestantSerializer(contestants, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ContestantDetails(APIView):
    def get(self, request, poll_id, contestant_id, *args, **kwargs):
        """
        Fetch a single contestant by poll_id and contestant_id
        """
        contestant = Contestant.objects.filter(
            poll_id=poll_id, id=contestant_id).first()
        if not contestant:
            return Response({"error": "Contestant not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ContestantSerializer(contestant)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PollListView(APIView):
    def get(self, request, *args, **kwargs):
        polls = Poll.objects.all()
        # Auto-expire polls whose end_time has passed
        for poll in polls:
            poll.auto_expire()
        serializer = PollSerializer(Poll.objects.all(), many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DeletePollView(APIView):
    def delete(self, request, poll_id=None):

        if poll_id:
            poll = get_object_or_404(Poll, id=poll_id)
            poll.delete()
            return Response({"detail": f"Poll {poll_id} has been deleted."}, status=status.HTTP_200_OK)
        else:
            polls = Poll.objects.all()
            polls.delete()
            return Response({"detail": "All polls deleted."}, status=status.HTTP_200_OK)


class DownloadVoterCodesView(APIView):
    def get(self, request, poll_id):
        poll = get_object_or_404(Poll, id=poll_id)
        voter_codes = VoterCode.objects.filter(poll=poll, used=False)

        if not voter_codes:
            return Response({"error": "No voter codes available for this poll."}, status=status.HTTP_404_NOT_FOUND)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="voter_codes_{
            poll_id}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Voter Code', 'Used'])

        for voter_code in voter_codes:
            writer.writerow([voter_code.code, voter_code.used])

        return response


class ContestantCreateView(generics.CreateAPIView):
    queryset = Contestant.objects.all()
    serializer_class = ContestantSerializer
    permission_classes = [IsAuthenticated]


class ContestantUpdateView(APIView):
    def patch(self, request, poll_id, contestant_id):
        poll = get_object_or_404(Poll, id=poll_id)

        # Check if poll can be edited
        if poll.start_time <= timezone.now():
            return Response(
                {"message": "Cannot edit contestant after poll has started"},
                status=status.HTTP_403_FORBIDDEN
            )

        if poll.votes.exists():
            return Response(
                {"message": "Cannot edit contestant after votes have been cast"},
                status=status.HTTP_403_FORBIDDEN
            )

        contestant = get_object_or_404(
            Contestant, id=contestant_id, poll_id=poll_id)
        serializer = ContestantSerializer(
            contestant, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DeleteContestantView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, poll_id, contestant_id):
        poll = get_object_or_404(Poll, id=poll_id)
        
        # Check if poll can be edited
        if poll.start_time <= timezone.now():
            return Response(
                {"message": "Cannot delete contestant after poll has started"},
                status=status.HTTP_403_FORBIDDEN
            )

        if poll.votes.exists():
            return Response(
                {"message": "Cannot delete contestant after votes have been cast"},
                status=status.HTTP_403_FORBIDDEN
            )

        contestant = get_object_or_404(Contestant, id=contestant_id, poll_id=poll_id)
        contestant.delete()
        return Response({"message": "Contestant deleted successfully"}, status=status.HTTP_200_OK)
