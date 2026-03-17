import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const initialsFrom = (name = '') => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

export default function DoctorOverview() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const doctorId = sessionStorage.getItem('medguard_user_id');
    if (!doctorId) { setLoading(false); return; }

    const loadAll = async () => {
      try {
        const [pRes, rRes] = await Promise.all([
          fetch(`${API}/doctor/${doctorId}/patients`),
          fetch(`${API}/doctor/${doctorId}/reports`),
        ]);
        if (pRes.ok) {
          const pData = await pRes.json();
          setPatients(pData.patients || []);
        }
        if (rRes.ok) {
          const rData = await rRes.json();
          setReports(rData.reports || []);
        }
      } catch {
        // keep empty state
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  const highRiskPatients = patients.filter((p) => p.risk === 'high');
  const cutoff24h = Date.now() - 86_400_000;
  const recentReports = reports.filter((r) => new Date(r.created_at).getTime() > cutoff24h);

  return (
    <div className="doctor-page page-enter">
      <div className="doctor-overview-header">
        <h1 className="doctor-overview-title">Dashboard Overview</h1>
        <p className="doctor-overview-subtitle">Monitor your patients and manage their care</p>
      </div>

      <div className="doctor-metrics">
        <div className="doctor-metric-card">
          <span className="doctor-metric-icon" aria-hidden>👥</span>
          <span className="doctor-metric-value">{loading ? '—' : patients.length}</span>
          <span className="doctor-metric-label">Total Patients</span>
          <span className="doctor-metric-desc">Active monitoring</span>
        </div>
        <div className="doctor-metric-card doctor-metric-card-danger">
          <span className="doctor-metric-icon" aria-hidden>⚠</span>
          <span className="doctor-metric-value">{loading ? '—' : highRiskPatients.length}</span>
          <span className="doctor-metric-label">High Risk Alerts</span>
          <span className="doctor-metric-desc">Require attention</span>
        </div>
        <div className="doctor-metric-card">
          <span className="doctor-metric-icon" aria-hidden>📈</span>
          <span className="doctor-metric-value">{loading ? '—' : recentReports.length}</span>
          <span className="doctor-metric-label">Recent Reports</span>
          <span className="doctor-metric-desc">Last 24 hours</span>
        </div>
        <div className="doctor-metric-card doctor-metric-card-success">
          <span className="doctor-metric-icon" aria-hidden>📋</span>
          <span className="doctor-metric-value">{loading ? '—' : reports.length}</span>
          <span className="doctor-metric-label">Total Reports</span>
          <span className="doctor-metric-desc">All time</span>
        </div>
      </div>

      <div className="doctor-two-col">
        <section className="doctor-section">
          <div className="doctor-section-header">
            <h2 className="section-title">High Risk Patients</h2>
            <button type="button" className="doctor-view-all" onClick={() => navigate('/doctor/patients')}>View All →</button>
          </div>
          <div className="dashboard-card doctor-list-card">
            {loading && <p style={{ padding: '1rem', color: '#6b7280' }}>Loading...</p>}
            {!loading && highRiskPatients.length === 0 && (
              <p style={{ padding: '1rem', color: '#6b7280' }}>No high-risk patients at this time.</p>
            )}
            {highRiskPatients.map((p) => (
              <div key={p.patient_id} className="high-risk-row" style={{ cursor: 'pointer' }}
                onClick={() => navigate('/doctor/reports', { state: { patientId: p.patient_id } })}>
                <span className="high-risk-avatar">{initialsFrom(p.name)}</span>
                <div className="high-risk-info">
                  <strong>{p.name}</strong>
                  <span className="high-risk-meta">{p.age} years</span>
                  <span className="high-risk-conditions">{p.conditions.join(', ') || 'No conditions listed'}</span>
                  <span className="high-risk-adherence">
                    Risk score: {p.risk_score !== undefined ? `${p.risk_score}/10` : 'N/A'}
                    {p.has_report ? ' · Report available' : ''}
                  </span>
                </div>
                <span className="badge badge-danger">⚠️ High Risk</span>
              </div>
            ))}
          </div>
        </section>

        <section className="doctor-section">
          <h2 className="section-title">Recent Reports</h2>
          <div className="dashboard-card doctor-activity-card">
            {loading && <p style={{ padding: '1rem', color: '#6b7280' }}>Loading...</p>}
            {!loading && reports.length === 0 && (
              <p style={{ padding: '1rem', color: '#6b7280' }}>No reports generated yet.</p>
            )}
            <ul className="activity-list">
              {reports.slice(0, 6).map((r) => (
                <li key={r.report_id} className="activity-item" style={{ cursor: 'pointer' }}
                  onClick={() => navigate('/doctor/reports', { state: { patientId: r.patient_id } })}>
                  <span className={`activity-icon activity-icon-${r.urgency === 'high' ? 'injury' : 'check'}`} aria-hidden>
                    {r.urgency === 'high' ? '🩹' : '📄'}
                  </span>
                  <div className="activity-body">
                    <span className="activity-text">
                      <strong>{r.patient_name}</strong> — AI report generated
                    </span>
                    {r.urgency === 'high' && (
                      <span className="activity-priority activity-priority-high">High Priority</span>
                    )}
                    {r.urgency === 'medium' && (
                      <span className="activity-priority activity-priority-medium">Medium Priority</span>
                    )}
                    <span className="activity-time">{timeAgo(r.created_at)} · Severity {r.severity_score ?? 'N/A'}/10</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
