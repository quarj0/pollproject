from django.urls import path
from .views import CreatorPayVoteView, USSDVotingView, VoteResultView, VoterPayVoteView

urlpatterns = [
    path('creator-pay/<int:poll_id>/',
         CreatorPayVoteView.as_view(), name='creator-pay'),
    path('voter-pay/<int:poll_id>/', VoterPayVoteView.as_view(), name='voter-pay'),
    path('ussd/', USSDVotingView.as_view(), name='ussd-vote'),
    path('ussd/<int:poll_id>/', USSDVotingView.as_view(), name='ussd-vote-poll'),
    path('results/<int:poll_id>/', VoteResultView.as_view(), name='result'),
]
