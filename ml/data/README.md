# Dataset

**Name:** SMS Spam Collection v.1
**Source:** UCI Machine Learning Repository — https://archive.ics.uci.edu/dataset/228/sms+spam+collection
**Original compilers:** Tiago A. Almeida and José María Gómez Hidalgo
**Citation:** Almeida, T.A., Gómez Hidalgo, J.M., Yamakami, A. *Contributions to the Study of SMS Spam Filtering: New Collection and Results.* Proceedings of the 2011 ACM Symposium on Document Engineering (DOCENG'11).

## Why this dataset

The assignment targets "email spam detection." No small, cleanly-labeled, reliably-downloadable raw *email* corpus exists without added complexity (MIME/header parsing, encoding issues, inconsistent mirrors — e.g. Enron-Spam, SpamAssassin public corpus). The SMS Spam Collection is the standard, peer-reviewed, widely cited academic dataset for short-text spam classification and uses the same core NLP pipeline (text cleaning → TF-IDF → classifier) that a real email-body spam filter would use. This is a **documented design decision, not a hidden substitution** — see "Limitations" in the top-level README.

## Files

- `raw/SMSSpamCollection` — tab-separated file, one message per line: `<label>\t<text>`
- `raw/readme` — original dataset documentation from UCI

## Statistics (verified by direct inspection, not copied from the source documentation)

- Total raw messages: **5,574** (matches the source documentation exactly)
- `ham` (legitimate): **4,827** (86.62%)
- `spam`: **747** (13.40%)
- No missing labels or missing text found in the raw file.
- **Parsing note (found during inspection, fixed in code):** the file is plain
  tab-separated text, not CSV. Reading it with pandas' default CSV quoting
  rules silently merges lines for the small number of messages that contain a
  stray `"` character (pandas treats it as an opening quote and consumes
  subsequent lines looking for a closing one), dropping 2 real rows (5574 →
  5572). `ml/src/data_loading.py` loads the file with `quoting=csv.QUOTE_NONE`
  to avoid this.
- After cleaning (see below): **5,171** rows — 403 exact duplicate
  `(label, text)` rows removed.
- Post-cleaning class distribution: `ham` **4,518** (87.37%), `spam` **653**
  (12.63%).
- Classes are imbalanced (~6.9:1 ham:spam) — handled in the ML pipeline via
  stratified train/test splitting and by evaluating with precision/recall/F1
  per class rather than relying on accuracy alone.

## Label / target column

The target is a binary label: `spam` vs `ham`. It is normalized in code to `is_spam` (1 = spam, 0 = ham).
