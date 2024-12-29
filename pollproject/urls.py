from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib import admin


def root_redirect_handler(request):
    reference = request.GET.get('reference')

    if not reference:
        return redirect(f"{settings.FRONTEND_URL}/payment/verification-error")
    return redirect(f"{settings.FRONTEND_URL}/payment/verify/{reference}")


urlpatterns = [
    path('admin/', admin.site.urls),
    path('auth/', include('authentication.urls')),
    path('polls/', include('poll.urls')),
    path('payment/', include('payment.urls')),
    path('vote/', include('vote.urls')),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', root_redirect_handler), 
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,
                          document_root=settings.MEDIA_ROOT)
