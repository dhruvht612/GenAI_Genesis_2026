import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function PatientDashboardOverview() {
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    const patientId = sessionStorage.getItem('mediguard_user_id');
    if (!patientId) return;

    const load = async () => {
      try {
        const res = await fetch(`${API}/patient/${patientId}/overview`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || 'Failed to load overview');
        setOverview(data);
      } catch {
        setOverview(null);
      }
    };

    load();
  }, []);

  const todaysMeds = useMemo(() => {
    const meds = overview?.medication_plan || [];
    return meds.map((m) => {
      const parts = (m.name || '').split(' ');
      return {
        name: parts.slice(0, -1).join(' ') || m.name,
        dosage: parts.slice(-1).join(' '),
        time: m.time || 'N/A',
        completed: Boolean(m.completed),
      };
    });
  }, [overview]);

  const recentSymptoms = overview?.symptoms_log || [];
  const patientName = overview?.name || sessionStorage.getItem('mediguard_displayName') || 'Patient';

  return (
    <div className="patient-content page-enter">
      <div className="patient-greeting-row">
        <div className="patient-greeting">
          <span className="patient-greeting-icon">🌙</span>
          <span className="patient-greeting-text">{getGreeting()}</span>
        </div>
        <h1 className="patient-name">{patientName.split(' ')[0]}</h1>
        <div className="patient-health-card">
          <span className="patient-health-label">Overall Health Status</span>
          <span className="patient-health-value">Excellent</span>
          <span className="patient-health-icon" aria-hidden>📈</span>
        </div>
      </div>
      <div className="patient-two-col">
        <section className="patient-section">
          <div className="patient-section-header">
            <h2 className="section-title">Today&apos;s Medications</h2>
            <span className="patient-med-progress">
              {todaysMeds.filter((m) => m.completed).length}/{todaysMeds.length || 0} Completed
            </span>
          </div>
          <div className="dashboard-card patient-med-list">
            {todaysMeds.map((med, i) => (
              <div key={i} className="patient-med-item">
                <span className={`patient-med-check ${med.completed ? 'patient-med-check-done' : ''}`}>
                  {med.completed ? '✓' : ''}
                </span>
                <div className="patient-med-details">
                  <strong>{med.name} {med.dosage}</strong>
                  <span className="patient-med-time">{med.time}</span>
                </div>
                <button type="button" className="patient-med-link" aria-label="View details">🔗</button>
              </div>
            ))}
            {todaysMeds.length === 0 && <p className="patient-symptoms-subtitle">No medications in profile yet.</p>}
          </div>
        </section>
        <div className="patient-right-col">
          <Link to="/dashboard/check-in" className="patient-daily-task-card patient-daily-task-link">
            <span className="patient-daily-task-label">DAILY TASK</span>
            <h3 className="patient-daily-task-title">Start AI Health Check-In</h3>
            <span className="patient-daily-task-icon" aria-hidden>✨</span>
          </Link>
          <section className="patient-section">
            <h2 className="section-title">Recent Symptoms</h2>
            <p className="patient-symptoms-subtitle">Last 7 days overview</p>
            <div className="dashboard-card patient-symptoms-card">
              <ul className="patient-symptoms-list">
                {recentSymptoms.map((s, i) => (
                  <li key={i} className="patient-symptom-item">
                    <span className="patient-symptom-name">{s.name || 'Symptom'}</span>
                    <span className="patient-symptom-count">{s.count}x</span>
                  </li>
                ))}
                {recentSymptoms.length === 0 && <li className="patient-symptom-item"><span className="patient-symptom-name">No symptoms logged</span></li>}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
