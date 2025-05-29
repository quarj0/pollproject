from django.core.cache import cache
from rest_framework.decorators import throttle_classes
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.response import Response
from functools import wraps
import json


def cache_poll_data(timeout=300):  # 5 minutes cache
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(view_instance, request, *args, **kwargs):
            poll_id = kwargs.get('poll_id')
            if not poll_id:
                return view_func(view_instance, request, *args, **kwargs)

            cache_key = f'poll_data_{poll_id}'
            cached_data = cache.get(cache_key)

            if cached_data is not None:
                return Response(json.loads(cached_data))

            response = view_func(view_instance, request, *args, **kwargs)
            cache.set(cache_key, json.dumps(response.data), timeout)
            return response

        return wrapper
    return decorator


class USSDRateThrottle(ScopedRateThrottle):
    scope = 'ussd'


class PaymentRateThrottle(ScopedRateThrottle):
    scope = 'payment_endpoints'
