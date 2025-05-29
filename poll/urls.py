from django.urls import path
from .views import (
    PollCreateView,
    UpdatePollView,
    PollDetailView,
    PollListView,
    DeletePollView,
    DownloadVoterCodesView,
    ContestantCreateView,
    ContestantDetails,
    ContestantUpdateView,
    ContestantListView,
)

urlpatterns = [
    # Poll Management
    path('create/', PollCreateView.as_view(), name='poll-create'),
    path('<int:poll_id>/', PollDetailView.as_view(), name='poll-detail'),
    path('list/', PollListView.as_view(), name='poll-list'),
    path('<int:pk>/update/', UpdatePollView.as_view(), name='poll-update'),
    
    
    
    path('<int:poll_id>/delete/', DeletePollView.as_view(), name='poll-delete'),
    path('<int:poll_id>/voter-codes/download/',
         DownloadVoterCodesView.as_view(), name='download-voter-codes'),

    # Contestant Management
    path('<int:poll_id>/contestants/create/',
         ContestantCreateView.as_view(), name='contestant-create'),
    path('<int:poll_id>/contestants/', ContestantListView.as_view(), name='contestant-list'),

    path('<int:poll_id>/contestants/<int:contestant_id>/',
         ContestantDetails.as_view(), name='contestant-details'),
    
    path('<int:poll_id>/contestants/<int:pk>/update/',
         ContestantUpdateView.as_view(), name='contestant-update'),
]
