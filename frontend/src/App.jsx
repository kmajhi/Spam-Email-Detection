import { useState } from "react";
import "./App.css";
import ResultCard from "./components/ResultCard";
import ModelInfoPanel from "./components/ModelInfoPanel";
import { predictEmail } from "./api";

const MAX_CHARS = 20000;

const EXAMPLES = [
  {
    label: "Spam example",
    text: "CONGRATULATIONS! You have WON a $1,000 Walmart gift card. "
      + "To claim your prize, click here and enter your bank details within 24 hours "
      + "or the offer expires. Call 0900-123456 now!!!",
  },
  {
    label: "Legitimate example",
    text: "Hi Sarah, attached is the revised project report for Monday's meeting. "
      + "Let me know if you'd like any changes before I send it to the rest of the team. Thanks!",
  },
];

export default function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const charCount = text.length;
  const overLimit = charCount > MAX_CHARS;

  async function handleAnalyze(e) {
    e.preventDefault();
    if (!text.trim() || overLimit || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await predictEmail(text);
      setResult(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleExample(exampleText) {
    setText(exampleText);
    setResult(null);
    setError(null);
  }

  function handleClear() {
    setText("");
    setResult(null);
    setError(null);
  }

  return (
    <div className="page">
      <header className="header">
        <div className="header__badge">AI Lab Project</div>
        <h1>Spam Email Detector</h1>
        <p className="header__desc">
          Paste an email or message below and a trained machine-learning model will
          classify it as <strong>spam</strong> or <strong>not spam</strong>.
        </p>
      </header>

      <main className="main">
        <form className="panel" onSubmit={handleAnalyze}>
          <label htmlFor="email-text" className="panel__label">
            Email / message content
          </label>
          <textarea
            id="email-text"
            className="textarea"
            placeholder="Paste the email or message text here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            aria-describedby="char-count"
          />
          <div className="panel__footer">
            <span
              id="char-count"
              className={`char-count ${overLimit ? "char-count--over" : ""}`}
            >
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
            </span>
            <div className="panel__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleClear}
                disabled={!text && !result}
              >
                Clear
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={!text.trim() || overLimit || loading}
              >
                {loading ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Analyzing…
                  </>
                ) : (
                  "Analyze Email"
                )}
              </button>
            </div>
          </div>

          <div className="examples">
            <span className="examples__label">Try an example:</span>
            {EXAMPLES.map((ex) => (
              <button
                type="button"
                key={ex.label}
                className="chip"
                onClick={() => handleExample(ex.text)}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </form>

        <div className="output" aria-live="polite">
          {error && (
            <div className="alert alert--error" role="alert">
              <strong>Couldn't analyze this message.</strong>
              <span>{error}</span>
            </div>
          )}

          {!error && !result && !loading && (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" aria-hidden="true">
                <path d="M4 4h16v16H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity="0.35" />
                <path d="m4 5 8 7 8-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p>Results will appear here after you analyze a message.</p>
            </div>
          )}

          {loading && (
            <div className="empty-state">
              <span className="spinner spinner--lg" aria-hidden="true" />
              <p>Running the message through the trained classifier…</p>
            </div>
          )}

          {result && !loading && <ResultCard result={result} />}
        </div>
      </main>

      <ModelInfoPanel />

      <footer className="footer">
        <p>
          Traditional machine learning (TF-IDF + a trained classifier), not a language model —
          predictions are inference on a fixed, pre-trained pipeline.
        </p>
      </footer>
    </div>
  );
}
