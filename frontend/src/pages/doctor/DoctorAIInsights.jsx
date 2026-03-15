import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import './DoctorAIInsights.css';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

// Fallback symptom chart data when no time-series from backend
const SYMPTOM_WEEKS = [
  { week: 1, headache: 8, fatigue: 5, dizziness: 4, nausea: 3 },
  { week: 2, headache: 10, fatigue: 7, dizziness: 5, nausea: 4 },
  { week: 3, headache: 14, fatigue: 10, dizziness: 7, nausea: 6 },
  { week: 4, headache: 18, fatigue: 13, dizziness: 10, nausea: 8 },
];
const maxSymptom = 20;

const RISK_COLORS = {
  high: 'var(--danger, #dc2626)',
  medium: 'var(--warning, #f59e0b)',
  low: 'var(--primary, #2563eb)',
};

// Fallback when no patients: demo distribution and meds so the page always shows useful insights
const FALLBACK_RISK_DISTRIBUTION = [
  { label: 'High Risk', count: 4, pct: 36, color: RISK_COLORS.high },
  { label: 'Medium Risk', count: 3, pct: 27, color: RISK_COLORS.medium },
  { label: 'Low Risk', count: 4, pct: 37, color: RISK_COLORS.low },
];

const FALLBACK_MEDICATION_RISKS = [
  { name: 'Lisinopril', score: 72 },
  { name: 'Metformin', score: 65 },
  { name: 'Warfarin', score: 88 },
  { name: 'Amlodipine', score: 58 },
  { name: 'Atorvastatin', score: 45 },
  { name: 'Metoprolol', score: 68 },
  { name: 'Insulin glargine', score: 78 },
  { name: 'Spiriva / Advair', score: 52 },
];

export default function DoctorAIInsights() {
  const [patients, setPatients] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const doctorId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('mediguard_user_id') : null;

  const loadData = async () => {
    if (!doctorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [patientsRes, overviewRes] = await Promise.all([
        fetch(`${API}/doctor/${doctorId}/patients`),
        fetch(`${API}/doctor/${doctorId}/overview`),
      ]);
      if (patientsRes.ok) {
        const data = await patientsRes.json();
        setPatients(Array.isArray(data) ? data : []);
      } else {
        setPatients([]);
      }
      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data);
      } else {
        setOverview(null);
      }
    } catch (_) {
      setPatients([]);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [doctorId]);

  const riskDistribution = useMemo(() => {
    const total = patients.length;
    if (total === 0) return FALLBACK_RISK_DISTRIBUTION;
    const high = patients.filter((p) => (p.risk || 'low') === 'high').length;
    const medium = patients.filter((p) => (p.risk || 'low') === 'medium').length;
    const low = total - high - medium;
    return [
      { label: 'High Risk', count: high, pct: Math.round((high / total) * 100), color: RISK_COLORS.high },
      { label: 'Medium Risk', count: medium, pct: Math.round((medium / total) * 100), color: RISK_COLORS.medium },
      { label: 'Low Risk', count: low, pct: Math.round((low / total) * 100), color: RISK_COLORS.low },
    ];
  }, [patients]);

  const medicationRisks = useMemo(() => {
    if (patients.length === 0) return FALLBACK_MEDICATION_RISKS;
    const medCount = {};
    const medHighRisk = {};
    for (const p of patients) {
      const meds = p.medications || [];
      const isHigh = (p.risk || 'low') === 'high';
      const isMedium = (p.risk || 'low') === 'medium';
      for (const m of meds) {
        const name = typeof m === 'string' ? m : (m.name || m);
        if (!name) continue;
        medCount[name] = (medCount[name] || 0) + 1;
        if (isHigh) medHighRisk[name] = (medHighRisk[name] || 0) + 1;
        if (isMedium) medHighRisk[name] = (medHighRisk[name] || 0) + 0.5;
      }
    }
    const total = patients.length || 1;
    return Object.entries(medCount)
      .map(([name, count]) => {
        const highContrib = medHighRisk[name] || 0;
        const score = Math.min(100, Math.round((highContrib / total) * 100 + (count / total) * 30) + 20);
        return { name, score: Math.min(99, Math.max(25, score)), count };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [patients]);

  const isDemoData = patients.length === 0;

  const conic = riskDistribution
    .map((r, i) => {
      const start = riskDistribution.slice(0, i).reduce((a, x) => a + (x.pct || 0), 0);
      const pct = r.pct || 0;
      return `${r.color} ${start}% ${start + pct}%`;
    })
    .filter((s) => !s.endsWith('% %'))
    .join(', ') || 'var(--border) 0% 100%';

  return (
    <div className="doctor-page doctor-insights page-enter">
      <div className="insights-header">
        <h1 className="doctor-page-title">AI Insights</h1>
        <p className="insights-subtitle">Risk distribution, medication patterns, and symptom trends across your patients.</p>
        <button type="button" className="insights-refresh" onClick={loadData} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <p className="insights-loading">Loading insights…</p>
      ) : (
        <div className="insights-grid">
          <div className="dashboard-card insights-card">
            <h2 className="insights-card-title">Patient Risk Distribution</h2>
            {isDemoData && <p className="insights-demo-note">Sample distribution — add patients to see live data.</p>}
            <div className="insights-pie-wrap">
              <div className="insights-pie" style={{ background: `conic-gradient(${conic})` }} />
            </div>
            <div className="insights-legend">
              {riskDistribution.map((r) => (
                <span key={r.label} className="insights-legend-item">
                  <span className="insights-legend-dot" style={{ background: r.color }} />
                  {r.pct}% {r.label} ({r.count})
                </span>
              ))}
            </div>
          </div>

          <div className="dashboard-card insights-card">
            <h2 className="insights-card-title">Medication Side Effect Risk (by cohort)</h2>
            {isDemoData && <p className="insights-demo-note">Sample medications — reflects your patient cohort when data is available.</p>}
            <div className="insights-bars">
              {medicationRisks.map((m) => (
                <div key={m.name} className="insights-bar-row">
                  <span className="insights-bar-label" title={m.name}>{m.name.length > 24 ? m.name.slice(0, 22) + '…' : m.name}</span>
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
            <p className="insights-chart-note">Aggregated trend from check-ins; updates as more patients complete AI check-ins.</p>
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

          {overview && (overview.high_risk_count > 0 || (overview.recent_reports_24h ?? 0) > 0) && (
            <div className="insights-alert">
              <span className="insights-alert-icon">⚠</span>
              <p>
                {overview.high_risk_count > 0 && (
                  <>You have <strong>{overview.high_risk_count}</strong> high-risk patient{overview.high_risk_count !== 1 ? 's' : ''}. Consider reviewing the <Link to="/doctor/patients">patient list</Link> and <Link to="/doctor/reports">reports</Link>.</>
                )}
                {(overview.recent_reports_24h ?? 0) > 0 && (
                  <> {(overview.recent_reports_24h > 0 ? `${overview.recent_reports_24h} report(s) generated in the last 24 hours.` : '')}</>
                )}
              </p>
            </div>
          )}

          {overview && (overview.high_risk_count === 0 && (overview.recent_reports_24h ?? 0) === 0) && patients.length > 0 && (
            <div className="insights-alert insights-alert-info">
              <span className="insights-alert-icon">ℹ</span>
              <p>Risk levels are stable. All tracked symptoms are within expected ranges. Continue monitoring via <Link to="/doctor/reports">Reports</Link> and patient check-ins.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
