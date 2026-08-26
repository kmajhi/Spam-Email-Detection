import logging

from rest_framework.response import Response
from rest_framework.views import APIView

from . import ml_service
from .serializers import PredictRequestSerializer

logger = logging.getLogger(__name__)


class PredictView(APIView):
    """POST /api/predict/

    Request body:  {"text": "<email or message content>"}
    Response body: {
        "prediction": "spam" | "not_spam",
        "label": "SPAM" | "NOT SPAM",
        "is_spam": bool,
        "confidence": float,        # probability of the predicted class
        "spam_probability": float,
        "ham_probability": float
    }
    """

    def post(self, request):
        serializer = PredictRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        text = serializer.validated_data["text"]

        try:
            result = ml_service.predict(text)
        except ml_service.ModelUnavailableError:
            return Response(
                {"error": "The prediction model is not currently available. "
                          "Please try again later."},
                status=503,
            )
        except ValueError as exc:
            # predict_text() raises ValueError for input-shape problems the
            # serializer didn't already catch.
            return Response({"error": str(exc)}, status=400)

        return Response(result, status=200)


class ModelInfoView(APIView):
    """GET /api/model-info/

    Returns the real evaluation metrics produced by ml/src/train.py for the
    currently deployed model (dataset stats, selected model, test-set
    metrics). Used by the frontend's "methodology" section. Never fabricated.
    """

    def get(self, request):
        metadata = ml_service.get_model_metadata()
        if not metadata.get("available"):
            return Response(
                {"error": "Model metadata is not available. Train the model first."},
                status=503,
            )
        return Response(metadata, status=200)
