import { useState } from "react";
import { analyzePlan, type AnalysisResult, type Category } from "./lib/analyze";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "travel", label: "Travel" },
  { value: "event", label: "Event" },
  { value: "project", label: "Project" },
  { value: "move", label: "Move / Relocation" },
  { value: "finance", label: "Finance" },
  { value: "general", label: "General / Other" },
];

const EXAMPLES: { label: string; category: Category; text: string }[] = [
  {
    label: "International flight",
    category: "travel",
    text: "Flying from NYC to Tokyo next month with a 50 minute layover in Seattle, budget is $2000 for the whole trip, no travel insurance yet.",
  },
  {
    label: "Wedding reception",
    category: "event",
    text: "Planning a wedding reception at a rented hall for 150 guests, caterer booked, budget is $20000, date is set for June.",
  },
  {
    label: "Solo feature launch",
    category: "project",
    text: "I'm the only developer shipping a new feature by next Friday, deadline is tight, it depends on a third-party API I haven't tested much.",
  },
];

function severityClass(sev: number) {
  if (sev >= 15) return "sev-high";
  if (sev >= 8) return "sev-med";
  return "sev-low";
}

function dialColor(level: AnalysisResult["riskLevel"]) {
  switch (level) {
    case "Low":
      return "var(--low)";
    case "Moderate":
      return "var(--moderate)";
    case "High":
      return "var(--high)";
    case "Severe":
      return "var(--severe)";
  }
}

export default function App() {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("travel");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  function runAnalysis() {
    if (!description.trim()) return;
    setResult(analyzePlan(description, category));
  }

  function loadExample(ex: (typeof EXAMPLES)[number]) {
    setDescription(ex.text);
    setCategory(ex.category);
    setResult(analyzePlan(ex.text, ex.category));
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🪤 Murphy's Law Planner</h1>
        <p className="tagline">
          Describe your plan. We'll find what's likely to go wrong — and what to do about it before it does.
        </p>
      </header>

      <section className="panel">
        <label htmlFor="plan-input">Describe your plan</label>
        <textarea
          id="plan-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Flying to Tokyo next month with a short layover, budget is $2000, no insurance yet..."
        />
        <div className="row">
          <div className="category-select">
            <label htmlFor="category-select">Plan type</label>
            <select
              id="category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <button className="analyze-btn" onClick={runAnalysis} disabled={!description.trim()}>
            Stress-test this plan
          </button>
        </div>
        <div className="examples">
          {EXAMPLES.map((ex) => (
            <button key={ex.label} className="example-chip" onClick={() => loadExample(ex)}>
              Try: {ex.label}
            </button>
          ))}
        </div>
      </section>

      {result && (
        <>
          <section className="panel">
            <div className="score-row">
              <div className="score-dial" style={{ borderColor: dialColor(result.riskLevel) }}>
                <div className="num">{result.riskScore}</div>
                <div className="lbl">risk score</div>
              </div>
              <div>
                <span className={`level-badge level-${result.riskLevel}`}>{result.riskLevel} risk</span>
                <p className="summary-text">{result.summary}</p>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2 className="section-title">What could go wrong</h2>
            {result.risks.map((risk) => (
              <div key={risk.id} className={`risk-card ${severityClass(risk.severity)}`}>
                <div className="risk-head">
                  <span className="risk-title">{risk.title}</span>
                  <span className="risk-severity">
                    severity {risk.severity}/25 · likelihood {risk.likelihood}/5 · impact {risk.impact}/5
                  </span>
                </div>
                <p className="risk-trigger">{risk.trigger}</p>
                <p className="risk-field">
                  <strong>Mitigate now:</strong> {risk.mitigation}
                </p>
                <p className="risk-field">
                  <strong>If it happens anyway:</strong> {risk.contingency}
                </p>
              </div>
            ))}
          </section>

          {result.blindSpots.length > 0 && (
            <section className="panel">
              <h2 className="section-title">Blind spots in your plan as written</h2>
              <ul className="plain-list">
                {result.blindSpots.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="panel">
            <h2 className="section-title">Before you commit, do this</h2>
            <ul className="plain-list">
              {result.checklist.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        </>
      )}

      <p className="footer-note">
        Rule-based analysis, runs entirely in your browser — nothing you type is sent anywhere.
      </p>
    </div>
  );
}
