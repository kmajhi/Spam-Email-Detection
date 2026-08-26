from django.urls import path

from .views import ModelInfoView, PredictView

urlpatterns = [
    path("predict/", PredictView.as_view(), name="predict"),
    path("model-info/", ModelInfoView.as_view(), name="model-info"),
]
