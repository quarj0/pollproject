from typing import Optional, Tuple, Dict, Any
import phonenumbers
from django.core.cache import cache
import json
from django.utils import timezone
from .models import Vote, VoterCode
from poll.models import Poll, Contestant
from payment.models import Transaction
import uuid
import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class USSDState:
    INITIAL = "initial"
    POLL_SELECTED = "poll_selected"
    CATEGORY_SELECTED = "category_selected"
    CONTESTANT_SELECTED = "contestant_selected"
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
                self.data = None
        else:
            self.data = None

    def save(self):
        if self.data:
            cache.set(self.session_key, json.dumps(self.data),
                      timeout=300)  # 5 minutes timeout

    def clear(self):
        cache.delete(self.session_key)
        self.data = None

    @property
    def state(self) -> str:
        return self.data.get("state", USSDState.INITIAL) if self.data else USSDState.INITIAL

    @state.setter
    def state(self, value: str):
        if not self.data:
            self.data = {}
        self.data["state"] = value
        self.save()


class USSDService:
    def __init__(self, phone_number: str, user_input: str):
        self.phone_number = self.normalize_phone_number(phone_number)
        self.user_input = user_input.strip() if user_input else ""
        self.session = USSDSession(self.phone_number)

    @staticmethod
    def normalize_phone_number(phone: str) -> str:
        try:
            # Assuming Ghana as default region
            parsed = phonenumbers.parse(phone, "GH")
            if phonenumbers.is_valid_number(parsed):
                return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        except phonenumbers.NumberParseException:
            pass
        return phone

    def _get_active_polls(self) -> list:
        return list(Poll.objects.filter(
            active=True,
            start_time__lte=timezone.now(),
            end_time__gt=timezone.now()
        ))

    def _get_poll_categories(self, poll_id: int) -> list:
        return list(Contestant.objects.filter(poll_id=poll_id)
                    .values_list('category', flat=True)
                    .distinct())

    def _get_category_contestants(self, poll_id: int, category: str) -> list:
        return list(Contestant.objects.filter(
            poll_id=poll_id,
            category=category
        ))

    def _validate_voter_code(self, poll_id: int, code: str) -> Tuple[bool, str]:
        try:
            voter_code = VoterCode.objects.get(
                poll_id=poll_id, code=code, used=False)
            return True, ""
        except VoterCode.DoesNotExist:
            return False, "Invalid or already used voter code"

    def _initiate_payment(self, poll_id: int, contestant_id: int, votes_count: int) -> Tuple[bool, str, Optional[str]]:
        try:
            poll = Poll.objects.get(id=poll_id)
            amount = poll.voting_fee * votes_count
            reference = f"vote-{poll_id}-{contestant_id}-{uuid.uuid4().hex[:8]}"

            # Create Paystack payment
            headers = {
                "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
                "Content-Type": "application/json"
            }
            data = {
                "email": f"ussd_{self.phone_number}@votelab.com",
                "amount": int(amount * 100),
                "reference": reference
            }
            response = requests.post(
                "https://api.paystack.co/transaction/initialize",
                json=data,
                headers=headers
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

        except Exception as e:
            logger.error(f"Payment initiation error: {str(e)}")
            return False, "Payment service unavailable", None

    def _handle_initial_state(self) -> Dict[str, Any]:
        # If there's no user input, show welcome message with poll list
        if not self.user_input:
            polls = self._get_active_polls()
            if not polls:
                return {"message": "CON Welcome to VoteLab!\n\nNo active polls available."}

            # Store polls in session for reference
            self.session.data["available_polls"] = [poll.id for poll in polls]
            self.session.state = USSDState.INITIAL
            self.session.save()

            options = "\n".join(
                f"{i+1}. {poll.title}" for i, poll in enumerate(polls))
            return {"message": f"CON Welcome to VoteLab!\n\nSelect a poll:\n{options}"}

        try:
            polls = self._get_active_polls()
            selection = int(self.user_input) - 1
            if not (0 <= selection < len(polls)):
                return {"message": "END Invalid input. Please try again with a valid option."}

            poll = polls[selection]
            self.session.data["poll_id"] = poll.id
            self.session.state = USSDState.POLL_SELECTED
            self.session.save()

            categories = self._get_poll_categories(poll.id)
            if not categories:
                self.session.clear()
                return {"message": "END No categories available for this poll."}

            options = "\n".join(f"{i+1}. {cat}" for i,
                                cat in enumerate(categories))
            return {"message": f"CON Select category:\n{options}"}
        except (ValueError, IndexError):
            return {"message": "END Invalid input. Please try again with a valid number."}

    def _handle_poll_selected(self) -> Dict[str, Any]:
        if not self.session.data.get("poll_id"):
            self.session.clear()
            return {"message": "END Session expired. Please start over."}

        try:
            poll_id = self.session.data["poll_id"]
            categories = self._get_poll_categories(poll_id)
            selection = int(self.user_input) - 1

            if not (0 <= selection < len(categories)):
                return {"message": "END Invalid category selection."}

            category = categories[selection]
            contestants = self._get_category_contestants(poll_id, category)
            if not contestants:
                self.session.clear()
                return {"message": "END No contestants available in this category."}

            self.session.data["category"] = category
            self.session.state = USSDState.CATEGORY_SELECTED
            self.session.save()

            options = "\n".join(f"{i+1}. {cont.name}" for i,
                                cont in enumerate(contestants))
            return {"message": f"CON Select contestant:\n{options}"}
        except (ValueError, IndexError):
            return {"message": "END Invalid input. Please try again."}

    def _handle_category_selected(self) -> Dict[str, Any]:
        if not self.session.data.get("poll_id") or not self.session.data.get("category"):
            self.session.clear()
            return {"message": "END Session expired. Please start over."}

        try:
            poll_id = self.session.data["poll_id"]
            category = self.session.data["category"]
            contestants = self._get_category_contestants(poll_id, category)
            selection = int(self.user_input) - 1

            if not (0 <= selection < len(contestants)):
                return {"message": "END Invalid contestant selection."}

            contestant = contestants[selection]
            self.session.data["contestant_id"] = contestant.id
            self.session.state = USSDState.CONTESTANT_SELECTED
            self.session.save()

            return {"message": "CON Enter number of votes (1-99):"}
        except (ValueError, IndexError):
            return {"message": "END Invalid input. Please try again."}

    def _handle_contestant_selected(self) -> Dict[str, Any]:
        """Handle the state after a contestant has been selected"""
        if not self.session.data.get("poll_id") or not self.session.data.get("contestant_id"):
            self.session.clear()
            return {"message": "END Session expired. Please start over."}

        try:
            votes = int(self.user_input)
            if not 1 <= votes <= 99:
                return {"message": "END Please enter a number between 1 and 99."}

            # Store vote count and move to payment state
            self.session.data["votes_count"] = votes
            self.session.state = USSDState.PAYMENT_PENDING
            self.session.save()

            # Initialize payment
            poll_id = self.session.data["poll_id"]
            contestant_id = self.session.data["contestant_id"]
            success, error_msg, payment_url = self._initiate_payment(
                poll_id, contestant_id, votes)

            if success:
                self.session.state = USSDState.VOTE_COMPLETE
                self.session.save()
                return {"message": f"END Thank you! Complete your payment at:\n{payment_url}"}
            return {"message": f"END Payment failed: {error_msg}"}
        except ValueError:
            return {"message": "CON Invalid input. Please enter a number between 1 and 99:"}

    def _handle_payment_pending(self) -> Dict[str, Any]:
        try:
            votes = int(self.user_input)
            if not 1 <= votes <= 99:
                return {"message": "END Please enter a number between 1 and 99."}

            poll_id = self.session.data["poll_id"]
            contestant_id = self.session.data["contestant_id"]
            self.session.data["votes_count"] = votes

            success, error_msg, payment_url = self._initiate_payment(
                poll_id, contestant_id, votes)
            if success:
                self.session.state = USSDState.VOTE_COMPLETE
                self.session.save()
                return {"message": f"END Thank you! Complete your payment at:\n{payment_url}"}
            return {"message": f"END Payment failed: {error_msg}"}
        except ValueError:
            return {"message": "END Please enter a valid number."}

    def process(self) -> Dict[str, Any]:
        try:
            # Handle invalid input first
            if self.user_input and not self.user_input.isdigit() and not self.session.data:
                return {"message": "END Invalid input. Please try again with a valid number."}

            # Handle first time access or expired session
            if not self.session.data:
                if self.user_input:
                    return {"message": "END Session expired. Please start over."}
                # First time access
                self.session.data = {
                    "state": USSDState.INITIAL
                }
                self.session.save()
                return self._handle_initial_state()

            # Handle state transitions
            current_state = self.session.state

            if current_state == USSDState.INITIAL:
                return self._handle_initial_state()
            elif current_state == USSDState.POLL_SELECTED:
                return self._handle_poll_selected()
            elif current_state == USSDState.CATEGORY_SELECTED:
                return self._handle_category_selected()
            elif current_state == USSDState.CONTESTANT_SELECTED:
                if not self.session.data.get("contestant_id"):
                    self.session.clear()
                    return {"message": "END Session expired. Please start over."}
                # Ask for number of votes if not transitioning to payment
                if not self.user_input:
                    return {"message": "CON Enter number of votes (1-99):"}
                return self._handle_contestant_selected()
            elif current_state == USSDState.PAYMENT_PENDING:
                return self._handle_payment_pending()
            else:
                self.session.clear()
                return {"message": "END Session expired. Please try again."}

        except Exception as e:
            logger.error(f"USSD processing error: {str(e)}")
            self.session.clear()
            return {"message": "END An error occurred. Please try again."}
