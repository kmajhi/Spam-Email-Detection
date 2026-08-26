# Spam Email Detection Web Application

An AI Lab project: a web app that classifies pasted email/message text as **SPAM** or **NOT SPAM**
using a genuine, trained scikit-learn machine-learning pipeline — not keyword matching, not an LLM.

## 1. Project overview

- **Frontend:** React + Vite — paste text, click Analyze, see a clear SPAM/NOT SPAM result with a
  confidence score.
- **Backend:** Django + Django REST Framework — a stateless `POST /api/predict/` endpoint.
- **ML:** scikit-learn TF-IDF + a calibrated Linear SVM, trained once offline and loaded by Django
  at request time (never retrained per-request or on server startup).

## 2. Features

- Paste/type an email or message and get an instant spam/not-spam classification.
- Confidence score (calibrated probability) shown with a visual bar.
- "Try an example" quick-fill buttons (one spam-like, one legitimate) for demoing.
- A "Model & methodology" panel showing the **real**, trained-model evaluation metrics (not
  hardcoded), fetched from `GET /api/model-info/`.
- Loading state, empty state, and clear (non-leaky) error messages for backend/network failures.
- Input validation: empty text, missing field, and oversized input (>20,000 chars) are all rejected
  with a 400 and a human-readable message, both client- and server-side.

