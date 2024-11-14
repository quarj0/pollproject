
from django.urls import path

from .views import PollCreateView, UpdatePollView, PollDetailView, PollListView, DeletePollView, DownloadVoterCodesView


urlpatterns = [

    path('create/', PollCreateView.as_view(), name='poll_create'),

    path('update/<int:poll_id>/', UpdatePollView.as_view(), name='poll_update'),

    path('<int:poll_id>/', PollDetailView.as_view(), name='poll-detail'),

    path('list/', PollListView.as_view(), name='poll_list'),

    path('delete/<int:poll_id>/', DeletePollView.as_view(), name='poll_delete'),

    path('download_voter_codes/<int:poll_id>/', DownloadVoterCodesView.as_view(), name='download_voter_codes'),
]