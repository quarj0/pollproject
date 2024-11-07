from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings

from .serializers import RegisterSerializer, LoginSerializer


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
            user = authenticate(email=email, password=password)

            if user:
                refresh = RefreshToken.for_user(user)
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token)
                }, status=status.HTTP_200_OK)

            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = request.data.get("refresh")
            if token:
                token_obj = RefreshToken(token)
                token_obj.blacklist()
            return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    def post(self, request):
        email = request.data.get('email')
        user = get_user_model().objects.filter(email=email).first()

        if user:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(str(user.pk).encode('utf-8'))
            reset_url = request.build_absolute_uri(
                f"/auth/reset/password/{uid}/{token}/")

            send_mail(
                "Password Reset Request",
                f"""
                Dear {user.get_full_name() or user.username},

                We received a request to reset your password. Click the link below to reset your password.\n

                {reset_url}

                If you did not request a password reset, please ignore this email or contact support if you have questions.

                Best regards,
                Your Company Team
                """,
                settings.EMAIL_HOST_USER,
                [email],
                fail_silently=False,
            )

            return Response({"message": "Password reset email sent."}, status=status.HTTP_200_OK)

        return Response({"error": "Email not found"}, status=status.HTTP_404_NOT_FOUND)


class PasswordResetConfirmView(APIView):
    def post(self, request, uidb64, token):
        try:
            user.set_password(new_password)
            user.save()
            if user.is_active:
                return Response({"message": "Password reset successfully."}, status=status.HTTP_200_OK)
        except (TypeError, ValueError, OverflowError, get_user_model().DoesNotExist):
            user = None

        if user and default_token_generator.check_token(user, token):
            new_password = request.data.get("password")
            user.set_password(new_password)
            user.save()
            return Response({"message": "Password reset successfully."}, status=status.HTTP_200_OK)

        return Response({"error": "Invalid token or expired"}, status=status.HTTP_400_BAD_REQUEST)


class DeleteUserView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        user.delete()
        return Response({"message": "User deleted successfully."}, status=status.HTTP_200_OK)
