import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../Dashboard.css';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const POLL_INTERVAL_MS = 25000;

const initialsFrom = (name = '') =>
  name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

function timeAgo(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  const now = new Date();
  const sec = Math.floor((now - date) / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr !== 1 ? 's' : ''} ago`;
  const day = Math.floor(hr / 24);
  return `${day} day${day !== 1 ? 's' : ''} ago`;
}

function activityIcon(eventType, priority) {
  if (eventType === 'report_generated') return '🩹';
  if (eventType === 'checkin_completed') return '✓';
  if (eventType === 'profile_created') return '👤';
  return priority === 'high' ? '⚠' : '📋';
}

export default function DoctorOverview() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    const doctorId = sessionStorage.getItem('mediguard_user_id');
    if (!doctorId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API}/doctor/${doctorId}/overview`);
      if (!res.ok) return;
      const data = await res.json();
      setOverview(data);
    } catch {
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    const interval = setInterval(loadOverview, POLL_INTERVAL_MS);
    const onFocus = () => loadOverview();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [loadOverview]);

  const highRisk = overview?.high_risk_patients ?? [];
  const activity = overview?.recent_activity ?? [];

  return (
    <div className="doctor-page page-enter">
      <div className="doctor-overview-header">
        <h1 className="doctor-overview-title">Dashboard Overview</h1>
        <p className="doctor-overview-subtitle">Live updates when patients create accounts, complete check-ins, and generate reports.</p>
      </div>
      {loading && !overview ? (
        <p className="doctor-overview-loading">Loading…</p>
      ) : (
        <>
          <div className="doctor-metrics">
            <div className="doctor-metric-card">
              <span className="doctor-metric-icon" aria-hidden>👥</span>
              <span className="doctor-metric-value">{overview?.total_patients ?? 0}</span>
              <span className="doctor-metric-label">Total Patients</span>
              <span className="doctor-metric-desc">Active monitoring</span>
            </div>
            <div className="doctor-metric-card doctor-metric-card-danger">
              <span className="doctor-metric-icon" aria-hidden>⚠</span>
              <span className="doctor-metric-value">{overview?.high_risk_count ?? 0}</span>
              <span className="doctor-metric-label">High Risk Alerts</span>
              <span className="doctor-metric-desc">Require attention</span>
            </div>
            <div className="doctor-metric-card">
              <span className="doctor-metric-icon" aria-hidden>📈</span>
              <span className="doctor-metric-value">{overview?.recent_reports_24h ?? 0}</span>
              <span className="doctor-metric-label">Recent Reports</span>
              <span className="doctor-metric-desc">Last 24 hours</span>
            </div>
            <div className="doctor-metric-card doctor-metric-card-success">
              <span className="doctor-metric-icon" aria-hidden>✓</span>
              <span className="doctor-metric-value">{overview?.avg_adherence ?? 0}%</span>
              <span className="doctor-metric-label">Avg. Adherence</span>
              <span className="doctor-metric-desc">Medication compliance</span>
            </div>
          </div>
          <div className="doctor-two-col">
            <section className="doctor-section">
              <div className="doctor-section-header">
                <h2 className="section-title">High Risk Patients</h2>
                <Link to="/doctor/patients" className="doctor-view-all">View All →</Link>
              </div>
              <div className="dashboard-card doctor-list-card">
                {highRisk.length === 0 ? (
                  <p className="doctor-overview-empty">No high-risk patients right now.</p>
                ) : (
                  highRisk.map((p) => (
                    <div key={p.patient_id} className="high-risk-row">
                      <span className="high-risk-avatar">{initialsFrom(p.name)}</span>
                      <div className="high-risk-info">
                        <strong>{p.name || '—'}</strong>
                        <span className="high-risk-meta">{p.age != null ? `${p.age} years` : '—'}</span>
                        <span className="high-risk-conditions">
                          {Array.isArray(p.conditions) ? p.conditions.join(', ') : '—'}
                        </span>
                        <span className="high-risk-adherence">
                          {p.has_report ? 'Report ready' : 'No report yet'}
                        </span>
                      </div>
                      <span className="badge badge-danger">High Risk</span>
                    </div>
                  ))
                )}
              </div>
            </section>
            <section className="doctor-section">
              <h2 className="section-title">Recent Activity</h2>
              <div className="dashboard-card doctor-activity-card">
                <ul className="activity-list">
                  {activity.length === 0 ? (
                    <li className="activity-item activity-item-empty">No recent activity.</li>
                  ) : (
                    activity.map((a) => (
                      <li key={a.id} className="activity-item">
                        <span
                          className="activity-icon"
                          aria-hidden
                        >
                          {activityIcon(a.event_type, a.priority)}
                        </span>
                        <div className="activity-body">
                          <span className="activity-text">{a.message}</span>
                          {a.patient_name && (
                            <span className="activity-patient">{a.patient_name}</span>
                          )}
                          {a.priority && (
                            <span className={`activity-priority activity-priority-${a.priority}`}>
                              {a.priority === 'high' ? 'High Priority' : 'Medium Priority'}
                            </span>
                          )}
                          <span className="activity-time">{timeAgo(a.created_at)}</span>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
