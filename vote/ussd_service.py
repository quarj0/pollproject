from typing import Optional, Tuple, Dict, Any
import phonenumbers
from django.core.cache import cache
import json
from django.utils import timezone
from django.db import models
from vote.models import Vote, VoterCode
from poll.models import Poll, Contestant
from payment.models import Transaction
import uuid
import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class USSDState:
    INITIAL = "initial"
    POLL_INFO = "poll_info"
    CATEGORY_SELECTED = "category_selected"
    CONTESTANT_SELECTED = "contestant_selected"
    VOTES_INPUT = "votes_input"
    VOTER_CODE_INPUT = "voter_code_input"
    PAYMENT_PENDING = "payment_pending"
    VOTE_COMPLETE = "vote_complete"


class USSDSession:
    def __init__(self, phone_number: str):
        self.phone_number = phone_number
        self.session_key = f"ussd_session_{phone_number}"
        self._load_session()

    def _load_session(self):
        session_data = cache.get(self.session_key)
        if session_data:
            try:
                self.data = json.loads(session_data)
            except json.JSONDecodeError:
                self.data = {}
        else:
            self.data = {}

    def save(self):
        cache.set(self.session_key, json.dumps(
            self.data), timeout=600)  # 10 minutes

    def clear(self):
        cache.delete(self.session_key)
        self.data = {}

    @property
    def state(self) -> str:
        return self.data.get("state", USSDState.INITIAL)

    @state.setter
    def state(self, value: str):
        self.data["state"] = value
        self.save()

    def get(self, key: str, default=None):
        return self.data.get(key, default)

    def set(self, key: str, value):
        self.data[key] = value
        self.save()


