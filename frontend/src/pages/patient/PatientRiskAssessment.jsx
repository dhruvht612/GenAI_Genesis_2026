import { useEffect, useState } from 'react';
import { BarChart2, Pill, Bot, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import './PatientRiskAssessment.css';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

function getRiskInfo(score) {
  if (score === null || score === undefined) return { label: 'No Assessment Yet', color: '#6b7280', dot: '10%', bg: '#f3f4f6' };
  if (score >= 7) return { label: 'High Risk', color: '#ef4444', dot: '85%', bg: '#fef2f2' };
  if (score >= 4) return { label: 'Moderate', color: '#f59e0b', dot: '50%', bg: '#fffbeb' };
  return { label: 'Low Risk', color: '#10b981', dot: '15%', bg: '#f0fdf4' };
}

export default function PatientRiskScore() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [symptomText, setSymptomText] = useState('');
  const [selectedMedication, setSelectedMedication] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const patientId = sessionStorage.getItem('medguard_user_id') || '';

  useEffect(() => {
    if (!patientId) { setLoading(false); return; }

    const load = async () => {
      try {
        const res = await fetch(`${API}/patient/${patientId}/overview?t=${Date.now()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || 'Failed to load overview');
        setOverview(data);
      } catch {
        setOverview(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const riskScore = overview?.risk_score ?? null;
  const assessment = overview?.latest_assessment || null;
  const medications = overview?.medications || [];
  const risk = getRiskInfo(riskScore);

  const analyzeMedicationRelevance = async () => {
    if (!patientId || !symptomText.trim()) return;
    setAnalyzing(true);
    setAnalysisError('');
    setAnalysis(null);
    try {
      const res = await fetch(`${API}/patient/${patientId}/medication-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptom_text: symptomText.trim(),
          medication_name: selectedMedication || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Analysis failed');
      setAnalysis(data);
    } catch (err) {
      setAnalysisError(err.message || 'Could not run medication analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="patient-page patient-risk page-enter">
      <div className="risk-header">
        <BarChart2 className="risk-header-icon" style={{ width: '2rem', height: '2rem', color: 'var(--primary)' }} />
        <h1 className="risk-title">Risk Score</h1>
        <p className="risk-subtitle">Your current health risk level based on the latest AI assessment</p>
      </div>

      {loading ? (
        <div className="dashboard-card risk-form-card"><p className="risk-means-intro">Loading...</p></div>
      ) : (
        <div className="risk-grid">
          <div className="dashboard-card risk-level-card" style={{ background: risk.bg }}>
            <span className="risk-level-label">CURRENT RISK LEVEL</span>
            <span className="risk-level-value" style={{ color: risk.color, fontSize: '2rem', fontWeight: 700 }}>
              {risk.label}
            </span>
            {riskScore !== null && (
              <p style={{ color: '#6b7280', margin: '0.25rem 0 0.75rem' }}>Severity score: {riskScore}/10</p>
            )}
            <div className="risk-meter">
              <div className="risk-meter-bar">
                <span className="risk-meter-dot" style={{ left: risk.dot, background: risk.color }} />
              </div>
              <div className="risk-meter-labels">
                <span>Low</span>
                <span>Moderate</span>
                <span>High</span>
              </div>
            </div>
          </div>

          <div className="risk-right">
            <div className="dashboard-card risk-form-card">
              <div className="risk-means-header">
                <Pill className="risk-means-icon" style={{ width: '1.25rem', height: '1.25rem', color: 'var(--primary)' }} />
                <h2>Medication Relevance Check</h2>
              </div>
              <p className="risk-means-intro">Describe your current symptom. PharmacyMCP will check if the medication is relevant.</p>
              <div className="risk-analyze-form">
                <label>
                  Medication (optional)
                  <select value={selectedMedication} onChange={(e) => setSelectedMedication(e.target.value)}>
                    <option value="">Auto-detect from symptom text</option>
                    {medications.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
                <label>
                  Symptom details
                  <textarea
                    className="risk-textarea"
                    placeholder="e.g. I have asthma and I feel short of breath after taking my inhaler"
                    value={symptomText}
                    onChange={(e) => setSymptomText(e.target.value)}
                  />
                </label>
                <div className="risk-actions">
                  <button type="button" className="btn-risk-primary" disabled={analyzing || !symptomText.trim()} onClick={analyzeMedicationRelevance}>
                    {analyzing ? 'Checking...' : 'Check Relevance'}
                  </button>
                </div>
              </div>
              {analysisError && <p className="risk-error-text">{analysisError}</p>}
              {analysis && (
                <div className="risk-validation-summary">
                  <p><strong>Relevance:</strong> {analysis.relevance}</p>
                  <p><strong>Medication verified:</strong> {analysis.medication_verified_in_pharmacy_mcp ? 'Yes (PharmacyMCP)' : 'No'}</p>
                  {analysis.relevance_reason && <p><strong>Reason:</strong> {analysis.relevance_reason}</p>}
                  <p><strong>Matched symptom terms:</strong> {(analysis.symptom_matches || []).join(', ') || 'None identified'}</p>
                  <p><strong>Matched medication terms:</strong> {(analysis.medication_matches || []).join(', ') || 'None identified'}</p>
                </div>
              )}
            </div>

            <div className="dashboard-card risk-means-card">
              <div className="risk-means-header">
                <Bot className="risk-means-icon" style={{ width: '1.25rem', height: '1.25rem', color: 'var(--primary)' }} />
                <h2>Latest Assessment</h2>
              </div>
              {assessment ? (
                <>
                  <p className="risk-ai-summary">
                    <strong>Urgency:</strong> {assessment.urgency || 'unknown'}
                  </p>
                  {assessment.matched_medication && (
                    <p className="risk-ai-summary">
                      <strong>Linked medication:</strong> {assessment.matched_medication}
                    </p>
                  )}
                  <ul className="risk-recommendations-list" style={{ marginTop: '0.5rem' }}>
                    {(assessment.rationale || []).map((r, i) => (
                      <li key={i}><span className="risk-check">•</span>{r}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="risk-ai-summary">
                  No assessment yet. Go to <strong>AI Check-In</strong> and describe your symptoms to generate a risk score.
                </p>
              )}
            </div>

            <div className="dashboard-card risk-recommendations-card">
              <h2>What to Do</h2>
              <ul className="risk-recommendations-list">
                {riskScore === null && (
                  <li><span className="risk-check">→</span>Complete an AI Check-In to generate your risk score.</li>
                )}
                {riskScore !== null && riskScore >= 7 && (
                  <>
                    <li><AlertTriangle className="risk-check" style={{width:'1rem',height:'1rem',color:'#ef4444',flexShrink:0}} />Contact your doctor promptly — high severity detected.</li>
                    <li><AlertTriangle className="risk-check" style={{width:'1rem',height:'1rem',color:'#ef4444',flexShrink:0}} />A doctor report has been automatically generated.</li>
                    <li><CheckCircle className="risk-check" style={{width:'1rem',height:'1rem',color:'#10b981',flexShrink:0}} />Monitor symptoms and seek in-person care if they worsen.</li>
                  </>
                )}
                {riskScore !== null && riskScore >= 4 && riskScore < 7 && (
                  <>
                    <li><CheckCircle className="risk-check" style={{width:'1rem',height:'1rem',color:'#10b981',flexShrink:0}} />Monitor your symptoms and continue medications as prescribed.</li>
                    <li><CheckCircle className="risk-check" style={{width:'1rem',height:'1rem',color:'#10b981',flexShrink:0}} />Check in again tomorrow using AI Check-In.</li>
                  </>
                )}
                {riskScore !== null && riskScore < 4 && (
                  <>
                    <li><CheckCircle className="risk-check" style={{width:'1rem',height:'1rem',color:'#10b981',flexShrink:0}} />Your risk level is low — keep up your medication routine.</li>
                    <li><CheckCircle className="risk-check" style={{width:'1rem',height:'1rem',color:'#10b981',flexShrink:0}} />Continue daily AI Check-Ins for ongoing monitoring.</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
