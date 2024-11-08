from django.urls import path
from .views import PollCreateView, PollDetailView, PollListView

urlpatterns = [
    path('create/', PollCreateView.as_view(), name='poll-create'),
    path('poll/<int:poll_id>/', PollDetailView.as_view(), name='poll_detail'),
    path('polls/', PollListView.as_view(), name='polls'),
]
