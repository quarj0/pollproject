from django.urls import path
from .views import (InitiateWithdrawalView,
                    VerifyPaymentView, PaymentHistoryView,
                    PaymentLinkView, paystack_webhook, AccountBalanceView)

urlpatterns = [
    path('verify/<str:reference>/',
         VerifyPaymentView.as_view(), name='verify-payment'),

    path('history/', PaymentHistoryView.as_view(), name='payment-history'),

    path('poll/<poll_id>/link/', PaymentLinkView.as_view(), name='payment-link'),

    path('account/<int:poll_id>/withdraw/',
         InitiateWithdrawalView.as_view(), name='withdrawal'),

    path('account/balance', AccountBalanceView.as_view(), name="account-balance"),

    path('webhook/', paystack_webhook, name='paystack-webhook'),
]
