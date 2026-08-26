"""Quick manual sanity check of the persisted model from the command line.

Usage:
    python -m ml.src.predict_cli
"""
from ml.src.predict import load_model, predict_text

EXAMPLES = [
    ("Obvious spam", "WINNER!! As a valued network customer you have been "
     "selected to receive a $900 prize reward! To claim call 09061701461. "
     "Claim code KL341. Valid 12 hours only."),
    ("Obvious ham", "Hey, are we still on for lunch tomorrow at 1pm? Let me "
     "know if you want to change the time."),
    ("Borderline-ish", "Reminder: your account statement is ready to view. "
     "Please log in to check your balance."),
]

if __name__ == "__main__":
    model = load_model()
    for name, text in EXAMPLES:
        result = predict_text(model, text)
        print(f"[{name}]")
        print(f"  text: {text[:80]}...")
        print(f"  -> {result['label']}  (spam_probability={result['spam_probability']})")
        print()
