"""Load the persisted model pipeline and run predictions on new text.

Used by:
- the Django backend (backend/detector/ml_service.py wraps this with a
  process-wide cache so the model is loaded once, not per request)
- ml/src/predict_cli.py for a quick manual sanity check from the command line

Importing this module does NOT load the model automatically; call
`load_model()` explicitly and cache the result yourself. This keeps the
module side-effect-free and easy to import/test.
"""
from pathlib import Path

import joblib

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = PROJECT_ROOT / "ml" / "models" / "spam_classifier.joblib"

MAX_INPUT_CHARS = 20000


class ModelNotFoundError(RuntimeError):
    pass


def load_model(path: Path = MODEL_PATH):
    if not path.exists():
        raise ModelNotFoundError(
            f"No trained model found at {path}. Run `python -m ml.src.train` "
            "from the project root first."
        )
    return joblib.load(path)


def predict_text(model, text: str) -> dict:
    """Predict spam/ham for a single piece of text using an already-loaded
    fitted Pipeline. Returns a dict with the prediction, label, and the
    model's probability estimate for each class."""
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Input text must be a non-empty string.")
    if len(text) > MAX_INPUT_CHARS:
        raise ValueError(f"Input text exceeds the maximum of {MAX_INPUT_CHARS} characters.")

    proba = model.predict_proba([text])[0]
    spam_proba = float(proba[1])
    ham_proba = float(proba[0])
    is_spam = spam_proba >= 0.5

    return {
        "prediction": "spam" if is_spam else "not_spam",
        "label": "SPAM" if is_spam else "NOT SPAM",
        "is_spam": bool(is_spam),
        "confidence": round(spam_proba if is_spam else ham_proba, 4),
        "spam_probability": round(spam_proba, 4),
        "ham_probability": round(ham_proba, 4),
    }
