import { useEffect, useRef, useState } from "react";
import "./HowItsBuilt.css";
import { fetchModelInfo } from "../api";

const NAV_SECTIONS = [
  { id: "overview", num: "01", label: "Overview" },
  { id: "architecture", num: "02", label: "Architecture" },
  { id: "structure", num: "03", label: "Structure" },
  { id: "data", num: "04", label: "Data & Method" },
  { id: "results", num: "05", label: "Results" },
  { id: "code", num: "06", label: "Code" },
  { id: "api", num: "07", label: "API" },
  { id: "stack", num: "08", label: "Stack" },
  { id: "deployment", num: "09", label: "Deployment" },
  { id: "limitations", num: "10", label: "Limitations" },
  { id: "references", num: "11", label: "References" },
];

export const SECTION_IDS = NAV_SECTIONS.map((s) => s.id);

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  // Use replaceState (not a hash assignment) so this never fires a
  // `hashchange` event — the top-level router only listens for that
  // event to switch between the Detector and How-It's-Built pages, and
  // an in-page jump like this must not be mistaken for a page change.
  history.replaceState(null, "", `#${id}`);
}

function jumpTo(id) {
  return (e) => {
    e.preventDefault();
    scrollToId(id);
  };
}

const REFERENCES = [
  {
    n: 1,
    text: "Almeida, T. A., Gómez Hidalgo, J. M., & Yamakami, A. (2011). Contributions to the study of SMS spam filtering: new collection and results. Proceedings of the 11th ACM Symposium on Document Engineering (DocEng '11).",
    url: "https://archive.ics.uci.edu/dataset/228/sms+spam+collection",
  },
  {
    n: 2,
    text: "Pedregosa, F., Varoquaux, G., Gramfort, A., et al. (2011). Scikit-learn: machine learning in Python. Journal of Machine Learning Research, 12, 2825–2830.",
    url: "https://scikit-learn.org/",
  },
  {
    n: 3,
    text: "Platt, J. C. (1999). Probabilistic outputs for support vector machines and comparisons to regularized likelihood methods. Advances in Large Margin Classifiers, MIT Press.",
    url: null,
  },
  {
    n: 4,
    text: "Cortes, C., & Vapnik, V. (1995). Support-vector networks. Machine Learning, 20(3), 273–297.",
    url: null,
  },
  {
    n: 5,
    text: "Salton, G., & Buckley, C. (1988). Term-weighting approaches in automatic text retrieval. Information Processing & Management, 24(5), 513–523.",
    url: null,
  },
  {
    n: 6,
    text: "Django Software Foundation. Django web framework, v5.2.",
    url: "https://www.djangoproject.com/",
  },
  {
    n: 7,
    text: "Encode OSS Ltd. Django REST Framework.",
    url: "https://www.django-rest-framework.org/",
  },
  {
    n: 8,
    text: "React core team, Meta Platforms, Inc. React — a JavaScript library for building user interfaces, v19.",
    url: "https://react.dev/",
  },
  {
    n: 9,
    text: "You, E., et al. Vite — next generation frontend tooling.",
    url: "https://vitejs.dev/",
  },
  {
    n: 10,
    text: "Render Services, Inc. Render cloud application hosting.",
    url: "https://render.com/",
  },
];

const FALLBACK_METRICS = {
  rows_after_cleaning: 5171,
  spam: 653,
  ham: 4518,
  accuracy: 0.9865,
  precision_spam: 0.9756,
  recall_spam: 0.916,
  f1_spam: 0.9449,
  roc_auc: 0.9973,
};

