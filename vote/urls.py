from django.urls import path
from .views import VoteView, VerifyPaymentCallback

urlpatterns = [
    path('<int:poll_id>/', VoteView.as_view(), name='vote'),
    path('verify-payment/<str:reference>/', VerifyPaymentCallback.as_view(), name='verify-payment'),
]
