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
            self.data = json.loads(session_data)
        else:
            self.data = {
                "state": USSDState.INITIAL,
                "poll_id": None,
                "category_index": None,
                "contestant_id": None,
                "votes_count": None,
                "voter_code": None
            }

    def save(self):
        cache.set(self.session_key, json.dumps(self.data),
                  timeout=300)  # 5 minutes timeout

    def clear(self):
        cache.delete(self.session_key)

    @property
    def state(self) -> str:
        return self.data.get("state", USSDState.INITIAL)

    @state.setter
    def state(self, value: str):
        self.data["state"] = value
        self.save()


class USSDService:
    def __init__(self, phone_number: str, user_input: str):
        self.phone_number = self.normalize_phone_number(phone_number)
        self.user_input = user_input.strip()
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

    def process(self) -> Dict[str, Any]:
        try:
            if self.session.state == USSDState.INITIAL:
                return self._handle_initial_state()
            elif self.session.state == USSDState.POLL_SELECTED:
                return self._handle_poll_selected()
            elif self.session.state == USSDState.CATEGORY_SELECTED:
                return self._handle_category_selected()
            elif self.session.state == USSDState.CONTESTANT_SELECTED:
                return self._handle_contestant_selected()
            else:
                self.session.clear()
                return {"message": "END Session expired. Please start over."}

        except Exception as e:
            logger.error(f"USSD processing error: {str(e)}")
            self.session.clear()
            return {"message": "END An error occurred. Please try again."}

    def _handle_initial_state(self) -> Dict[str, Any]:
        if not self.user_input:
            polls = self._get_active_polls()
            if not polls:
                return {"message": "END No active polls available."}

            options = "\n".join(
                f"{i+1}. {poll.title}" for i, poll in enumerate(polls))
            return {"message": f"CON Welcome to VoteLab!\nSelect a poll:\n{options}"}

        try:
            polls = self._get_active_polls()
            selection = int(self.user_input) - 1
            if 0 <= selection < len(polls):
                self.session.data["poll_id"] = polls[selection].id
                self.session.state = USSDState.POLL_SELECTED
                categories = self._get_poll_categories(polls[selection].id)
                options = "\n".join(f"{i+1}. {cat}" for i,
                                    cat in enumerate(categories))
                return {"message": f"CON Select category:\n{options}"}
            return {"message": "END Invalid poll selection."}
        except (ValueError, IndexError):
            return {"message": "END Invalid input. Please try again."}

    def _handle_poll_selected(self) -> Dict[str, Any]:
        try:
            poll_id = self.session.data["poll_id"]
            categories = self._get_poll_categories(poll_id)
            selection = int(self.user_input) - 1

            if 0 <= selection < len(categories):
                self.session.data["category_index"] = selection
                self.session.state = USSDState.CATEGORY_SELECTED
                contestants = self._get_category_contestants(
                    poll_id, categories[selection])
                options = "\n".join(
                    f"{i+1}. {c.name}" for i, c in enumerate(contestants))
                return {"message": f"CON Select contestant:\n{options}"}
            return {"message": "END Invalid category selection."}
        except (ValueError, IndexError):
            return {"message": "END Invalid input. Please try again."}

    def _handle_category_selected(self) -> Dict[str, Any]:
        try:
            poll_id = self.session.data["poll_id"]
            categories = self._get_poll_categories(poll_id)
            category = categories[self.session.data["category_index"]]
            contestants = self._get_category_contestants(poll_id, category)
            selection = int(self.user_input) - 1

            if 0 <= selection < len(contestants):
                contestant = contestants[selection]
                self.session.data["contestant_id"] = contestant.id
                self.session.state = USSDState.CONTESTANT_SELECTED

                poll = Poll.objects.get(id=poll_id)
                if poll.poll_type == Poll.VOTERS_PAY:
                    return {"message": f"CON Enter number of votes for {contestant.name}:"}
                else:
                    return {"message": f"CON Enter voter code for {contestant.name}:"}
            return {"message": "END Invalid contestant selection."}
        except (ValueError, IndexError):
            return {"message": "END Invalid input. Please try again."}

    def _handle_contestant_selected(self) -> Dict[str, Any]:
        try:
            poll = Poll.objects.get(id=self.session.data["poll_id"])
            contestant = Contestant.objects.get(
                id=self.session.data["contestant_id"])

            if poll.poll_type == Poll.VOTERS_PAY:
                try:
                    votes_count = int(self.user_input)
                    if votes_count < 1:
                        return {"message": "END Please enter a valid number of votes."}

                    success, error, payment_url = self._initiate_payment(
                        poll.id, contestant.id, votes_count)

                    if success:
                        self.session.clear()
                        return {
                            "message": "END Payment initiated. Complete your payment with the link sent.",
                            "payment_url": payment_url
                        }
                    return {"message": f"END {error}"}
                except ValueError:
                    return {"message": "END Please enter a valid number."}

            else:  # Creator-Pay
                voter_code = self.user_input
                is_valid, error = self._validate_voter_code(
                    poll.id, voter_code)

                if is_valid:
                    Vote.objects.create(
                        poll=poll,
                        contestant=contestant,
                        number_of_votes=1
                    )
                    VoterCode.objects.filter(
                        poll=poll,
                        code=voter_code
                    ).update(used=True)

                    self.session.clear()
                    return {"message": "END Vote recorded successfully!"}
                return {"message": f"END {error}"}

        except Exception as e:
            logger.error(f"Vote processing error: {str(e)}")
            return {"message": "END An error occurred while processing your vote."}