function Cite({ n }) {
  return (
    <sup className="cite">
      <a href={`#ref-${n}`} onClick={jumpTo(`ref-${n}`)}>[{n}]</a>
    </sup>
  );
}

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    function onScroll() {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      setProgress(scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return progress;
}

function Section({ id, num, eyebrow, title, lede, children, alt }) {
  const [ref, visible] = useReveal();
  return (
    <section
      id={id}
      ref={ref}
      className={`hib-section ${alt ? "hib-section--alt" : ""} ${
        visible ? "hib-section--visible" : ""
      }`}
    >
      <div className="hib-section__inner">
        <p className="hib-eyebrow">
          {num} · {eyebrow}
        </p>
        {title && <h2 className="hib-heading">{title}</h2>}
        {lede && <p className="hib-lede">{lede}</p>}
        {children}
      </div>
    </section>
  );
}

export default function HowItsBuilt() {
  const progress = useScrollProgress();
  const active = useActiveSection(SECTION_IDS);
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState(false);

  useEffect(() => {
    fetchModelInfo()
      .then(setMetrics)
      .catch(() => setMetricsError(true));
  }, []);

  useEffect(() => {
    const h = window.location.hash.replace(/^#\/?/, "");
    if (h && h !== "how-its-built") {
      requestAnimationFrame(() => scrollToId(h));
    }
  }, []);

  const m = metrics
    ? {
        rows: metrics.dataset.rows_after_cleaning,
        spam: metrics.dataset.class_distribution_counts.spam,
        ham: metrics.dataset.class_distribution_counts.ham,
        accuracy: metrics.test_metrics.accuracy,
        precision: metrics.test_metrics.precision_spam,
        recall: metrics.test_metrics.recall_spam,
        f1: metrics.test_metrics.f1_spam,
        rocAuc: metrics.test_metrics.roc_auc,
      }
    : {
        rows: FALLBACK_METRICS.rows_after_cleaning,
        spam: FALLBACK_METRICS.spam,
        ham: FALLBACK_METRICS.ham,
        accuracy: FALLBACK_METRICS.accuracy,
        precision: FALLBACK_METRICS.precision_spam,
        recall: FALLBACK_METRICS.recall_spam,
        f1: FALLBACK_METRICS.f1_spam,
        rocAuc: FALLBACK_METRICS.roc_auc,
      };
  const pct = (v) => `${(v * 100).toFixed(2)}%`;

  return (
    <div className="hib">
      <div className="hib-progress" style={{ width: `${progress}%` }} />

      <nav className="hib-dotnav" aria-label="Section navigation">
        {NAV_SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={jumpTo(s.id)}
            className={`hib-dotnav__item ${active === s.id ? "hib-dotnav__item--active" : ""}`}
          >
            <span className="hib-dotnav__dot" />
            <span className="hib-dotnav__label">{s.label}</span>
          </a>
        ))}
      </nav>

      {/* ---------- Hero ---------- */}
      <section className="hib-hero">
        <div className="hib-hero__inner">
          <p className="hib-eyebrow">AI LAB · ENGINEERING WALKTHROUGH</p>
          <h1>How It's Built</h1>
          <p className="hib-hero__lede">
            A guided tour of the Spam Email Detection app: the end-to-end request
            flow, the project structure, and the frontend, backend, and machine-learning
            code that make the classifier work — plus the real, measured results behind it.
          </p>
          <div className="hib-hero__tags">
            <span>react</span>
            <span>django rest framework</span>
            <span>scikit-learn</span>
            <span>vite</span>
          </div>
          <div className="hib-hero__actions">
            <a className="hib-btn hib-btn--primary" href="#/">
              Try the detector
            </a>
            <a
              className="hib-btn hib-btn--ghost"
              href="https://github.com/kmajhi/Spam-Email-Detection"
              target="_blank"
              rel="noopener noreferrer"
            >
              View source on GitHub
            </a>
          </div>
        </div>
        <div className="hib-hero__scrollcue" aria-hidden="true">
          scroll
          <span className="hib-hero__scrollcue-line" />
        </div>
      </section>

      {/* ---------- 01 Overview ---------- */}
      <Section
        id="overview"
        num="01"
        eyebrow="OVERVIEW"
        title="A genuine trained classifier, not keyword matching."
        lede="Rule lists break the moment wording changes. This project trains a real
          supervised model that learns spam-indicative language from labeled data, then
          serves it through a small, stateless web app — with the same rigor a production
          system would demand."
      >
        <div className="hib-grid-2">
          <div className="hib-card">
            <h3>In scope</h3>
            <ul>
              <li>Train on a real, cited dataset — not synthetic examples</li>
              <li>A leakage-safe pipeline: test data never touches feature fitting</li>
              <li>Compare candidate models and select one by a documented rule</li>
              <li>A working, deployed UI + API — reachable right now</li>
            </ul>
          </div>
          <div className="hib-card hib-card--muted">
            <h3>Deliberately out of scope</h3>
            <ul>
              <li>Deep learning or LLM-based classification</li>
              <li>Hardcoded spam-word lists as the actual detector</li>
              <li>Fabricated metrics, results, or explanations</li>
              <li>Docker, Kubernetes, Redis, Celery — unnecessary at this scale</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* ---------- 02 Architecture ---------- */}
      <Section
        id="architecture"
        num="02"
        eyebrow="ARCHITECTURE"
        title="One request, three layers, no wasted hops."
        alt
      >
        <div className="hib-flow">
          <div className="hib-flow__stage">
            <strong>Browser</strong>
            <code>App.jsx</code>
          </div>
          <div className="hib-flow__arrow">
            <span>→</span>
            <small>POST /api/predict/</small>
          </div>
          <div className="hib-flow__stage">
            <strong>Django REST API</strong>
            <code>views.py · serializers.py</code>
          </div>
          <div className="hib-flow__arrow">
            <span>→</span>
            <small>clean_text() → TF-IDF → SVM</small>
          </div>
          <div className="hib-flow__stage">
            <strong>ML Service</strong>
            <code>ml_service.py · predict.py</code>
          </div>
          <div className="hib-flow__arrow">
            <span>→</span>
            <small>JSON {"{"}label, confidence{"}"}</small>
          </div>
          <div className="hib-flow__stage">
            <strong>Rendered result</strong>
            <code>ResultCard.jsx</code>
          </div>
        </div>

        <ol className="hib-steps">
          <li>User pastes text and clicks Analyze.</li>
          <li>
            <code>api.js</code> sends it to the API; <code>serializers.py</code> rejects
            empty, missing, or over-20,000-character text before it reaches the model.
          </li>
          <li>
            <code>ml_service.py</code> hands the text to <code>predict.py</code>, which runs
            it through the cached, already-fitted scikit-learn <Cite n={2} /> pipeline.
          </li>
          <li>The JSON response renders as a SPAM / NOT SPAM label with a confidence bar.</li>
        </ol>
        <p className="hib-note">
          The model is loaded once when the Django process starts and reused for every
          request — never retrained or reloaded per request. No message text is ever
          persisted; the only database traffic is Django's own admin/auth tables.
        </p>
      </Section>

      {/* ---------- 03 Structure ---------- */}
      <Section
        id="structure"
        num="03"
        eyebrow="PROJECT STRUCTURE"
        title="Three packages, one clear job each."
      >
        <div className="hib-tree-grid">
          <div className="hib-tree-col">
            <h3>ml/</h3>
            <ul>
              <li><code>data/raw/</code><span>SMS Spam Collection dataset <Cite n={1} /></span></li>
              <li><code>src/preprocessing.py</code><span>clean_text() — train &amp; inference</span></li>
              <li><code>src/train.py</code><span>split → vectorize → train → select → persist</span></li>
              <li><code>src/predict.py</code><span>load_model() / predict_text()</span></li>
              <li><code>models/*.joblib, metrics.json</code><span>fitted pipeline + real metrics</span></li>
            </ul>
          </div>
          <div className="hib-tree-col">
            <h3>backend/</h3>
            <ul>
              <li><code>spamdetector/</code><span>Django settings &amp; urls</span></li>
              <li><code>detector/views.py</code><span>PredictView, ModelInfoView</span></li>
              <li><code>detector/serializers.py</code><span>input validation</span></li>
              <li><code>detector/ml_service.py</code><span>loads + caches model once</span></li>
              <li><code>detector/exceptions.py</code><span>no traceback/path leakage</span></li>
              <li><code>detector/tests.py</code><span>11 tests</span></li>
            </ul>
          </div>
          <div className="hib-tree-col">
            <h3>frontend/</h3>
            <ul>
              <li><code>src/pages/Detector.jsx</code><span>textarea, analyze button, result</span></li>
              <li><code>src/pages/HowItsBuilt.jsx</code><span>this page</span></li>
              <li><code>src/api.js</code><span>fetch wrappers for both endpoints</span></li>
              <li><code>src/components/ResultCard.jsx</code><span>SPAM/NOT SPAM + confidence bar</span></li>
              <li><code>src/components/ModelInfoPanel.jsx</code><span>collapsible metrics panel</span></li>
            </ul>
          </div>
        </div>
        <p className="hib-note">
          <code>ml/</code> is a plain Python package imported directly by Django — not a
          separate ML microservice.
        </p>
      </Section>

      {/* ---------- 04 Data & Method ---------- */}
      <Section
        id="data"
        num="04"
        eyebrow="DATA & METHOD"
        title="A cited dataset, cleaned honestly."
        alt
      >
        <div className="hib-grid-2">
          <div>
            <div className="hib-stat-row">
              <div className="hib-stat">
                <strong>5,574 → 5,171</strong>
                <span>messages, raw → cleaned</span>
              </div>
              <div className="hib-stat">
                <strong>87.4% / 12.6%</strong>
                <span>ham / spam split</span>
              </div>
            </div>
            <p className="hib-body">
              <strong>UCI SMS Spam Collection</strong> <Cite n={1} /> — 403 exact-duplicate
              rows were removed during cleaning.
            </p>
            <div className="hib-callout">
              <strong>A real bug, really fixed:</strong> pandas' default CSV quoting
              silently merged two messages that contained a stray <code>"</code> character.
              Caught during inspection, fixed by loading with <code>quoting=csv.QUOTE_NONE</code>,
              since the file is tab-separated plain text, not CSV.
            </div>
          </div>
          <ol className="hib-pipeline">
            <li>Clean labels, drop duplicates &amp; empty rows</li>
            <li>Stratified 80/20 train/test split</li>
            <li>
              TF-IDF <Cite n={5} /> fit on the training split only
            </li>
            <li>Train 3 candidate models</li>
            <li>Evaluate on the held-out test set</li>
            <li>Select the winner by F1 on the spam class</li>
          </ol>
        </div>
      </Section>

      {/* ---------- 05 Results ---------- */}
      <Section
        id="results"
        num="05"
        eyebrow="RESULTS"
        title="Three models, one honest comparison."
      >
        <div className="hib-table-wrap">
          <table className="hib-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Accuracy</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>F1 (spam)</th>
                <th>ROC-AUC</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Multinomial Naive Bayes</td>
                <td>97.58%</td>
                <td>100.0%</td>
                <td>80.92%</td>
                <td>89.45%</td>
                <td>0.9918</td>
              </tr>
              <tr>
                <td>Logistic Regression</td>
                <td>97.29%</td>
                <td>96.40%</td>
                <td>81.68%</td>
                <td>88.43%</td>
                <td>0.9941</td>
              </tr>
              <tr className="hib-table__selected">
                <td>
                  Linear SVM, Platt-calibrated <Cite n={4} /> <Cite n={3} />
                </td>
                <td>98.65%</td>
                <td>97.56%</td>
                <td>91.60%</td>
                <td>94.49%</td>
                <td>0.9973</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="hib-note">
          Selected by highest F1 on the spam class — not raw accuracy — because the
          dataset is imbalanced (~87% ham). Confirmed by 5-fold cross-validation:
          F1 = 94.7% ± 2.1%.
        </p>

        <div className="hib-live">
          <div className="hib-live__header">
            <span className="hib-live__dot" data-ok={!metricsError} />
            {metricsError
              ? "Live metrics unavailable — showing figures from ml/models/metrics.json"
              : metrics
              ? "Live from GET /api/model-info/ — the same endpoint the app itself calls"
              : "Loading live metrics…"}
          </div>
          <div className="hib-metrics-grid">
            <div>
              <dt>Test set</dt>
              <dd>{m.rows.toLocaleString()} msgs ({m.spam} spam / {m.ham} ham)</dd>
            </div>
            <div>
              <dt>Accuracy</dt>
              <dd>{pct(m.accuracy)}</dd>
            </div>
            <div>
              <dt>Precision (spam)</dt>
              <dd>{pct(m.precision)}</dd>
            </div>
            <div>
              <dt>Recall (spam)</dt>
              <dd>{pct(m.recall)}</dd>
            </div>
            <div>
              <dt>F1-score (spam)</dt>
              <dd>{pct(m.f1)}</dd>
            </div>
            <div>
              <dt>ROC-AUC</dt>
              <dd>{m.rocAuc.toFixed(4)}</dd>
            </div>
          </div>
        </div>
      </Section>

      {/* ---------- 06 Code ---------- */}
      <Section
        id="code"
        num="06"
        eyebrow="CODE WALKTHROUGH"
        title="One preprocessing function, used identically at train and inference time."
        alt
      >
        <div className="hib-code-grid">
          <div className="hib-card">
            <h3>Frontend</h3>
            <ul className="hib-file-list">
              <li><code>App.jsx</code>router shell (this page vs. the detector)</li>
              <li><code>pages/Detector.jsx</code>textarea, Analyze button, states</li>
              <li><code>api.js</code>fetch wrappers for both endpoints</li>
              <li><code>ResultCard.jsx</code>label + confidence bar</li>
              <li><code>ModelInfoPanel.jsx</code>live methodology panel</li>
            </ul>
          </div>
          <div className="hib-card">
            <h3>Backend</h3>
            <ul className="hib-file-list">
              <li><code>urls.py</code>routes /api/predict/, /api/model-info/</li>
              <li><code>serializers.py</code>rejects bad input with a 400</li>
              <li><code>views.py</code>PredictView, ModelInfoView</li>
              <li><code>ml_service.py</code>loads + caches the model once</li>
              <li><code>exceptions.py</code>never leaks tracebacks/paths</li>
            </ul>
          </div>
          <div className="hib-card">
            <h3>Machine learning</h3>
            <ul className="hib-file-list">
              <li><code>data_loading.py</code>load TSV, clean, dedupe</li>
              <li><code>preprocessing.py</code>clean_text() — one shared function</li>
              <li><code>train.py</code>fit → train 3 → evaluate → select → persist</li>
              <li><code>predict.py</code>load_model() / predict_text()</li>
            </ul>
          </div>
        </div>
        <p className="hib-note">
          <code>clean_text()</code> is stored as the TF-IDF vectorizer's own preprocessor —
          training and inference call the exact same function object. Drift between them
          is structurally impossible.
        </p>
      </Section>

      {/* ---------- 07 API ---------- */}
      <Section
        id="api"
        num="07"
        eyebrow="API CONTRACT"
        title="Two endpoints. JSON in, JSON out."
      >
        <div className="hib-grid-2">
          <pre className="hib-code-block">
{`POST /api/predict/

→ { "text": "..." }

← {
    "prediction": "spam",
    "label": "SPAM",
    "is_spam": true,
    "confidence": 0.9978
  }`}
          </pre>
          <pre className="hib-code-block">
{`GET /api/model-info/

← contents of ml/models/metrics.json:
    dataset stats, selected model,
    real evaluation metrics — used
    by the panel below the detector.`}
          </pre>
        </div>
        <pre className="hib-code-block hib-code-block--error">
{`400 (empty / missing / oversized text)

← { "error": { "text": ["Email/message text must not be empty."] } }`}
        </pre>
        <p className="hib-note">
          Errors always return a clear 400 message — never a stack trace or file path.
        </p>
      </Section>

      {/* ---------- 08 Stack ---------- */}
      <Section
        id="stack"
        num="08"
        eyebrow="TECH STACK"
        title="Four layers, deliberately minimal."
        alt
      >
        <div className="hib-table-wrap">
          <table className="hib-table hib-table--stack">
            <tbody>
              <tr>
                <td>Frontend</td>
                <td>
                  React <Cite n={8} />, Vite <Cite n={9} />, plain JavaScript, CSS (no UI framework)
                </td>
              </tr>
              <tr>
                <td>Backend</td>
                <td>
                  Python, Django 5.2 <Cite n={6} />, Django REST Framework <Cite n={7} />
                </td>
              </tr>
              <tr>
                <td>ML</td>
                <td>
                  pandas, NumPy, scikit-learn <Cite n={2} /> (TF-IDF + LinearSVC/CalibratedClassifierCV), joblib
                </td>
              </tr>
              <tr>
                <td>Database</td>
                <td>SQLite — Django admin/auth only; no application data persisted</td>
              </tr>
              <tr>
                <td>Comms</td>
                <td>REST API (JSON) over HTTP</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="hib-note">
          No Docker, Kubernetes, microservices, Redis, or Celery — deliberately out of
          scope for a lab project of this size.
        </p>
      </Section>

      {/* ---------- 09 Deployment ---------- */}
      <Section
        id="deployment"
        num="09"
        eyebrow="DEPLOYMENT"
        title="One process serves everything."
      >
        <div className="hib-deploy">
          <div className="hib-deploy__outer">gunicorn · spamdetector.wsgi:application</div>
          <div className="hib-deploy__inner">
            <div className="hib-deploy__box">
              <strong>WhiteNoise</strong>
              <span>serves frontend/dist/ (React build)</span>
            </div>
            <div className="hib-deploy__box">
              <strong>Django REST Framework</strong>
              <span>handles /api/*</span>
            </div>
          </div>
        </div>
        <p className="hib-body">
          One URL, one running process — no separate frontend host, no CORS in
          production. <code>frontend/dist/</code> is committed so Render's <Cite n={10} />{" "}
          Node-less Python buildpack can serve it as-is.
        </p>
        <p className="hib-note">
          Env vars: <code>DJANGO_SECRET_KEY</code>, <code>DJANGO_DEBUG=False</code>,{" "}
          <code>PYTHON_VERSION</code>. Free-tier note: the host sleeps after 15 min idle —
          first load may take 30–60s to wake up.
        </p>
      </Section>

      {/* ---------- 10 Limitations ---------- */}
      <Section
        id="limitations"
        num="10"
        eyebrow="LIMITATIONS & FUTURE WORK"
        title="What this is — and isn't."
        alt
      >
        <div className="hib-grid-2">
          <div className="hib-card hib-card--muted">
            <h3>Known limitations</h3>
            <ul>
              <li>Trained on SMS text, not full raw email (headers/HTML)</li>
              <li>No adversarial-obfuscation testing</li>
              <li>English only</li>
              <li>Fixed 0.5 decision threshold, not cost-tuned</li>
            </ul>
          </div>
          <div className="hib-card">
            <h3>Planned improvements</h3>
            <ul>
              <li>An email-specific dataset for generalization comparison</li>
              <li>Cost-sensitive threshold tuning</li>
              <li>Surfacing top contributing TF-IDF features per prediction</li>
              <li>HTTPS + a real WSGI process manager for production</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* ---------- 11 References ---------- */}
      <Section
        id="references"
        num="11"
        eyebrow="REFERENCES"
        title="Sources cited on this page."
      >
        <ol className="hib-references">
          {REFERENCES.map((r) => (
            <li key={r.n} id={`ref-${r.n}`}>
              <span className="hib-references__n">[{r.n}]</span>
              <span>
                {r.text}{" "}
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    {r.url.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <footer className="hib-footer">
        <p>Every number on this page is measured — read from an actual training run, not invented.</p>
        <a href="#/">Back to the detector →</a>
      </footer>
    </div>
  );
}
