"""Text normalization used identically at training time and inference time.

This module is imported by both the training script (ml/src/train.py) and the
Django backend (backend/detector/ml_service.py). The function below is stored
*inside* the persisted scikit-learn Pipeline as the TfidfVectorizer's
`preprocessor`, so the exact same code path runs whether the text comes from
the training CSV or from a live API request -- there is no second,
hand-maintained copy of the cleaning logic that could drift out of sync.
"""
import re

_URL_RE = re.compile(r"(https?://\S+|www\.\S+)")
_EMAIL_RE = re.compile(r"\S+@\S+")
_NUMBER_RE = re.compile(r"\d+")
_NON_ALNUM_RE = re.compile(r"[^a-z0-9\s]")
_WHITESPACE_RE = re.compile(r"\s+")


def clean_text(text: str) -> str:
    """Lowercase, mask URLs/emails/numbers with placeholder tokens, strip
    punctuation, and collapse whitespace.

    Numbers/URLs/emails are replaced with placeholder tokens rather than
    deleted outright because their *presence* is itself a common spam signal
    (phone numbers, premium-rate shortcodes, links) -- deleting them entirely
    would throw away that signal.
    """
    if text is None:
        return ""
    text = str(text).lower()
    text = _URL_RE.sub(" urltoken ", text)
    text = _EMAIL_RE.sub(" emailtoken ", text)
    text = _NUMBER_RE.sub(" numtoken ", text)
    text = _NON_ALNUM_RE.sub(" ", text)
    text = _WHITESPACE_RE.sub(" ", text).strip()
    return text
