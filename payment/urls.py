from django.urls import path
from .views import PaystackVerifyPaymentView

urlpatterns = [
    path('verify/<str:reference>/',
         PaystackVerifyPaymentView.as_view(), name='verify-payment'),
]
