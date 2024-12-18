from django.urls import path
from .views import (RegisterView, LoginView, UserUpdateView,
                    LogoutView, PasswordResetRequestView,
                    PasswordResetConfirmView, DeleteUserView,
                    UserView)


urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('user/', UserView.as_view(), name='user'),
    path('logout/', LogoutView.as_view(), name='logout'),
    
     path('update/', UserUpdateView.as_view(), name='update-user'),   

    path('reset/password/', PasswordResetRequestView.as_view(),
         name='reset-password-request'),

    path('reset/password/<uidb64>/<token>/',
         PasswordResetConfirmView.as_view(), name='reset-password-confirm'),

    path('user/delete/', DeleteUserView.as_view(), name='delete-user'),
]
