import logging
from textwrap import dedent
import requests
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from rest_framework_simplejwt.exceptions import TokenError, AuthenticationFailed

from .serializers import RegisterSerializer, LoginSerializer, UserSerializer


logger = logging.getLogger(__name__)


class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "User registered successfully.", }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            user = authenticate(request, username=email, password=password)

            if user:
                refresh = RefreshToken.for_user(user)
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token)
                }, status=status.HTTP_200_OK)

            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Blacklist the refresh token
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token_obj = RefreshToken(refresh_token)
                token_obj.blacklist()

            access_token = request.data.get("access")
            if access_token:
                token_ = AccessToken(token_)
                token_.__delitem__("access")

            return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    def post(self, request):
        email = request.data.get('email')
        user = get_user_model().objects.filter(email=email).first()

        try:

            if user:
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(str(user.pk).encode('utf-8'))
                reset_url = f"{
                    settings.FRONTEND_URL}/auth/reset/password/{uid}/{token}/"

                send_mail(
                    "Password Reset Request",
                    dedent(f"""
                        Dear {user.get_full_name() or user.username},

                        We received a request to reset your password. Click the link below to reset your password:

                        {reset_url}

                        If you did not request a password reset, please ignore this email or contact support if you have questions.

                        Best regards,
                        VoteLab Team
                    """),
                    settings.EMAIL_HOST_USER,
                    [email],
                    fail_silently=False,
                )

                return Response({"message": "Password reset email sent."}, status=status.HTTP_200_OK)

            return Response({"error": "Email not found"}, status=status.HTTP_404_NOT_FOUND)
        except TimeoutError:
            return Response({"error": "Failed to send email"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except TokenError:
            return Response({"error": "Failed to generate token"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except AuthenticationFailed:
            return Response({"error": "Failed to authenticate user"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PasswordResetConfirmView(APIView):
    def post(self, request, uidb64, token):
        try:
            uid = urlsafe_base64_decode(uidb64).decode('utf-8')
            user = get_user_model().objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, get_user_model().DoesNotExist):
            user = None
        try:
            if user and default_token_generator.check_token(user, token):
                new_password = request.data.get("new_password")
                confirm_password = request.data.get("confirm_password")

                if not new_password or not confirm_password:
                    return Response({"error": "Both password fields are required"}, status=status.HTTP_400_BAD_REQUEST)

                if new_password != confirm_password:
                    return Response({"error": "Passwords do not match"}, status=status.HTTP_400_BAD_REQUEST)
                elif len(new_password) < 6:
                    return Response({"error": "Password must be at least 6 characters long"}, status=status.HTTP_400_BAD_REQUEST)

                user.set_password(new_password)
                user.save()
                return Response({"message": "Password reset successfully."}, status=status.HTTP_200_OK)

        except TokenError:
            return Response({"error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)
        except AuthenticationFailed:
            return Response({"error": "Failed to authenticate user"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DeleteUserView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        user.delete()
        return Response({"message": "User deleted successfully."}, status=status.HTTP_200_OK)
