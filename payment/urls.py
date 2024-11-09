from django.urls import path
from .views import VerifyPaymentView, PaymentHistoryView, PaymentLinkView

urlpatterns = [
    path('verify/<str:reference>/',
         VerifyPaymentView.as_view(), name='verify-payment'),

    path('history/', PaymentHistoryView.as_view(), name='payment-history'),
    path('<poll_id>/link/', PaymentLinkView.as_view(), name='payment-link')
]
