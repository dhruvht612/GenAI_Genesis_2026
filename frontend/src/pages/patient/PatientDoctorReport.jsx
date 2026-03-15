import { useEffect, useState } from 'react';
import './PatientDoctorReport.css';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const MEDS_ADHERENCE = [
  { name: 'Lisinopril 10mg', pct: 100, detail: 'Daily at 8:00 AM - 7/7 doses taken' },
  { name: 'Metformin 500mg', pct: 100, detail: 'Daily at 8:00 AM - 7/7 doses taken' },
  { name: 'Atorvastatin 20mg', pct: 80, detail: 'Daily at 5:00 PM - 6/7 doses taken' },
];

const AI_INSIGHTS = [
  { text: 'Excellent medication compliance (95% overall adherence)', highlight: true },
  { text: 'Reported headaches may be related to Lisinopril adjustment period', highlight: false },
  { text: 'Symptoms are mild and within expected range', highlight: false },
];

const SYMPTOMS_LOG = [
  { name: 'Mild Headache', count: 2, severity: '3/10' },
  { name: 'Dizziness', count: 1, severity: '2/10' },
  { name: 'Fatigue', count: 1, severity: '4/10' },
];

const reportDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

export default function PatientDoctorReport() {
  const patientId = sessionStorage.getItem('mediguard_user_id') || localStorage.getItem('mediguard_patient_id') || '';
  const reportKey = patientId ? `mediguard_latest_report_${patientId}` : 'mediguard_latest_report';
  const [latestReport, setLatestReport] = useState(patientId ? (localStorage.getItem(reportKey) || '') : '');
  const [patientProfile, setPatientProfile] = useState(null);
  const [doctorMessages, setDoctorMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyStatus, setReplyStatus] = useState('');

  useEffect(() => {
    if (!patientId) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API}/patient/${patientId}/overview`);
        if (!res.ok) return;
        const data = await res.json();
        setPatientProfile(data);
      } catch {
        // keep defaults
      }
    };

    const fetchReport = async () => {
      try {
        const res = await fetch(`${API}/report/${patientId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.report) {
          setLatestReport(data.report);
          localStorage.setItem(reportKey, data.report);
        }
      } catch {
        // keep last cached report
      }
    };

    fetchProfile();
    fetchReport();
  }, [patientId, reportKey]);

  useEffect(() => {
    if (!patientId) return;

    let mounted = true;
    const loadMessages = async () => {
      try {
        const res = await fetch(`${API}/patient/${patientId}/messages`);
        const data = await res.json();
        if (!res.ok) return;
        if (mounted) {
          setDoctorMessages(data.messages || []);
        }
      } catch {
        // keep current messages
      }
    };

    loadMessages();
    const timer = setInterval(loadMessages, 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [patientId]);

  const sendReply = async () => {
    if (!patientId || !reply.trim()) return;
    setSendingReply(true);
    setReplyStatus('');

    try {
      const res = await fetch(`${API}/patient/${patientId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Failed to send reply');

      setReply('');
      setReplyStatus('Message sent to your doctor');

      const refreshRes = await fetch(`${API}/patient/${patientId}/messages`);
      const refreshData = await refreshRes.json();
      if (refreshRes.ok) setDoctorMessages(refreshData.messages || []);
    } catch {
      setReplyStatus('Could not send message');
    } finally {
      setSendingReply(false);
    }
  };

  const displayName = patientProfile?.name || sessionStorage.getItem('mediguard_displayName') || 'Patient';
  const displayId = patientProfile?.patient_id || sessionStorage.getItem('mediguard_user_id') || 'N/A';
  const displayAge = patientProfile?.age;
  const conditions = patientProfile?.conditions || [];
  const medications = patientProfile?.medications || [];
  const medicationPlan = patientProfile?.medication_plan || [];

  return (
    <div className="patient-page patient-report page-enter">
      <div className="report-header">
        <div>
          <h1 className="report-title">Health Report</h1>
          <p className="report-date">
            <span className="report-date-icon">📅</span>
            Generated on {reportDate}
          </p>
        </div>
        <div className="report-header-actions">
          <button type="button" className="btn-report btn-report-outline">
            <span>📥</span> Export PDF
          </button>
          <button type="button" className="btn-report btn-report-primary">
            <span>↗</span> Share
          </button>
        </div>
      </div>
      <div className="report-grid">
        <div className="dashboard-card report-card report-patient-info">
          <span className="report-avatar">{displayName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}</span>
          <h3>{displayName}</h3>
          <p className="report-meta">Patient ID: #{displayId}</p>
          <p className="report-meta"><strong>AGE</strong><br />{displayAge || 'Unknown'}</p>
          <p className="report-meta"><strong>CONDITIONS</strong><br />{conditions.length ? conditions.join(', ') : 'Not set'}</p>
        </div>
        <div className="dashboard-card report-card report-adherence">
          <h3 className="report-card-title">💊 Medications Adherence</h3>
          {(medicationPlan.length
            ? medicationPlan.map((m) => ({ name: m.name, pct: 100, detail: m.time ? `Scheduled at ${m.time}` : 'Active medication' }))
            : medications.length
              ? medications.map((m) => ({ name: m, pct: 100, detail: 'Active medication' }))
              : MEDS_ADHERENCE
          ).map((m, i) => (
            <div key={i} className="report-adherence-item">
              <div className="report-adherence-header">
                <span className="report-adherence-name">{m.name}</span>
                <span className="report-adherence-pct">{m.pct}%</span>
              </div>
              <div className="report-adherence-bar-wrap">
                <div
                  className={`report-adherence-bar ${m.pct === 100 ? 'report-adherence-bar-full' : ''}`}
                  style={{ width: `${m.pct}%` }}
                />
              </div>
              <p className="report-adherence-detail">{m.detail || 'Active medication'}</p>
            </div>
          ))}
        </div>
        <div className="dashboard-card report-card report-ai">
          <h3 className="report-card-title">🤖 AI Analysis</h3>
          <p className="report-ai-intro">Based on the medication adherence and symptom data, our AI health assistant has identified the following insights:</p>
          <ul className="report-ai-list">
            {AI_INSIGHTS.map((item, i) => (
              <li key={i} className={item.highlight ? 'report-ai-highlight' : ''}>{item.text}</li>
            ))}
          </ul>
        </div>
        <div className="dashboard-card report-card report-symptoms">
          <h3 className="report-card-title">📊 Symptoms Log</h3>
          <ul className="report-symptoms-list">
            {SYMPTOMS_LOG.map((s, i) => (
              <li key={i} className="report-symptom-item">
                <span className="report-symptom-num">{i + 1}</span>
                <div>
                  <strong>{s.name}</strong>
                  <span className="report-symptom-meta">Occurred {s.count} time{s.count > 1 ? 's' : ''} · SEVERITY: {s.severity}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="dashboard-card report-card report-live-output" style={{ gridColumn: '1 / -1' }}>
          <h3 className="report-card-title">🧾 Latest AI Doctor Report (Live)</h3>
          {latestReport ? (
            <pre className="report-live-pre">{latestReport}</pre>
          ) : (
            <p className="report-ai-intro">No backend-generated report found yet. Trigger a high-severity check-in from AI Check-In to generate one.</p>
          )}
        </div>
        <div className="dashboard-card report-card report-live-output" style={{ gridColumn: '1 / -1' }}>
          <h3 className="report-card-title">💬 Care Team Messages</h3>
          {doctorMessages.length === 0 ? (
            <p className="report-ai-intro">No messages from your doctor yet.</p>
          ) : (
            <ul className="patient-thread-list">
              {doctorMessages.map((m) => (
                <li key={m.message_id} className={`patient-thread-item ${m.sender_role === 'doctor' ? 'patient-thread-item-doctor' : 'patient-thread-item-patient'}`}>
                  <span className="patient-thread-meta">{m.sender_role === 'doctor' ? 'Doctor' : 'You'} · {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>{m.message}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="patient-thread-compose">
            <textarea
              className="reports-message-input"
              placeholder="Reply to your doctor..."
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            <button type="button" className="btn-report btn-report-primary" onClick={sendReply} disabled={sendingReply || !reply.trim()}>
              {sendingReply ? 'Sending...' : 'Send Reply'}
            </button>
            {replyStatus && <p className="patient-thread-status">{replyStatus}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
