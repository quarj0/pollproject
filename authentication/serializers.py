from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
import re


def validate_account_number(value):
    if not value.isdigit():
        raise ValidationError("Account number must contain only numeric digits.")

    if re.match(r'^(.)\1{9}$', value):
        raise ValidationError("Account number must be a valid phone number.")

    invalid_patterns = ['123456789', '987654321', '12345678', '87654321',
                        '10000000', '100000000', '1000000000', '10000000000',
                        '100000000000']
    if any(pattern in value for pattern in invalid_patterns):
        raise ValidationError("Account number must be a valid phone number.")

    if value in ["0123456789", "9876543210"]:
        raise ValidationError("Account number must be a valid phone number.")

    # Enforce length constraints
    if not (8 <= len(value) <= 12):
        raise ValidationError("Account number must be between 8 and 12 digits.")
    
    return value


class UserSerializer(serializers.ModelSerializer):
    account_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = get_user_model()
        fields = ['email', 'username', 'account_number', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_account_number(self, value):
        return validate_account_number(value)

    def update(self, instance, validated_data):
        if 'account_number' in validated_data:
            validated_data['account_number'] = validate_account_number(validated_data['account_number'])

        instance.email = validated_data.get('email', instance.email)
        instance.username = validated_data.get('username', instance.username)
        instance.account_number = validated_data.get('account_number', instance.account_number)

        instance.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = get_user_model()
        fields = ['email', 'username', 'account_number', 'password']
        extra_kwargs = {
            'email': {'validators': []},
            'username': {'validators': []},
            'account_number': {'validators': []},
        }

    def validate(self, data):
        User = get_user_model()
        if User.objects.filter(email=data['email']).exists():
            raise ValidationError("A user with this email already exists.")
        if User.objects.filter(username=data['username']).exists():
            raise ValidationError("A user with this username already exists.")
        if 'account_number' in data and User.objects.filter(account_number=data['account_number']).exists():
            raise ValidationError("A user with this account number already exists.")
        
        if 'account_number' in data:
            data['account_number'] = validate_account_number(data['account_number'])
        
        return data

    def create(self, validated_data):
        user = get_user_model().objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            account_number=validated_data.get('account_number', ''),
            password=validated_data['password'],
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
