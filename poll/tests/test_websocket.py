import pytest
from channels.testing import WebsocketCommunicator
from channels.routing import URLRouter
from django.urls import re_path
from .. import consumers
from ..models import Poll
from vote.models import Vote
from authentication.models import User
from django.test import override_settings
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
from django.utils import timezone
import json


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
class TestVoteConsumer:
    async def test_connect_and_subscribe(self, settings):
        # Create test data
        user = await database_sync_to_async(User.objects.create)(
            email="test@example.com",
            password="testpass123"
        )
        poll = await database_sync_to_async(Poll.objects.create)(
            title="Test Poll",
            description="Test Description",
            creator=user,
            start_date=timezone.now(),
            end_date=timezone.now() + timezone.timedelta(days=1)
        )

        # Setup WebSocket application
        application = URLRouter([
            re_path(r"ws/poll/(?P<poll_id>\d+)/$",
                    consumers.VoteConsumer.as_asgi()),
        ])

        # Connect to WebSocket
        communicator = WebsocketCommunicator(
            application=application,
            path=f"/ws/poll/{poll.id}/"
        )
        connected, _ = await communicator.connect()
        assert connected

        # Subscribe to poll updates
        await communicator.send_json_to({
            "type": "subscribe_to_poll_results",
            "poll_id": poll.id
        })

        response = await communicator.receive_json_from()
        assert response["status"] == "subscribed"
        assert response["poll_id"] == poll.id

        await communicator.disconnect()

    async def test_vote_updates(self, settings):
        # Create test data
        user = await database_sync_to_async(User.objects.create)(
            email="test@example.com",
            password="testpass123"
        )
        poll = await database_sync_to_async(Poll.objects.create)(
            title="Test Poll",
            description="Test Description",
            creator=user,
            start_date=timezone.now(),
            end_date=timezone.now() + timezone.timedelta(days=1)
        )

        # Setup WebSocket
        application = URLRouter([
            re_path(r"ws/poll/(?P<poll_id>\d+)/$",
                    consumers.VoteConsumer.as_asgi()),
        ])
        communicator = WebsocketCommunicator(
            application=application,
            path=f"/ws/poll/{poll.id}/"
        )
        connected, _ = await communicator.connect()
        assert connected

        # Subscribe to updates
        await communicator.send_json_to({
            "type": "subscribe_to_poll_results",
            "poll_id": poll.id
        })
        await communicator.receive_json_from()  # Subscription confirmation

        # Create a new vote
        vote = await database_sync_to_async(Vote.objects.create)(
            poll=poll,
            phone_number="+1234567890",
            number_of_votes=1
        )

        # Should receive vote update
        response = await communicator.receive_json_from()
        assert "poll_results" in response
        assert response["action"] == "create"

        await communicator.disconnect()

    async def test_error_handling(self, settings):
        application = URLRouter([
            re_path(r"ws/poll/(?P<poll_id>\d+)/$",
                    consumers.VoteConsumer.as_asgi()),
        ])
        communicator = WebsocketCommunicator(
            application=application,
            path="/ws/poll/999999/"  # Non-existent poll
        )
        connected, _ = await communicator.connect()
        assert connected

        # Try to subscribe to non-existent poll
        await communicator.send_json_to({
            "type": "subscribe_to_poll_results",
            "poll_id": 999999
        })

        response = await communicator.receive_json_from()
        assert "error" in response
        assert response["error"] == "Poll not found"

        await communicator.disconnect()

    async def test_unsubscribe(self, settings):
        # Create test data
        user = await database_sync_to_async(User.objects.create)(
            email="test@example.com",
            password="testpass123"
        )
        poll = await database_sync_to_async(Poll.objects.create)(
            title="Test Poll",
            description="Test Description",
            creator=user,
            start_date=timezone.now(),
            end_date=timezone.now() + timezone.timedelta(days=1)
        )

        # Setup WebSocket
        application = URLRouter([
            re_path(r"ws/poll/(?P<poll_id>\d+)/$",
                    consumers.VoteConsumer.as_asgi()),
        ])
        communicator = WebsocketCommunicator(
            application=application,
            path=f"/ws/poll/{poll.id}/"
        )
        connected, _ = await communicator.connect()
        assert connected

        # Subscribe
        await communicator.send_json_to({
            "type": "subscribe_to_poll_results",
            "poll_id": poll.id
        })
        await communicator.receive_json_from()

        # Unsubscribe
        await communicator.send_json_to({
            "type": "unsubscribe_from_poll_results",
            "poll_id": poll.id
        })

        response = await communicator.receive_json_from()
        assert response["status"] == "unsubscribed"
        assert response["poll_id"] == poll.id

        await communicator.disconnect()
