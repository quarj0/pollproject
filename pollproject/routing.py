from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import re_path
from poll.consumers import PollConsumer
from channels.security.websocket import AllowedHostsOriginValidator
from corsheaders.middleware import CorsMiddleware

websocket_urlpatterns = [
    re_path(r'ws/poll/(?P<poll_id>\w+)/?$', PollConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    'websocket': CorsMiddleware(
        AllowedHostsOriginValidator(
            AuthMiddlewareStack(
                URLRouter(websocket_urlpatterns)
            )
        )
    ),
})
