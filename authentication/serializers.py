from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError


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
        if User.objects.filter(account_number=data['account_number']).exists():
            raise ValidationError(
                "A user with this account number already exists.")
        return data

    def create(self, validated_data):
        user = get_user_model().objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            account_number=validated_data['account_number'],
            password=validated_data['password'],
        )
        return user
    
    def update(self, instance, validated_data):
        instance.email = validated_data.get('email', instance.email)
        instance.username = validated_data.get('username', instance.username)
        instance.account_number = validated_data.get('account_number', instance.account_number)
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
