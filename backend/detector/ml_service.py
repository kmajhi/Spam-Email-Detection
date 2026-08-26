"""Process-wide access to the trained spam-classification model.

The model is loaded from disk at most once per process (cached in a module
level variable) and reused for every prediction request -- it is never
retrained on startup and never retrained per-request.
"""
import json
import logging
import threading

from django.conf import settings

from ml.src.predict import ModelNotFoundError, load_model, predict_text

logger = logging.getLogger(__name__)

_model = None
_model_lock = threading.Lock()


class ModelUnavailableError(RuntimeError):
    """Raised when the model artifact cannot be loaded."""


def get_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:  # re-check inside the lock
                try:
                    _model = load_model(settings.ML_MODEL_PATH)
                    logger.info("Loaded spam classifier from %s", settings.ML_MODEL_PATH)
                except ModelNotFoundError as exc:
                    logger.error("Model artifact missing: %s", exc)
                    raise ModelUnavailableError(str(exc)) from exc
    return _model


def predict(text: str) -> dict:
    model = get_model()
    return predict_text(model, text)


def get_model_metadata() -> dict:
    """Read the (already-computed, not fabricated) evaluation metrics saved
    by ml/src/train.py so the frontend can display real numbers."""
    path = settings.ML_METRICS_PATH
    if not path.exists():
        return {"available": False}
    with open(path) as f:
        metrics = json.load(f)
    return {"available": True, **metrics}
