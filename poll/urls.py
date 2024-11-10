from django.urls import path
from .views import PollCreateView, PollDetailView, PollListView, DeletePollView, UpdatePollView

urlpatterns = [
    path('create/', PollCreateView.as_view(), name='poll-create'),
    path('poll/<int:poll_id>/', PollDetailView.as_view(), name='poll_detail'),
    path('polls/', PollListView.as_view(), name='polls'),
    path("<int:pk>/update/poll/", UpdatePollView.as_view(), name="update-poll"),
    path("delete/", DeletePollView.as_view(), name="detele-polls"),
    path("delete/<int:poll_id>/", DeletePollView.as_view(), name="delete-poll"),
]
