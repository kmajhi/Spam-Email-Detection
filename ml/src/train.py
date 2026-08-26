"""Train, evaluate, compare, and persist spam-classification models.

Pipeline (see README.md "Machine-learning methodology" for the full writeup):

    raw data -> label/text cleaning -> stratified train/test split
             -> TF-IDF fit on TRAIN ONLY (inside an sklearn Pipeline)
             -> transform train & test
             -> fit each candidate classifier
             -> evaluate every candidate on the held-out test set
             -> 5-fold CV on the training split only, for robustness
             -> select one model with a documented, non-accuracy-only rule
             -> persist the exact fitted Pipeline that was evaluated

Run from the project root with the venv active:

    python -m ml.src.train

Outputs:
    ml/models/spam_classifier.joblib   - the selected fitted Pipeline (TF-IDF + classifier)
    ml/models/metrics.json             - metrics for the selected model + metadata
    ml/reports/model_comparison.json   - metrics for every candidate model
"""
import json
import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml.src.data_loading import clean_labels, inspect_dataset, load_raw_dataset  # noqa: E402
from ml.src.preprocessing import clean_text  # noqa: E402

MODELS_DIR = PROJECT_ROOT / "ml" / "models"
REPORTS_DIR = PROJECT_ROOT / "ml" / "reports"
RANDOM_STATE = 42
TEST_SIZE = 0.2


def build_vectorizer() -> TfidfVectorizer:
    return TfidfVectorizer(
        preprocessor=clean_text,
        stop_words="english",
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.95,
        sublinear_tf=True,
    )


def build_candidates() -> dict:
    """Candidate models. All expose predict_proba (LinearSVC is wrapped in
    CalibratedClassifierCV via Platt scaling) so the comparison is fair and
    so a meaningful probability/confidence can be surfaced by the API
    regardless of which model is ultimately selected."""
    return {
        "multinomial_nb": MultinomialNB(),
        "logistic_regression": LogisticRegression(
            max_iter=2000, random_state=RANDOM_STATE
        ),
        "linear_svm_calibrated": CalibratedClassifierCV(
            LinearSVC(random_state=RANDOM_STATE), method="sigmoid", cv=5
        ),
    }


def evaluate(pipeline: Pipeline, X_test, y_test) -> dict:
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]

    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
    return {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision_spam": float(precision_score(y_test, y_pred, pos_label=1, zero_division=0)),
        "recall_spam": float(recall_score(y_test, y_pred, pos_label=1, zero_division=0)),
        "f1_spam": float(f1_score(y_test, y_pred, pos_label=1, zero_division=0)),
        "precision_macro": float(precision_score(y_test, y_pred, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_test, y_pred, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y_test, y_pred, average="macro", zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, y_proba)),
        "confusion_matrix": {
            "labels": ["ham (0)", "spam (1)"],
            "matrix": cm.tolist(),
            "tn": int(cm[0, 0]), "fp": int(cm[0, 1]),
            "fn": int(cm[1, 0]), "tp": int(cm[1, 1]),
        },
    }


def cross_validate_on_training_split(estimator, X_train, y_train) -> dict:
    """5-fold stratified CV performed ONLY on the training split (never the
    held-out test set), so it estimates variance/robustness without ever
    letting the test set influence anything."""
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    scores = cross_validate(
        estimator, X_train, y_train, cv=cv,
        scoring=["accuracy", "f1", "precision", "recall", "roc_auc"],
        n_jobs=None,
    )
    return {
        f"cv_{metric}_mean": float(np.mean(scores[f"test_{metric}"]))
        for metric in ["accuracy", "f1", "precision", "recall", "roc_auc"]
    } | {
        f"cv_{metric}_std": float(np.std(scores[f"test_{metric}"]))
        for metric in ["accuracy", "f1", "precision", "recall", "roc_auc"]
    }


def select_model(results: dict) -> str:
    """Selection rule (documented, not "pick highest accuracy"):

    Primary criterion: F1-score on the spam class on the held-out test set.
    F1 balances precision (avoiding ham wrongly flagged as spam -- a costly
    false positive in a real mail system) and recall (avoiding spam reaching
    the inbox), which is more appropriate than raw accuracy on this
    imbalanced dataset (~87% ham). Ties within 0.01 F1 are broken in favor of
    the simpler, more interpretable model (Multinomial Naive Bayes), since
    added complexity should earn its keep.
    """
    ranked = sorted(results.items(), key=lambda kv: kv[1]["test_metrics"]["f1_spam"], reverse=True)
    best_name, best_result = ranked[0]
    for name, result in ranked[1:]:
        if best_result["test_metrics"]["f1_spam"] - result["test_metrics"]["f1_spam"] <= 0.01:
            if name == "multinomial_nb":
                return name
    return best_name


