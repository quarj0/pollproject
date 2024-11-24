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
)

urlpatterns = [
    # Poll Management
    path('create/', PollCreateView.as_view(), name='poll-create'),
    
    path('<int:pk>/update/', UpdatePollView.as_view(), name='poll-update'),
    
    path('<int:poll_id>/', PollDetailView.as_view(), name='poll-detail'),
    
    path('list/', PollListView.as_view(), name='poll-list'),
    
    path("<int:poll_id>/contestants/", ContestantDetails.as_view(), name="contestant-details"),
    
    path('<int:poll_id>/delete/',DeletePollView.as_view(), name='poll-delete'),
    
    path('<int:poll_id>/voter-codes/download/',DownloadVoterCodesView.as_view(), name='download-voter-codes'),

    # Contestant Management
    path('contestants/create/', ContestantCreateView.as_view(), name='contestant-create'),
    path('contestants/<int:pk>/update/',ContestantUpdateView.as_view(), name='contestant-update'),
]
