import './DoctorAIInsights.css';

const RISK_DISTRIBUTION = [
  { label: 'High Risk', pct: 22, color: 'var(--danger)' },
  { label: 'Medium Risk', pct: 55, color: 'var(--warning)' },
  { label: 'Low Risk', pct: 23, color: 'var(--primary)' },
];

const MEDICATION_RISKS = [
  { name: 'Lisinopril', score: 72 },
  { name: 'Insulin', score: 88 },
  { name: 'Metformin', score: 45 },
  { name: 'Amlodipine', score: 58 },
  { name: 'Atorvastatin', score: 38 },
];

const SYMPTOM_WEEKS = [
  { week: 1, headache: 8, fatigue: 5, dizziness: 4, nausea: 3 },
  { week: 2, headache: 10, fatigue: 7, dizziness: 5, nausea: 4 },
  { week: 3, headache: 14, fatigue: 10, dizziness: 7, nausea: 6 },
  { week: 4, headache: 18, fatigue: 13, dizziness: 10, nausea: 8 },
];

const maxSymptom = 20;

export default function DoctorAIInsights() {
  const conic = RISK_DISTRIBUTION.map((r, i) => {
    const start = RISK_DISTRIBUTION.slice(0, i).reduce((a, x) => a + x.pct, 0);
    return `${r.color} ${start}% ${start + r.pct}%`;
  }).join(', ');

  return (
    <div className="doctor-page doctor-insights page-enter">
      <h1 className="doctor-page-title">AI Insights</h1>
      <div className="insights-grid">
        <div className="dashboard-card insights-card">
          <h2 className="insights-card-title">Patient Risk Distribution</h2>
          <div className="insights-pie-wrap">
            <div className="insights-pie" style={{ background: `conic-gradient(${conic})` }} />
          </div>
          <div className="insights-legend">
            {RISK_DISTRIBUTION.map((r) => (
              <span key={r.label} className="insights-legend-item">
                <span className="insights-legend-dot" style={{ background: r.color }} />
                {r.pct}% {r.label}
              </span>
            ))}
          </div>
        </div>
        <div className="dashboard-card insights-card">
          <h2 className="insights-card-title">Medication Side Effect Risk Scores</h2>
          <div className="insights-bars">
            {MEDICATION_RISKS.map((m) => (
              <div key={m.name} className="insights-bar-row">
                <span className="insights-bar-label">{m.name}</span>
                <div className="insights-bar-track">
                  <div className="insights-bar-fill" style={{ width: `${m.score}%` }} />
                </div>
                <span className="insights-bar-value">{m.score}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="dashboard-card insights-card insights-card-wide">
          <h2 className="insights-card-title">Symptom Pattern Analysis (4 Weeks)</h2>
          <div className="insights-line-chart">
            <div className="insights-line-y">
              {[0, 5, 10, 15, 20].map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
            <div className="insights-line-area">
              <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="insights-svg">
                <polyline
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="2"
                  points={SYMPTOM_WEEKS.map((w, i) => `${50 + i * 100},${120 - (w.headache / maxSymptom) * 100}`).join(' ')}
                />
                <polyline
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  points={SYMPTOM_WEEKS.map((w, i) => `${50 + i * 100},${120 - (w.fatigue / maxSymptom) * 100}`).join(' ')}
                />
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  points={SYMPTOM_WEEKS.map((w, i) => `${50 + i * 100},${120 - (w.dizziness / maxSymptom) * 100}`).join(' ')}
                />
                <polyline
                  fill="none"
                  stroke="#7c5cbf"
                  strokeWidth="2"
                  points={SYMPTOM_WEEKS.map((w, i) => `${50 + i * 100},${120 - (w.nausea / maxSymptom) * 100}`).join(' ')}
                />
              </svg>
            </div>
            <div className="insights-line-x">
              <span>Week 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4</span>
            </div>
          </div>
          <div className="insights-line-legend">
            <span className="insights-line-legend-item"><span className="line-color line-headache" /> Headache</span>
            <span className="insights-line-legend-item"><span className="line-color line-fatigue" /> Fatigue</span>
            <span className="insights-line-legend-item"><span className="line-color line-dizziness" /> Dizziness</span>
            <span className="insights-line-legend-item"><span className="line-color line-nausea" /> Nausea</span>
          </div>
        </div>
        <div className="insights-alert">
          <span className="insights-alert-icon">⚠</span>
          <p>All tracked symptoms show increasing trends over the past 4 weeks. This pattern suggests a need for treatment plan revision across multiple patients.</p>
        </div>
      </div>
    </div>
  );
}
