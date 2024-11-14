from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('auth/', include(('authentication.urls','authentication'), namespace='authentication')),
    path('payment/', include(('payment.urls', 'payment'), namespace='payment')),
    path('polls/', include(('poll.urls', 'polls'), namespace='polls')),
    path('vote/', include(('vote.urls', 'vote'), namespace='vote')),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
