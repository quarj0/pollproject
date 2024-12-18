from django.urls import path
from .views import VoteView, USSDVotingView, VoteResultView

urlpatterns = [
    path('<int:poll_id>/', VoteView.as_view(), name='vote'),
    path('ussd/<int:poll_id>/', USSDVotingView.as_view(), name='ussd-vote'),
    path('results/<int:poll_id>/', VoteResultView.as_view(), name='result'),
]
