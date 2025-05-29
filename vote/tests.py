from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase
from datetime import timedelta
from .models import Vote, VoterCode
from poll.models import Poll, Contestant
from .ussd_service import USSDService, USSDState, USSDSession

User = get_user_model()


class USSDServiceTestCase(TestCase):
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        # Create test poll
        self.poll = Poll.objects.create(
            creator=self.user,
            title='Test Poll',
            description='Test Description',
            start_time=timezone.now(),
            end_time=timezone.now() + timedelta(days=1),
            poll_type='voters-pay',
            voting_fee=1.00,
            active=True
        )

        # Create test categories and contestants
        self.category = 'Test Category'
        self.contestant1 = Contestant.objects.create(
            poll=self.poll,
            name='Contestant 1',
            category=self.category
        )
        self.contestant2 = Contestant.objects.create(
            poll=self.poll,
            name='Contestant 2',
            category=self.category
        )

        # Create test voter code
        self.voter_code = VoterCode.objects.create(
            poll=self.poll,
            code='TEST123'
        )

        # Clear cache before each test
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_ussd_initial_state(self):
        service = USSDService('+233240000000', '')
        result = service.process()
        self.assertIn('Welcome to VoteLab', result['message'])
        self.assertTrue(result['message'].startswith('CON'))
        self.assertTrue('Test Poll' in result['message'])

    def test_ussd_poll_selection(self):
        phone = '+233240000000'
        # First initialize session and show menu
        service = USSDService(phone, '')
        service.process()

        # Then select poll
        service = USSDService(phone, '1')
        result = service.process()
        self.assertIn('Select category', result['message'])
        self.assertTrue(result['message'].startswith('CON'))
        self.assertTrue(self.category in result['message'])

    def test_ussd_category_selection(self):
        phone = '+233240000000'
        # Initialize menu
        service = USSDService(phone, '')
        service.process()

        # Select poll
        service = USSDService(phone, '1')
        service.process()

        # Select category
        service = USSDService(phone, '1')
        result = service.process()
        self.assertIn('Select contestant', result['message'])
        self.assertTrue(result['message'].startswith('CON'))
        self.assertTrue('Contestant 1' in result['message'])
        self.assertTrue('Contestant 2' in result['message'])

    def test_ussd_contestant_selection_voter_pay(self):
        phone = '+233240000000'
        # Initialize menu
        service = USSDService(phone, '')
        service.process()

        # Select poll
        service = USSDService(phone, '1')
        service.process()

        # Select category
        service = USSDService(phone, '1')
        service.process()

        # Select contestant
        service = USSDService(phone, '1')
        result = service.process()
        self.assertIn('Enter number of votes', result['message'])
        self.assertTrue(result['message'].startswith('CON'))

    def test_ussd_invalid_input(self):
        service = USSDService('+233240000000', 'invalid')
        result = service.process()
        self.assertTrue(result['message'].startswith('END'))
        self.assertIn('Invalid input', result['message'])

    def test_ussd_session_timeout(self):
        phone = '+233240000000'
        # Initialize session
        service = USSDService(phone, '')
        service.process()

        # Clear session to simulate timeout
        cache.clear()

        # Try to use expired session
        service = USSDService(phone, '1')
        result = service.process()
        self.assertTrue(result['message'].startswith('END'))
        self.assertIn('Session expired', result['message'])


class USSDVotingViewTestCase(APITestCase):
    def setUp(self):
        # Similar setup as USSDServiceTestCase
        self.setup_data()

    def setup_data(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.poll = Poll.objects.create(
            creator=self.user,
            title='Test Poll',
            description='Test Description',
            start_time=timezone.now(),
            end_time=timezone.now() + timedelta(days=1),
            poll_type='voters-pay',
            voting_fee=1.00,
            active=True
        )

    def test_phone_number_required(self):
        response = self.client.post('/vote/ussd/', {
            'user_input': '1'
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('Phone number is required', response.data['message'])

    def test_rate_limiting(self):
        # Test that rate limiting is working
        for _ in range(61):  # Assuming 60/minute rate limit
            response = self.client.post('/vote/ussd/', {
                'phone_number': '+233240000000',
                'user_input': '1'
            })
        self.assertEqual(response.status_code, 429)  # Too Many Requests
