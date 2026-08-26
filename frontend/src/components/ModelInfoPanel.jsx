import { useEffect, useState } from "react";
import { fetchModelInfo } from "../api";

const MODEL_LABELS = {
  multinomial_nb: "Multinomial Naive Bayes",
  logistic_regression: "Logistic Regression",
  linear_svm_calibrated: "Linear SVM (Platt-calibrated)",
};

export default function ModelInfoPanel() {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchModelInfo()
      .then(setInfo)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section className="methodology">
      <button
        type="button"
        className="methodology__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>Model &amp; methodology</span>
        <svg
          className={`chevron ${open ? "chevron--open" : ""}`}
          viewBox="0 0 24 24" width="18" height="18" fill="none"
        >
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="methodology__content">
          {error && <p className="methodology__error">Could not load model info: {error}</p>}
          {!error && !info && <p>Loading model information…</p>}
          {info && (
            <>
              <p>
                Predictions are produced by a{" "}
                <strong>{MODEL_LABELS[info.selected_model] || info.selected_model}</strong>{" "}
                classifier trained on TF-IDF features (unigrams + bigrams) extracted from
                message text. This is traditional supervised machine learning, not a
                large language model — the same trained pipeline is reused for every request.
              </p>
              <dl className="metrics-grid">
                <div>
                  <dt>Training dataset</dt>
                  <dd>
                    SMS Spam Collection (UCI) — {info.dataset.rows_after_cleaning} messages after
                    cleaning ({info.dataset.class_distribution_counts.spam} spam /{" "}
                    {info.dataset.class_distribution_counts.ham} ham)
                  </dd>
                </div>
                <div>
                  <dt>Test-set accuracy</dt>
                  <dd>{(info.test_metrics.accuracy * 100).toFixed(2)}%</dd>
                </div>
                <div>
                  <dt>Precision (spam)</dt>
                  <dd>{(info.test_metrics.precision_spam * 100).toFixed(2)}%</dd>
                </div>
                <div>
                  <dt>Recall (spam)</dt>
                  <dd>{(info.test_metrics.recall_spam * 100).toFixed(2)}%</dd>
                </div>
                <div>
                  <dt>F1-score (spam)</dt>
                  <dd>{(info.test_metrics.f1_spam * 100).toFixed(2)}%</dd>
                </div>
                <div>
                  <dt>ROC-AUC</dt>
                  <dd>{info.test_metrics.roc_auc.toFixed(4)}</dd>
                </div>
              </dl>
              <p className="methodology__note">
                Metrics computed once on a held-out 20% test split never seen during training or
                feature-extraction fitting. Selection rule: {info.selection_rule}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
