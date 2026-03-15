import { Link } from 'react-router-dom';

const TODAYS_MEDS = [
  { name: 'Lisinopril', dosage: '10mg', time: '8:00 AM', completed: true },
  { name: 'Metformin', dosage: '500mg', time: '8:00 AM', completed: true },
  { name: 'Atorvastatin', dosage: '20mg', time: '9:00 PM', completed: false },
];

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

export default function PatientDashboardOverview() {
  return (
    <div className="patient-content page-enter">
      <div className="patient-greeting-row">
        <div className="patient-greeting">
          <span className="patient-greeting-icon">🌙</span>
          <span className="patient-greeting-text">{getGreeting()}</span>
        </div>
        <h1 className="patient-name">Maria</h1>
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
              {TODAYS_MEDS.filter((m) => m.completed).length}/{TODAYS_MEDS.length} Completed
            </span>
          </div>
          <div className="dashboard-card patient-med-list">
            {TODAYS_MEDS.map((med, i) => (
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