def main():
    print("=" * 70)
    print("STEP 1: Load raw dataset")
    raw_df = load_raw_dataset()
    raw_stats = inspect_dataset(raw_df)
    print(json.dumps(raw_stats, indent=2))

    print("\nSTEP 2: Clean labels / text, drop duplicates")
    df = clean_labels(raw_df)
    print(f"Rows after cleaning: {len(df)} (removed {len(raw_df) - len(df)} rows: "
          f"empty text and/or exact duplicates)")
    class_dist = df["label"].value_counts().to_dict()
    class_dist_pct = (df["label"].value_counts(normalize=True) * 100).round(2).to_dict()
    print(f"Class distribution: {class_dist} | {class_dist_pct}")

    print("\nSTEP 3: Stratified train/test split (test_size=%.2f, random_state=%d)"
          % (TEST_SIZE, RANDOM_STATE))
    X = df["text"]
    y = df["is_spam"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    print(f"Train: {len(X_train)} rows | Test: {len(X_test)} rows")
    print(f"Train class balance: {y_train.value_counts(normalize=True).round(3).to_dict()}")
    print(f"Test class balance:  {y_test.value_counts(normalize=True).round(3).to_dict()}")

    print("\nSTEP 4-6: Fit TF-IDF + candidate classifiers (TF-IDF fit on TRAIN ONLY, "
          "inside a Pipeline, then applied to test)")
    candidates = build_candidates()
    results = {}
    fitted_pipelines = {}

    for name, clf in candidates.items():
        print(f"\n--- Candidate: {name} ---")
        pipeline = Pipeline([("tfidf", build_vectorizer()), ("clf", clf)])
        pipeline.fit(X_train, y_train)
        test_metrics = evaluate(pipeline, X_test, y_test)
        cv_metrics = cross_validate_on_training_split(
            Pipeline([("tfidf", build_vectorizer()), ("clf", candidates_fresh(name))]),
            X_train, y_train,
        )
        results[name] = {"test_metrics": test_metrics, "cv_metrics": cv_metrics}
        fitted_pipelines[name] = pipeline
        print(f"Test  accuracy={test_metrics['accuracy']:.4f}  "
              f"precision(spam)={test_metrics['precision_spam']:.4f}  "
              f"recall(spam)={test_metrics['recall_spam']:.4f}  "
              f"f1(spam)={test_metrics['f1_spam']:.4f}  "
              f"roc_auc={test_metrics['roc_auc']:.4f}")
        print(f"CV(train) f1_mean={cv_metrics['cv_f1_mean']:.4f} "
              f"(+/- {cv_metrics['cv_f1_std']:.4f})")

    print("\nSTEP 7: Select model")
    selected_name = select_model(results)
    print(f"Selected model: {selected_name}")
    selected_pipeline = fitted_pipelines[selected_name]
    selected_metrics = results[selected_name]

    print("\nSTEP 8: Persist selected model + metrics")
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    model_path = MODELS_DIR / "spam_classifier.joblib"
    joblib.dump(selected_pipeline, model_path)
    print(f"Saved model pipeline to {model_path}")

    metrics_out = {
        "selected_model": selected_name,
        "selection_rule": (
            "Highest F1-score on the spam class on the held-out test set; ties "
            "within 0.01 broken in favor of the simpler model (MultinomialNB)."
        ),
        "dataset": {
            "raw_stats": raw_stats,
            "rows_after_cleaning": int(len(df)),
            "class_distribution_counts": class_dist,
            "class_distribution_pct": class_dist_pct,
            "train_size": int(len(X_train)),
            "test_size": int(len(X_test)),
            "random_state": RANDOM_STATE,
        },
        "test_metrics": selected_metrics["test_metrics"],
        "cv_metrics": selected_metrics["cv_metrics"],
    }
    with open(MODELS_DIR / "metrics.json", "w") as f:
        json.dump(metrics_out, f, indent=2)
    print(f"Saved metrics to {MODELS_DIR / 'metrics.json'}")

    comparison_out = {
        name: {"test_metrics": r["test_metrics"], "cv_metrics": r["cv_metrics"]}
        for name, r in results.items()
    }
    comparison_out["selected_model"] = selected_name
    with open(REPORTS_DIR / "model_comparison.json", "w") as f:
        json.dump(comparison_out, f, indent=2)
    print(f"Saved full comparison to {REPORTS_DIR / 'model_comparison.json'}")

    print("\n" + "=" * 70)
    print("DONE")


def candidates_fresh(name: str):
    """Return a brand-new (unfitted) estimator instance for the given
    candidate name, used so cross_validate fits fresh clones per fold instead
    of reusing an already-fitted estimator."""
    return build_candidates()[name]


if __name__ == "__main__":
    main()
