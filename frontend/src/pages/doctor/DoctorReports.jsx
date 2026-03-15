import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './DoctorReports.css';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const initialsFrom = (name = '') => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

const REPORT_TYPES = [
  { id: 'summary', label: 'Health Summary', desc: 'Overview of patient health status', icon: '📄' },
  { id: 'detailed', label: 'Detailed Report', desc: 'Comprehensive health insights', icon: '📄' },
  { id: 'medication', label: 'Medication Report', desc: 'Medication overview and effects', icon: '📄' },
];

export default function DoctorReports() {
  const location = useLocation();
  const doctorId = sessionStorage.getItem('mediguard_user_id') || '';
  const incomingPatientId = location.state?.patientId || null;
  const [reports, setReports] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [reportType, setReportType] = useState('summary');
  const [sendRecommendation, setSendRecommendation] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [medValidation, setMedValidation] = useState(null);
  const [symptomText, setSymptomText] = useState('');
  const [medicationName, setMedicationName] = useState('');
  const [medicationAnalysis, setMedicationAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [thread, setThread] = useState([]);
  const [sendStatus, setSendStatus] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!doctorId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(`${API}/doctor/${doctorId}/reports`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || 'Failed to load reports');
        const rows = data.reports || [];
        setReports(rows);
        if (rows.length) {
          const match = incomingPatientId && rows.find((r) => r.patient_id === incomingPatientId);
          setSelectedId(match ? match.report_id : rows[0].report_id);
        }
      } catch {
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [doctorId, incomingPatientId]);

  const selected = useMemo(
    () => reports.find((r) => r.report_id === selectedId) || reports[0] || null,
    [reports, selectedId],
  );

  useEffect(() => {
    if (!selected?.patient_id) {
      setMedValidation(null);
      return;
    }

    const loadValidation = async () => {
      try {
        const res = await fetch(`${API}/patient/${selected.patient_id}/medication-validation`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || 'Failed to load medication validation');
        setMedValidation(data);
      } catch {
        setMedValidation(null);
      }
    };

    loadValidation();
  }, [selected?.patient_id]);

  useEffect(() => {
    if (!doctorId || !selected?.patient_id) {
      setThread([]);
      return;
    }

    let mounted = true;
    const loadThread = async () => {
      try {
        const res = await fetch(`${API}/doctor/${doctorId}/patients/${selected.patient_id}/messages`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || 'Failed to load messages');
        if (mounted) {
          setThread(data.messages || []);
        }
      } catch {
        // keep existing thread
      }
    };

    loadThread();
    const timer = setInterval(loadThread, 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [doctorId, selected?.patient_id]);

  const runMedicationAnalysis = async () => {
    if (!selected?.patient_id || !symptomText.trim()) return;
    setAnalyzing(true);
    setAnalysisError('');
    setMedicationAnalysis(null);
    try {
      const res = await fetch(`${API}/patient/${selected.patient_id}/medication-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptom_text: symptomText.trim(),
          medication_name: medicationName || null,
          generate_report: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Medication analysis failed');
      setMedicationAnalysis(data);
    } catch (err) {
      setAnalysisError(err.message || 'Unable to analyze medication relevance');
    } finally {
      setAnalyzing(false);
    }
  };

  const sendMessage = async () => {
    if (!doctorId || !selected?.patient_id || !message.trim()) return;

    setSending(true);
    setSendStatus('');
    try {
      const res = await fetch(`${API}/doctor/${doctorId}/patients/${selected.patient_id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Failed to send message');

      setMessage('');
      setSendStatus('Message sent');

      const threadRes = await fetch(`${API}/doctor/${doctorId}/patients/${selected.patient_id}/messages`);
      const threadData = await threadRes.json();
      if (threadRes.ok) {
        setThread(threadData.messages || []);
      }
    } catch {
      setSendStatus('Could not send message');
    } finally {
      setSending(false);
    }
  };

  const renderReportPreview = () => {
    if (!selected) return <p className="report-ai-intro">Select a report from the left panel.</p>;

    if (reportType === 'summary') {
      return (
        <div className="reports-summary-content">
          <div className="report-section">
            <h4>Triage Snapshot</h4>
            <p>
              Urgency: <strong>{(selected.urgency || 'low').toUpperCase()}</strong> · Severity: <strong>{selected.severity_score ?? 'N/A'}/10</strong>
            </p>
          </div>
          <div className="report-section">
            <h4>Summary</h4>
            <p>{selected.report.split('\n').slice(0, 8).join(' ')}</p>
          </div>
        </div>
      );
    }

    if (reportType === 'medication') {
      return (
        <div className="reports-summary-content">
          <div className="report-section">
            <h4>Medication Verification</h4>
            {medValidation ? (
              <p>
                Verified in PharmacyMCP: <strong>{medValidation.verified_count}</strong> / {medValidation.total_medications}
              </p>
            ) : (
              <p>Medication verification not available for this patient.</p>
            )}
            {medValidation?.items?.length > 0 && (
              <ul>
                {medValidation.items.map((item) => (
                  <li key={item.medication}>
                    {item.medication}: {item.verified_in_pharmacy_mcp ? 'Verified' : 'Unverified'}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="report-section">
            <h4>Analyze New Symptom vs Medication</h4>
            <label className="reports-message-label">Medication (optional)</label>
            <select className="reports-message-input" value={medicationName} onChange={(e) => setMedicationName(e.target.value)}>
              <option value="">Auto-detect from symptom text</option>
              {(medValidation?.items || []).map((item) => (
                <option key={item.medication} value={item.medication}>{item.medication}</option>
              ))}
            </select>
            <label className="reports-message-label">Current symptom</label>
            <textarea
              className="reports-message-input"
              rows={3}
              value={symptomText}
              onChange={(e) => setSymptomText(e.target.value)}
              placeholder="e.g. Patient reports shortness of breath and chest tightness after evening dose"
            />
            <button type="button" className="btn-doctor btn-doctor-primary" onClick={runMedicationAnalysis} disabled={analyzing || !symptomText.trim()}>
              {analyzing ? 'Analyzing...' : 'Run Medication Relevance AI'}
            </button>
            {analysisError && <p className="report-ai-intro" style={{ color: '#b91c1c' }}>{analysisError}</p>}
            {medicationAnalysis && (
              <div className="report-ai-summary" style={{ marginTop: '0.75rem' }}>
                <p><strong>Compatibility:</strong> {medicationAnalysis.compatibility}</p>
                <p><strong>Matched side effects:</strong> {(medicationAnalysis.matched_side_effects || []).join(', ') || 'None identified'}</p>
                <p><strong>AI summary:</strong> {medicationAnalysis.ai_summary}</p>
                {medicationAnalysis.report_generated && <p><strong>Doctor report:</strong> A new report has been generated.</p>}
              </div>
            )}
          </div>
        </div>
      );
    }

    return <pre className="report-live-pre">{selected.report}</pre>;
  };

  return (
    <div className="doctor-page doctor-reports page-enter">
      <h1 className="doctor-page-title">Reports &amp; Communication</h1>
      <p className="doctor-page-subtitle">Securely view patient reports and send recommendations.</p>
      <div className="reports-layout">
        <aside className="reports-patient-list">
          <h2 className="reports-list-title">Recent Reports</h2>
          <div className="reports-list">
            {reports.map((r) => (
              <button
                key={r.report_id}
                type="button"
                className={`reports-patient-item ${selectedId === r.report_id ? 'reports-patient-item-active' : ''}`}
                onClick={() => setSelectedId(r.report_id)}
              >
                <span className="reports-patient-avatar">{initialsFrom(r.patient_name)}</span>
                <div className="reports-patient-info">
                  <strong>{r.patient_name}</strong>
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                </div>
              </button>
            ))}
            {!loading && reports.length === 0 && <p className="report-ai-intro">No reports yet.</p>}
          </div>
        </aside>
        <div className="reports-main">
          {selected && (
            <div className="dashboard-card reports-selected-card">
              <span className="reports-selected-avatar">{initialsFrom(selected.patient_name)}</span>
              <div className="reports-selected-info">
                <strong>{selected.patient_name}</strong>
                <span>Patient ID: {selected.patient_id}</span>
              </div>
              <span className={`badge ${selected.urgency === 'high' ? 'badge-danger' : selected.urgency === 'medium' ? 'badge-warning' : 'badge-success'}`}>
                {(selected.urgency || 'low').toUpperCase()} risk
              </span>
            </div>
          )}
          <div className="reports-type-tabs">
            {REPORT_TYPES.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`reports-type-tab ${reportType === r.id ? 'reports-type-tab-active' : ''}`}
                onClick={() => setReportType(r.id)}
              >
                <span className="reports-type-icon">{r.icon}</span>
                <span className="reports-type-label">{r.label}</span>
                <span className="reports-type-desc">{r.desc}</span>
              </button>
            ))}
          </div>
          <div className="dashboard-card reports-preview">
            <h3 className="reports-preview-title">
              {reportType === 'summary' ? 'Patient Health Summary' : reportType === 'medication' ? 'Medication Safety Report' : 'Detailed Clinical Report'}
            </h3>
            <p className="reports-preview-subtitle">Generated: {new Date().toLocaleDateString('en-US')}</p>
            {renderReportPreview()}
            <div className="reports-actions">
              <button type="button" className="btn-doctor btn-doctor-primary">📥 Download PDF</button>
              <button type="button" className="btn-doctor btn-doctor-secondary">🖨 Print Report</button>
            </div>
            <div className="reports-send-section">
              <label className="reports-checkbox">
                <input type="checkbox" checked={sendRecommendation} onChange={(e) => setSendRecommendation(e.target.checked)} />
                Send Recommendation
              </label>
              <label className="reports-message-label">Message to Patient</label>
              <textarea
                className="reports-message-input"
                placeholder="Type your message or recommendation here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
              <div className="reports-send-actions">
                <button type="button" className="btn-doctor btn-doctor-primary" onClick={sendMessage} disabled={!sendRecommendation || !message.trim() || sending}>
                  {sending ? 'Sending...' : '✉ Send Message'}
                </button>
                <button type="button" className="btn-doctor btn-doctor-secondary">📅 Schedule Consultation</button>
              </div>
              {sendStatus && <p className="reports-message-status">{sendStatus}</p>}
              <div className="reports-thread">
                <h4>Live conversation</h4>
                {thread.length === 0 ? (
                  <p className="report-ai-intro">No messages yet.</p>
                ) : (
                  <ul className="reports-thread-list">
                    {thread.map((m) => (
                      <li key={m.message_id} className={`reports-thread-item ${m.sender_role === 'doctor' ? 'reports-thread-item-doctor' : 'reports-thread-item-patient'}`}>
                        <span className="reports-thread-meta">{m.sender_role === 'doctor' ? 'You' : 'Patient'} · {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>{m.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
