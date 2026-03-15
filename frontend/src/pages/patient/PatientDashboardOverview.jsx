import { Link, useOutletContext } from 'react-router-dom';

const RECENT_SYMPTOMS = [
  { name: 'Mild headache', count: 2 },
  { name: 'Fatigue', count: 1 },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function firstName(fullName) {
  if (!fullName) return 'Patient';
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export default function PatientDashboardOverview() {
  const { profile } = useOutletContext() || {};
  const name = profile?.name || sessionStorage.getItem('mediguard_displayName') || 'Patient';
  const medications = profile?.medications || [];
  const primaryCondition = profile?.conditions?.[0];
  const age = profile?.age;

  return (
    <div className="patient-content page-enter">
      <div className="patient-greeting-row">
        <div className="patient-greeting">
          <span className="patient-greeting-icon">🌙</span>
          <span className="patient-greeting-text">{getGreeting()}</span>
        </div>
        <h1 className="patient-name">{firstName(name)}</h1>
        <div className="patient-health-card">
          <span className="patient-health-label">Overall Health Status</span>
          <span className="patient-health-value">
            {primaryCondition && age != null ? `${primaryCondition} · ${age}y` : primaryCondition || (age != null ? `${age} years` : 'Excellent')}
          </span>
          <span className="patient-health-icon" aria-hidden>📈</span>
        </div>
      </div>
      <div className="patient-two-col">
        <section className="patient-section">
          <div className="patient-section-header">
            <h2 className="section-title">Your Medications</h2>
            {medications.length > 0 && (
              <span className="patient-med-progress">
                {medications.length} listed
              </span>
            )}
          </div>
          <div className="dashboard-card patient-med-list">
            {medications.length === 0 ? (
              <p className="patient-meds-empty-overview">
                No medications in your profile yet.{' '}
                <Link to="/dashboard/profile">Add them in Profile</Link>.
              </p>
            ) : (
              medications.map((med, i) => (
                <div key={i} className="patient-med-item">
                  <span className="patient-med-check patient-med-check-done">✓</span>
                  <div className="patient-med-details">
                    <strong>{med}</strong>
                  </div>
                </div>
              ))
            )}
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
                {RECENT_SYMPTOMS.map((s, i) => (
                  <li key={i} className="patient-symptom-item">
                    <span className="patient-symptom-name">{s.name}</span>
                    <span className="patient-symptom-count">{s.count}x</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
