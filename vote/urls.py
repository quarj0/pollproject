from django.urls import path
from .views import VoteView

urlpatterns = [
    path('<int:poll_id>/', VoteView.as_view(), name='vote'),
]