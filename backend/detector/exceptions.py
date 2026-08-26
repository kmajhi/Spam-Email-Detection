"""Custom DRF exception handler: never leak internal exception details,
tracebacks, or filesystem paths to API clients."""
import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def spam_api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        # DRF already produced a safe, structured response (validation
        # errors, 404s, throttling, etc.) -- normalize the shape.
        detail = response.data.get("detail") if isinstance(response.data, dict) else response.data
        response.data = {"error": detail if detail else response.data}
        return response

    # Unhandled exception (e.g. model failed to load): log the real error
    # server-side, return a generic message to the client.
    logger.exception("Unhandled exception in API view", exc_info=exc)
    return Response({"error": "An internal error occurred while processing the request."}, status=500)