## 3. Technology stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 19, Vite, plain JavaScript (no TypeScript — kept simple for this project's scope), CSS (no UI framework) |
| Backend    | Python, Django 5.2, Django REST Framework |
| ML         | pandas, NumPy, scikit-learn (TF-IDF + LinearSVC/CalibratedClassifierCV), joblib |
| Database   | SQLite (Django's default auth/admin tables only — no application data is persisted; predictions are stateless) |
| Comms      | REST API (JSON) over HTTP, CORS-restricted to the Vite dev origin |

No Docker, Kubernetes, microservices, Redis, or Celery — deliberately out of scope for a lab project
of this size, per the assignment's own guidance.

## 4. Project architecture

```
Test Claude code/
├── ml/                         # Machine-learning pipeline (framework-agnostic)
│   ├── data/
│   │   ├── raw/                # SMSSpamCollection (downloaded dataset) + original readme
│   │   └── README.md           # Dataset provenance, stats, and a documented parsing bug fix
│   ├── src/
│   │   ├── data_loading.py     # Load raw file, inspect, clean labels/text, dedupe
│   │   ├── preprocessing.py    # clean_text() — used identically at train AND inference time
│   │   ├── train.py            # Full pipeline: split → vectorize → train 3 candidates → evaluate → select → persist
│   │   ├── predict.py          # load_model() / predict_text() — imported by Django
│   │   └── predict_cli.py      # Quick manual sanity check from the command line
│   ├── models/
│   │   ├── spam_classifier.joblib   # The persisted, fitted sklearn Pipeline (TF-IDF + classifier)
│   │   └── metrics.json             # Real evaluation metrics for the persisted model
│   └── reports/
│       └── model_comparison.json    # Metrics for all 3 candidate models (for academic comparison)
├── backend/                    # Django project
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── spamdetector/           # Django project settings/urls
│   └── detector/                # Django app: the actual API
│       ├── views.py            # PredictView, ModelInfoView
│       ├── serializers.py      # Input validation
│       ├── ml_service.py       # Loads+caches the model once per process; wraps ml.src.predict
│       ├── exceptions.py       # Custom DRF exception handler — never leaks tracebacks/paths
│       ├── urls.py
│       └── tests.py            # 11 tests: happy paths, empty/malformed/oversized input, error leakage
└── frontend/                   # React + Vite app
    ├── package.json
    ├── .env.example
    └── src/
        ├── App.jsx             # Main UI: textarea, analyze button, result, examples
        ├── api.js              # fetch wrappers for /api/predict/ and /api/model-info/
        └── components/
            ├── ResultCard.jsx      # SPAM / NOT SPAM result + confidence bar
            └── ModelInfoPanel.jsx  # Collapsible methodology/metrics panel
```

The `ml/` package is imported directly by Django (`backend/detector/ml_service.py`) rather than run
as a separate ML microservice — this is the "integrate into Django, don't build an extra server"
approach the assignment specifies.

## 5. Dataset

**SMS Spam Collection v.1** — UCI Machine Learning Repository.
https://archive.ics.uci.edu/dataset/228/sms+spam+collection
Citation: Almeida, T.A., Gómez Hidalgo, J.M., Yamakami, A. *Contributions to the Study of SMS Spam
Filtering: New Collection and Results.* ACM DOCENG'11.

- **Raw size:** 5,574 messages — 4,827 ham (86.6%) / 747 spam (13.4%).
- **After cleaning:** 5,171 messages (403 exact duplicate rows removed) — 4,518 ham (87.4%) / 653
  spam (12.6%).
- **Why SMS text, not raw email files:** documented explicitly as a design decision in
  `ml/data/README.md` and in Limitations below — no comparably clean, reliably-downloadable email
  corpus exists without added MIME-parsing complexity, and this dataset is the standard academic
  benchmark for the same underlying text-classification task.
- **A real bug found and fixed during inspection:** pandas' default CSV quoting rules silently
  merged two message lines that contained a stray `"` character (5574 → 5572 rows). Fixed by
  loading with `quoting=csv.QUOTE_NONE` in `ml/src/data_loading.py`, since the file is
  tab-separated plain text, not CSV.

## 6. Machine-learning methodology

```
raw TSV file
  → load (quoting=QUOTE_NONE)
  → normalize labels, drop empty text, drop exact duplicates → is_spam target
  → stratified train/test split (80/20, random_state=42)
  → TfidfVectorizer FIT ON TRAINING SPLIT ONLY (inside an sklearn Pipeline)
  → transform train & test with that fitted vectorizer
  → fit each candidate classifier on the training split
  → evaluate every candidate on the untouched test split
  → 5-fold stratified CV, computed ONLY on the training split, for robustness/variance
  → select one model by a documented rule (not "highest accuracy")
  → persist the exact fitted Pipeline that was evaluated (joblib)
```

Because the TF-IDF vectorizer and the classifier live in the same `sklearn.pipeline.Pipeline` and
that whole object is fit only on the training split, the test set can never leak into feature
extraction or training — this was a specific, deliberate design choice to avoid data leakage.

### Preprocessing

`ml/src/preprocessing.py::clean_text()` — lowercases text, replaces URLs/email addresses/numbers
with placeholder tokens (their *presence* is a spam signal, so they're masked, not deleted), strips
remaining punctuation, collapses whitespace. This function is stored as the TF-IDF vectorizer's
`preprocessor`, so it is impossible for training-time and inference-time cleaning to drift apart —
there is exactly one implementation, used both places.

English stopword removal is handled by `TfidfVectorizer(stop_words="english")` rather than an added
NLTK dependency, to keep the environment reproducible without extra corpus downloads.

### Feature extraction

TF-IDF (`TfidfVectorizer`): unigrams + bigrams (`ngram_range=(1,2)`), `min_df=2`, `max_df=0.95`,
sublinear TF scaling. Bigrams were included because spam-indicative phrases ("free entry", "claim
now", "text stop") are often more informative than single words.

### Model selection

Three candidates were trained and evaluated identically (same TF-IDF settings, same split):

| Model | Test Accuracy | Precision (spam) | Recall (spam) | F1 (spam) | ROC-AUC |
|---|---|---|---|---|---|
| Multinomial Naive Bayes | 97.58% | **100.0%** | 80.92% | 89.45% | 0.9918 |
| Logistic Regression | 97.29% | 96.40% | 81.68% | 88.43% | 0.9941 |
| **Linear SVM (Platt-calibrated)** | **98.65%** | 97.56% | **91.60%** | **94.49%** | **0.9973** |

**Selection rule (not "pick the highest accuracy"):** the model with the highest **F1-score on the
spam class** on the held-out test set is selected, with ties within 0.01 broken toward the simpler
Multinomial Naive Bayes model. F1 was chosen over raw accuracy because the dataset is imbalanced
(~87% ham); F1 balances precision (not wrongly flagging legitimate mail — a costly false positive in
a real mail system) against recall (not letting spam through). Linear SVM won outright, not by a
margin close enough to trigger the simplicity tie-break.

`LinearSVC` does not natively output probabilities, so it is wrapped in
`CalibratedClassifierCV(method="sigmoid", cv=5)` (Platt scaling) — a standard, legitimate scikit-learn
technique — so the API can return a meaningful confidence score. All three candidates were made to
expose `predict_proba` for a fair, apples-to-apples comparison.

## 7. Evaluation metrics (selected model: Linear SVM, Platt-calibrated)

All numbers below are read directly from `ml/models/metrics.json`, produced by actually running
`ml/src/train.py` — none are hand-typed or estimated.

- **Test set:** 1,035 messages (held out, never used in TF-IDF fitting or training)
- **Accuracy:** 98.65%
- **Precision (spam):** 97.56%
- **Recall (spam):** 91.60%
- **F1-score (spam):** 94.49%
- **ROC-AUC:** 0.9973
- **Confusion matrix** (rows = actual, cols = predicted):

  |            | Pred: ham | Pred: spam |
  |------------|-----------|------------|
  | **Actual: ham**  | 901 (TN) | 3 (FP)   |
  | **Actual: spam** | 11 (FN)  | 120 (TP) |

- **5-fold cross-validation on the training split** (mean ± std): F1 = 0.9474 ± 0.0206, accuracy =
  0.9869 ± 0.0049, ROC-AUC = 0.9919 ± 0.0032 — consistent with the held-out test result, i.e. the
  test-set score isn't a lucky split.

Full metrics for all three candidates are in `ml/reports/model_comparison.json`.

## 8. Installation

Requires Python 3.10+ and Node.js 18+.

```bash
# from the project root
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r backend/requirements.txt
```

```bash
cd frontend
npm install
```

## 9. Running the backend

```bash
cd backend
copy .env.example .env      # Windows; use `cp` on macOS/Linux — defaults work as-is for local dev
python manage.py migrate
python manage.py test detector   # optional: run the test suite
python manage.py runserver 127.0.0.1:8000
```

The API is now at `http://127.0.0.1:8000/api/`.

## 10. Running the frontend

```bash
cd frontend
copy .env.example .env      # optional — defaults to http://127.0.0.1:8000
npm run dev
```

Open `http://localhost:5173`. Both servers must be running for the app to work.

## 11. Training / retraining the model

The repo already includes a trained model (`ml/models/spam_classifier.joblib`), so this step is
**not required** to run the app. To retrain (e.g., after changing preprocessing or trying a new
model):

```bash
# from the project root, with the venv active
python -m ml.src.train
```

This regenerates `ml/models/spam_classifier.joblib`, `ml/models/metrics.json`, and
`ml/reports/model_comparison.json`. Restart the Django server afterward to pick up the new model
(it's loaded once and cached per process).

`python -m ml.src.predict_cli` runs a few hardcoded example predictions for a quick manual check.

## 12. API usage

### `POST /api/predict/`

Request:
```json
{ "text": "WINNER! You have been selected to receive a $1000 prize. Call now!" }
```

Response (200):
```json
{
  "prediction": "spam",
  "label": "SPAM",
  "is_spam": true,
  "confidence": 0.9978,
  "spam_probability": 0.9978,
  "ham_probability": 0.0022
}
```

Error response (400 — empty/missing/oversized text):
```json
{ "error": { "text": ["Email/message text must not be empty."] } }
```

### `GET /api/model-info/`

Returns the contents of `ml/models/metrics.json` (dataset stats, selected model, evaluation
metrics) — used by the frontend's methodology panel. Never fabricated; read from the actual
training run's output.

## 13. Example prediction (actually run against the live API)

```bash
curl -X POST http://127.0.0.1:8000/api/predict/ \
  -H "Content-Type: application/json" \
  -d '{"text": "WINNER!! You have been selected to receive a FREE $1000 gift card. Call 08001234567 now to claim your prize before it expires!"}'

# {"prediction":"spam","label":"SPAM","is_spam":true,"confidence":0.9978,"spam_probability":0.9978,"ham_probability":0.0022}
```

```bash
curl -X POST http://127.0.0.1:8000/api/predict/ \
  -H "Content-Type: application/json" \
  -d '{"text": "Hi Mom, just letting you know I landed safely. Talk soon!"}'

# {"prediction":"not_spam","label":"NOT SPAM","is_spam":false,"confidence":0.9957,"spam_probability":0.0043,"ham_probability":0.9957}
```

## 14. Deployment

The app is designed to deploy as **one single service**: Django serves the compiled React app
directly (via WhiteNoise) alongside the API, so there's one URL and one running process —
no separate frontend host, no CORS in production.

**Render (or any host running a Linux Python buildpack) — free tier:**

1. Push to GitHub (already done). `frontend/dist/` (the production build) is committed on purpose,
   since Render's Python environment has no Node.js — rebuild and commit it after any frontend
   change: `cd frontend && npm run build`.
2. Render dashboard → New Web Service → connect this repo.
3. **Root Directory:** leave blank (repo root).
4. **Build Command:**
   ```
   pip install -r backend/requirements.txt && cd backend && python manage.py collectstatic --noinput && python manage.py migrate
   ```
5. **Start Command:**
   ```
   cd backend && gunicorn spamdetector.wsgi:application --bind 0.0.0.0:$PORT
   ```
6. **Environment variables:**
   - `DJANGO_SECRET_KEY` — any long random string (Render can generate one)
   - `DJANGO_DEBUG` — `False`
   - `PYTHON_VERSION` — `3.13.0` (or similar; avoids picking an untested version)

   `ALLOWED_HOSTS`/`CSRF_TRUSTED_ORIGINS` are handled automatically via Render's
   `RENDER_EXTERNAL_HOSTNAME` env var (see `backend/spamdetector/settings.py`) — no need to set
   `DJANGO_ALLOWED_HOSTS` manually.
7. Deploy. Visit the `https://<your-service>.onrender.com` URL Render gives you — the whole app
   (UI + API) runs from that one address.

To create an admin login on the deployed instance, use Render's shell tab:
`cd backend && python manage.py createsuperuser`.

**Note (free tier):** Render's free web services spin down after 15 minutes of inactivity and take
~30-60s to wake on the next request — expect a slow first load after idle periods. This is a
platform limitation, not an app bug.

## 15. Limitations

- **Trained on SMS text, not raw email.** The linguistic style (headers, HTML, long body text,
  quoted threads) of real email differs from SMS. The model generalizes reasonably to short,
  promotional-style email bodies but was not trained or evaluated on full email files with headers/
  attachments/HTML.
- **No adversarial robustness.** The model was not tested against deliberately obfuscated spam
  (e.g., l33tspeak, zero-width characters) — a determined spammer could likely evade it.
  This is standard for a classical TF-IDF + linear classifier and is a known limitation of the
  approach, not a bug.
- **English only.** Stopword removal and the training data are English-only.
- **Fixed decision threshold (0.5).** No cost-sensitive threshold tuning was performed; recall on
  spam (91.6%) is lower than precision (97.6%), meaning some spam will be missed rather than
  legitimate mail being wrongly blocked. This was a deliberate choice discussed above, not an
  accident.
- **SQLite / single-process dev setup.** No production deployment configuration (WSGI server,
  process manager, HTTPS) is included — this is a local development/demonstration setup only, as
  specified for this assignment.
- **Live narrow-viewport (mobile) rendering was not confirmed via automated browser screenshot** in
  this development environment — the browser automation tool's window-resize did not take effect in
  the sandbox used during testing (`window.innerWidth` stayed at the desktop value after resize).
  The responsive CSS (`frontend/src/App.css`, a single `@media (min-width: 720px)` grid breakpoint)
  was verified by code review and by `npm run build` succeeding; it has not been visually confirmed
  at phone width. Recommend a manual check with the browser's device toolbar before presenting.

## 16. Future improvements

- Add an email-specific dataset (e.g., a parsed subset of Enron-Spam/SpamAssassin) to compare
  generalization from SMS-trained to email-trained models.
- Cost-sensitive threshold tuning (optimize the decision threshold for a chosen precision/recall
  trade-off rather than the default 0.5).
- Show top contributing TF-IDF features/coefficients for a given prediction as a genuine
  explanation (deliberately omitted here rather than fabricated — see `ml/src/train.py` for the
  model internals if this is added later).
- Basic rate limiting is already in place (60 requests/min per client via DRF throttling); a
  production deployment would need HTTPS, a real WSGI server, and secret management.

---

*This README describes only what the project actually does. Every metric above was produced by
running `ml/src/train.py` against the dataset in `ml/data/raw/` — none are estimated or invented.*
