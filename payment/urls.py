from django.urls import path
from .views import InitiateWithdrawalView, VerifyPaymentView, PaymentHistoryView, PaymentLinkView, paystack_webhook

urlpatterns = [
    path('verify/<str:reference>/',VerifyPaymentView.as_view(), name='verify-payment'),

    path('history/', PaymentHistoryView.as_view(), name='payment-history'),
    
    path('<poll_id>/link/', PaymentLinkView.as_view(), name='payment-link'),
    
    path('<int:poll_id>/withdraw/request/', InitiateWithdrawalView.as_view(), name='withdrawal'),
    
    path('webhook/', paystack_webhook, name='paystack-webhook'),
]
