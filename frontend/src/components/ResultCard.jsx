export default function ResultCard({ result }) {
  const { is_spam: isSpam, label, spam_probability: spamProb, ham_probability: hamProb } = result;
  const confidencePct = Math.round((isSpam ? spamProb : hamProb) * 100);

  return (
    <div className={`result-card ${isSpam ? "result-card--spam" : "result-card--ham"}`} role="status">
      <div className="result-card__icon" aria-hidden="true">
        {isSpam ? (
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
            <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0Z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
            <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <div className="result-card__body">
        <p className="result-card__label">{label}</p>
        <p className="result-card__sub">
          {isSpam
            ? "This message shows patterns consistent with spam."
            : "This message looks like a legitimate email."}
        </p>
        <div className="confidence">
          <div className="confidence__track">
            <div
              className="confidence__fill"
              style={{ width: `${confidencePct}%` }}
            />
          </div>
          <span className="confidence__value">{confidencePct}% confidence</span>
        </div>
      </div>
    </div>
  );
}
