import { useEffect, useMemo, useState } from 'react';
import './DoctorReports.css';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const initialsFrom = (name = '') => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

const REPORT_TYPES = [
  { id: 'summary', label: 'Health Summary', desc: 'Overview of patient health status', icon: '📄' },
  { id: 'detailed', label: 'Detailed Report', desc: 'Comprehensive health insights', icon: '📄' },
  { id: 'medication', label: 'Medication Report', desc: 'Medication overview and effects', icon: '📄' },
];

export default function DoctorReports() {
  const [reports, setReports] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [reportType, setReportType] = useState('summary');
  const [sendRecommendation, setSendRecommendation] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const doctorId = sessionStorage.getItem('mediguard_user_id');
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
        if (rows.length) setSelectedId(rows[0].report_id);
      } catch {
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const selected = useMemo(
    () => reports.find((r) => r.report_id === selectedId) || reports[0] || null,
    [reports, selectedId],
  );

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
            <h3 className="reports-preview-title">Patient Health Report</h3>
            <p className="reports-preview-subtitle">Health Summary Report · Generated: {new Date().toLocaleDateString('en-US')}</p>
            {selected ? (
              <pre className="report-live-pre">{selected.report}</pre>
            ) : (
              <p className="report-ai-intro">Select a report from the left panel.</p>
            )}
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
                <button type="button" className="btn-doctor btn-doctor-primary">✉ Send Message</button>
                <button type="button" className="btn-doctor btn-doctor-secondary">📅 Schedule Consultation</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
