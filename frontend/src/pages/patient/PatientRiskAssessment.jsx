import { useEffect, useMemo, useState } from 'react';
import './PatientRiskAssessment.css';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export default function PatientRiskAssessment() {
  const [validation, setValidation] = useState(null);
  const [selectedMedication, setSelectedMedication] = useState('');
  const [symptomText, setSymptomText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const patientId = sessionStorage.getItem('mediguard_user_id') || '';

  useEffect(() => {
    if (!patientId) return;

    const load = async () => {
      try {
        const res = await fetch(`${API}/patient/${patientId}/medication-validation`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || 'Failed to load medications');
        setValidation(data);
        if (data?.items?.[0]?.medication) {
          setSelectedMedication(data.items[0].medication);
        }
      } catch (e) {
        setError(e.message || 'Unable to load medication validation');
      }
    };

    load();
  }, [patientId]);

  const riskView = useMemo(() => {
    const severity = analysis?.assessment?.severity_score || 0;
    if (severity >= 7) return { label: 'High Risk', dot: '85%', color: '#ef4444' };
    if (severity >= 4) return { label: 'Moderate Risk', dot: '50%', color: '#f59e0b' };
    return { label: 'Low Risk', dot: '20%', color: '#10b981' };
  }, [analysis]);

  const recommendations = useMemo(() => {
    const base = [
      'Continue taking medications only as prescribed by your clinician.',
      'Track symptom timing versus dose timing in this portal.',
      'Escalate to in-person care if severe symptoms persist.',
    ];
    const matched = analysis?.matched_side_effects || [];
    if (matched.length) {
      return [
        `Possible side-effect overlap found: ${matched.join(', ')}`,
        ...base,
      ];
    }
    return base;
  }, [analysis]);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!patientId || !symptomText.trim()) return;

    setLoading(true);
    setError('');
    setAnalysis(null);
    try {
      const res = await fetch(`${API}/patient/${patientId}/medication-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptom_text: symptomText.trim(),
          medication_name: selectedMedication || null,
          generate_report: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Analysis failed');
      setAnalysis(data);
      if (data?.report) {
        localStorage.setItem('mediguard_latest_report', data.report);
      }
    } catch (err) {
      setError(err.message || 'Could not run analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="patient-page patient-risk page-enter">
      <div className="risk-header">
        <span className="risk-header-icon">🧪</span>
        <h1 className="risk-title">Medication AI Analysis</h1>
        <p className="risk-subtitle">PharmacyMCP-verified medication checks against your symptoms</p>
      </div>

      <div className="dashboard-card risk-form-card">
        <form onSubmit={handleAnalyze} className="risk-analyze-form">
          <label>
            Medication
            <select
              className="form-input"
              value={selectedMedication}
              onChange={(e) => setSelectedMedication(e.target.value)}
              disabled={loading}
            >
              {(validation?.items || []).map((item) => (
                <option key={item.medication} value={item.medication}>{item.medication}</option>
              ))}
            </select>
          </label>
          <label>
            Symptom details
            <textarea
              className="form-input risk-textarea"
              value={symptomText}
              onChange={(e) => setSymptomText(e.target.value)}
              placeholder="Example: I feel dizzy and nauseous about 1 hour after taking this medication"
              disabled={loading}
            />
          </label>
          <button type="submit" className="btn btn-risk-primary" disabled={loading || !symptomText.trim() || !selectedMedication}>
            {loading ? 'Analyzing…' : 'Analyze + Generate Report'}
          </button>
        </form>
        {error && <p className="risk-error-text">{error}</p>}
      </div>

      <div className="risk-grid">
        <div className="dashboard-card risk-level-card">
          <span className="risk-level-label">CURRENT RISK LEVEL</span>
          <span className="risk-level-value" style={{ color: riskView.color }}>{riskView.label}</span>
          <div className="risk-meter">
            <div className="risk-meter-bar">
              <span className="risk-meter-dot" style={{ left: riskView.dot }} />
            </div>
            <div className="risk-meter-labels">
              <span>Low</span>
              <span>Moderate</span>
              <span>High</span>
            </div>
          </div>
          {analysis && (
            <div className="risk-validation-summary">
              <p>Medication checked: <strong>{analysis.medication || 'Unknown'}</strong></p>
              <p>PharmacyMCP verified: <strong>{analysis.medication_verified_in_pharmacy_mcp ? 'Yes' : 'No'}</strong></p>
              <p>Possible symptom link: <strong>{analysis.possible_symptom_link ? 'Yes' : 'No'}</strong></p>
            </div>
          )}
        </div>
        <div className="risk-right">
          <div className="dashboard-card risk-means-card">
            <div className="risk-means-header">
              <span className="risk-means-icon">ℹ</span>
              <h2>What This Means</h2>
            </div>
            <p className="risk-means-intro">AI summary:</p>
            <p className="risk-ai-summary">{analysis?.ai_summary || 'Run an analysis to get a medication-specific AI summary.'}</p>
          </div>
          <div className="dashboard-card risk-recommendations-card">
            <h2>Recommendations</h2>
            <ul className="risk-recommendations-list">
              {recommendations.map((r, i) => (
                <li key={i}>
                  <span className="risk-check">✓</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="dashboard-card risk-validation-list">
        <h2>Medication Validation Status</h2>
        {(validation?.items || []).map((item) => (
          <div key={item.medication} className="risk-validation-item">
            <strong>{item.medication}</strong>
            <span>{item.verified_in_pharmacy_mcp ? '✅ Verified by PharmacyMCP' : '⚠ Not verified in PharmacyMCP'}</span>
            {item.side_effect_samples?.length > 0 && <span>Common side effects: {item.side_effect_samples.join(', ')}</span>}
          </div>
        ))}
        {!validation?.items?.length && <p className="risk-means-intro">No medications found for this profile yet.</p>}
      </div>
    </div>
  );
}