class USSDService:
    def __init__(self, phone_number: str, user_input: str, poll_id: int):
        self.phone_number = self.normalize_phone_number(phone_number)
        self.user_input = user_input.strip() if user_input else ""
        self.poll_id = poll_id
        self.session = USSDSession(self.phone_number)

        # Store poll_id in session
        if poll_id:
            self.session.set("poll_id", poll_id)

    @staticmethod
    def normalize_phone_number(phone: str) -> str:
        """Normalize phone number to E164 format"""
        try:
            logger.debug(f"Normalizing phone number: {phone}")
            # Assuming Ghana as default region
            parsed = phonenumbers.parse(phone, "GH")
            if phonenumbers.is_valid_number(parsed):
                normalized = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
                logger.debug(f"Normalized phone number: {normalized}")
                return normalized
            else:
                logger.debug("Invalid phone number")
        except phonenumbers.NumberParseException as e:
            logger.debug(f"Phone number parsing error: {str(e)}")
        return phone

    def _get_poll(self) -> Optional[Poll]:
        """Get the current poll"""
        try:
            logger.debug(f"Getting poll with ID: {self.poll_id}")
            logger.debug(f"Current time: {timezone.now()}")
            poll = Poll.objects.get(
                id=self.poll_id,
                active=True,
                start_time__lte=timezone.now(),
                end_time__gt=timezone.now()
            )
            logger.debug(f"Found poll: {poll.title} (active: {poll.active}, start: {poll.start_time}, end: {poll.end_time})")
            return poll
        except Poll.DoesNotExist:
            logger.debug("Poll not found or not active")
            return None
        except Exception as e:
            logger.error(f"Error getting poll: {str(e)}", exc_info=True)
            return None

    def _get_poll_categories(self, poll: Poll) -> list:
        """Get distinct categories for a poll"""
        return list(Contestant.objects.filter(poll=poll)
                    .values_list('category', flat=True)
                    .distinct()
                    .order_by('category'))

    def _get_category_contestants(self, poll: Poll, category: str) -> list:
        """Get contestants in a specific category"""
        return list(Contestant.objects.filter(
            poll=poll,
            category=category
        ).order_by('name'))

    def _validate_voter_code(self, poll: Poll, code: str) -> Tuple[bool, str]:
        """Validate voter code for creator-pay polls"""
        try:
            voter_code = VoterCode.objects.get(
                poll=poll, code=code.upper(), used=False
            )
            return True, ""
        except VoterCode.DoesNotExist:
            return False, "Invalid or already used voter code"

    def _check_existing_vote(self, poll: Poll) -> bool:
        """Check if user has already voted"""
        if poll.one_vote_per_person:
            return Vote.objects.filter(
                poll=poll,
                voter_phone=self.phone_number
            ).exists()
        return False

    def _initiate_payment(self, poll: Poll, contestant: Contestant, votes_count: int) -> Tuple[bool, str, Optional[str]]:
        """Initiate payment for voter-pay polls"""
        try:
            amount = poll.voting_fee * votes_count
            reference = f"vote-{poll.id}-{contestant.id}-{uuid.uuid4().hex[:8]}"

            headers = {
                "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
                "Content-Type": "application/json"
            }

            data = {
                "email": f"ussd_{self.phone_number.replace('+', '')}@votelab.com",
                "amount": int(amount * 100),  # Convert to kobo
                "reference": reference,
                "metadata": {
                    "poll_id": poll.id,
                    "contestant_id": contestant.id,
                    "phone_number": self.phone_number,
                    "votes_count": votes_count
                }
            }

            response = requests.post(
                "https://api.paystack.co/transaction/initialize",
                json=data,
                headers=headers,
                timeout=10
            )

            if response.status_code == 200 and response.json().get("status"):
                # Create pending transaction
                Transaction.objects.create(
                    poll=poll,
                    amount=amount,
                    payment_reference=reference,
                    transaction_type='vote',
                    success=False
                )

                payment_url = response.json()["data"]["authorization_url"]
                return True, "", payment_url

            return False, "Failed to initiate payment", None

        except requests.RequestException as e:
            logger.error(f"Payment request error: {str(e)}")
            return False, "Payment service unavailable", None
        except Exception as e:
            logger.error(f"Payment initiation error: {str(e)}")
            return False, "Payment processing error", None

    def _create_vote(self, poll: Poll, contestant: Contestant, votes_count: int, voter_code: str = None) -> bool:
        """Create a vote record"""
        try:
            # Create the vote
            vote = Vote.objects.create(
                poll=poll,
                contestant=contestant,
                voter_phone=self.phone_number,
                votes_count=votes_count
            )

            # Mark voter code as used if applicable
            if voter_code and poll.poll_type == Poll.CREATOR_PAY:
                VoterCode.objects.filter(
                    poll=poll,
                    code=voter_code.upper(),
                    used=False
                ).update(used=True)

            return True

        except Exception as e:
            logger.error(f"Vote creation error: {str(e)}")
            return False

    def _handle_initial_state(self) -> Dict[str, Any]:
        """Handle initial USSD access"""
        poll = self._get_poll()
        if not poll:
            return {"message": "END Poll is not available or has ended."}

        self.session.state = USSDState.POLL_INFO

        # Show poll information and categories
        categories = self._get_poll_categories(poll)
        if not categories:
            return {"message": "END No contestants available for this poll."}

        message = f"CON Welcome to {poll.title}\n\n"

        if poll.poll_type == Poll.VOTER_PAY:
            message += f"Voting fee: GHS {poll.voting_fee} per vote\n\n"
        elif poll.poll_type == Poll.CREATOR_PAY:
            message += "Voter code required\n\n"

        message += "Select category:\n"
        for i, category in enumerate(categories, 1):
            message += f"{i}. {category}\n"

        return {"message": message}

    def _handle_poll_info(self) -> Dict[str, Any]:
        """Handle category selection"""
        poll = self._get_poll()
        if not poll:
            return {"message": "END Poll is no longer available."}

        try:
            categories = self._get_poll_categories(poll)
            selection = int(self.user_input) - 1

            if not (0 <= selection < len(categories)):
                return {"message": "END Invalid category selection."}

            category = categories[selection]
            contestants = self._get_category_contestants(poll, category)

            if not contestants:
                return {"message": "END No contestants in this category."}

            self.session.set("category", category)
            self.session.state = USSDState.CATEGORY_SELECTED

            message = f"CON {category} contestants:\n\n"
            for i, contestant in enumerate(contestants, 1):
                message += f"{i}. {contestant.name}\n"

            return {"message": message}

        except (ValueError, IndexError):
            return {"message": "END Invalid input. Please enter a valid number."}

    def _handle_category_selected(self) -> Dict[str, Any]:
        """Handle contestant selection"""
        poll = self._get_poll()
        category = self.session.get("category")

        if not poll or not category:
            return {"message": "END Session expired. Please try again."}

        try:
            contestants = self._get_category_contestants(poll, category)
            selection = int(self.user_input) - 1

            if not (0 <= selection < len(contestants)):
                return {"message": "END Invalid contestant selection."}

            contestant = contestants[selection]

            # Check if user already voted
            if self._check_existing_vote(poll):
                return {"message": "END You have already voted in this poll."}

            self.session.set("contestant_id", contestant.id)
            self.session.set("contestant_name", contestant.name)
            self.session.state = USSDState.CONTESTANT_SELECTED

            return {"message": f"CON You selected: {contestant.name}\n\nEnter number of votes (1-10):"}

        except (ValueError, IndexError):
            return {"message": "END Invalid input. Please enter a valid number."}

    def _handle_contestant_selected(self) -> Dict[str, Any]:
        """Handle vote count input"""
        try:
            votes_count = int(self.user_input)
            if not (1 <= votes_count <= 10):
                return {"message": "END Please enter a number between 1 and 10."}

            poll = self._get_poll()
            if not poll:
                return {"message": "END Poll is no longer available."}

            self.session.set("votes_count", votes_count)

            # Handle different poll types
            if poll.poll_type == Poll.CREATOR_PAY:
                self.session.state = USSDState.VOTER_CODE_INPUT
                return {"message": "CON Enter your voter code:"}

            elif poll.poll_type == Poll.VOTER_PAY:
                contestant_id = self.session.get("contestant_id")
                contestant = Contestant.objects.get(id=contestant_id)

                # Initiate payment
                success, error_msg, payment_url = self._initiate_payment(
                    poll, contestant, votes_count
                )

                if success:
                    self.session.state = USSDState.VOTE_COMPLETE
                    return {"message": f"END Payment required.\nAmount: GHS {poll.voting_fee * votes_count}\n\nComplete payment at:\n{payment_url}"}
                else:
                    return {"message": f"END {error_msg}"}

            else:  # FREE poll
                contestant_id = self.session.get("contestant_id")
                contestant = Contestant.objects.get(id=contestant_id)

                if self._create_vote(poll, contestant, votes_count):
                    contestant_name = self.session.get("contestant_name")
                    self.session.clear()
                    return {"message": f"END Thank you! Your {votes_count} vote(s) for {contestant_name} has been recorded."}
                else:
                    return {"message": "END Failed to record vote. Please try again."}

        except ValueError:
            return {"message": "END Invalid input. Please enter a valid number."}

    def _handle_voter_code_input(self) -> Dict[str, Any]:
        """Handle voter code validation for creator-pay polls"""
        poll = self._get_poll()
        if not poll:
            return {"message": "END Poll is no longer available."}

        voter_code = self.user_input.strip().upper()
        valid, error_msg = self._validate_voter_code(poll, voter_code)

        if not valid:
            return {"message": f"END {error_msg}"}

        # Create vote
        contestant_id = self.session.get("contestant_id")
        votes_count = self.session.get("votes_count")
        contestant_name = self.session.get("contestant_name")

        try:
            contestant = Contestant.objects.get(id=contestant_id)

            if self._create_vote(poll, contestant, votes_count, voter_code):
                self.session.clear()
                return {"message": f"END Thank you! Your {votes_count} vote(s) for {contestant_name} has been recorded."}
            else:
                return {"message": "END Failed to record vote. Please try again."}

        except Contestant.DoesNotExist:
            return {"message": "END Invalid contestant. Please try again."}

    def process(self) -> Dict[str, Any]:
        """Main processing method"""
        try:
            current_state = self.session.state
            logger.debug(f"Current state: {current_state}")
            logger.debug(f"User input: {self.user_input}")
            logger.debug(f"Poll ID: {self.poll_id}")
            logger.debug(f"Phone number: {self.phone_number}")

            if current_state == USSDState.INITIAL:
                logger.debug("Handling initial state")
                return self._handle_initial_state()
            elif current_state == USSDState.POLL_INFO:
                logger.debug("Handling poll info state")
                return self._handle_poll_info()
            elif current_state == USSDState.CATEGORY_SELECTED:
                logger.debug("Handling category selected state")
                return self._handle_category_selected()
            elif current_state == USSDState.CONTESTANT_SELECTED:
                logger.debug("Handling contestant selected state")
                return self._handle_contestant_selected()
            elif current_state == USSDState.VOTER_CODE_INPUT:
                logger.debug("Handling voter code input state")
                return self._handle_voter_code_input()
            else:
                logger.debug("Invalid state, clearing session")
                self.session.clear()
                return {"message": "END Session expired. Please try again."}

        except Exception as e:
            logger.error(f"USSD processing error: {str(e)}", exc_info=True)
            self.session.clear()
            return {"message": "END An error occurred. Please try again later."}
