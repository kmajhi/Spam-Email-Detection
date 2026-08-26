"""Dataset loading, inspection, and cleaning for the SMS Spam Collection dataset.

See ml/data/README.md for dataset provenance and documented statistics.
"""
import csv
from pathlib import Path

import pandas as pd

RAW_PATH = Path(__file__).resolve().parents[1] / "data" / "raw" / "SMSSpamCollection"

VALID_LABELS = {"ham", "spam"}


def load_raw_dataset(path: Path = RAW_PATH) -> pd.DataFrame:
    """Load the raw tab-separated dataset into a DataFrame with columns
    ['label', 'text']. Does not perform any cleaning."""
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found at {path}. See ml/data/README.md for the source "
            "and how to obtain it."
        )
    # quoting=csv.QUOTE_NONE: this file is plain tab-separated text, not CSV.
    # Some messages contain a stray `"` character; pandas' default quoting
    # mode treats that as the start of a quoted field and silently merges it
    # with the following line(s), losing rows (verified: default quoting
    # loads 5572 rows instead of the true 5574 -- 2 real messages swallowed).
    df = pd.read_csv(
        path, sep="\t", header=None, names=["label", "text"],
        encoding="utf-8", quoting=csv.QUOTE_NONE,
    )
    return df


def inspect_dataset(df: pd.DataFrame) -> dict:
    """Return basic structural facts about the raw dataset (used for the
    training report; not used to alter the data)."""
    return {
        "n_rows": int(len(df)),
        "n_missing_label": int(df["label"].isna().sum()),
        "n_missing_text": int(df["text"].isna().sum()),
        "label_value_counts": df["label"].value_counts(dropna=False).to_dict(),
        "n_exact_duplicate_rows": int(df.duplicated(subset=["label", "text"]).sum()),
    }


def clean_labels(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize labels, drop empty/invalid rows and exact duplicates, and add
    the binary target column `is_spam` (1 = spam, 0 = ham).

    Raises if any label value outside {'ham', 'spam'} is encountered rather
    than silently coercing it, so unexpected data does not pass through
    unnoticed.
    """
    df = df.copy()
    df["label"] = df["label"].astype(str).str.strip().str.lower()
    df["text"] = df["text"].astype(str)

    invalid_mask = ~df["label"].isin(VALID_LABELS)
    if invalid_mask.any():
        bad_values = df.loc[invalid_mask, "label"].unique().tolist()
        raise ValueError(f"Found {int(invalid_mask.sum())} row(s) with unexpected label "
                          f"values: {bad_values}")

    df = df[df["text"].str.strip() != ""]
    df = df.drop_duplicates(subset=["label", "text"])
    df["is_spam"] = (df["label"] == "spam").astype(int)
    return df.reset_index(drop=True)
