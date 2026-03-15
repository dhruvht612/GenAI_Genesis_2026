const HIGH_RISK_PATIENTS = [
  { id: 1, name: 'Sarah Johnson', initials: 'SJ', age: 45, gender: 'Female', conditions: 'Hypertension, Type 2 Diabetes', adherence: 72, updated: '2 hours ago' },
  { id: 2, name: 'James Wilson', initials: 'JW', age: 71, gender: 'Male', conditions: 'Heart Failure, Atrial Fibrillation, Hypertension', adherence: 68, updated: '3 hours ago' },
];

const RECENT_ACTIVITY = [
  { id: 1, patient: 'Sarah Johnson', icon: 'injury', text: 'Reported severe headache and dizziness', priority: 'high', time: '2 hours ago' },
  { id: 2, patient: 'James Wilson', icon: 'med', text: 'Missed Warfarin dose for 2 consecutive days', priority: 'high', time: '3 hours ago' },
  { id: 3, patient: 'Michael Chen', icon: 'check', text: 'Completed daily symptom check-in', priority: null, time: '5 hours ago' },
  { id: 4, patient: 'David Martinez', icon: 'lab', text: 'Blood sugar reading: 185 mg/dl (elevated)', priority: 'medium', time: '4 hours ago' },
  { id: 5, patient: 'Lisa Anderson', icon: 'check', text: 'Completed daily symptom check-in', priority: null, time: '6 hours ago' },
];

export default function DoctorOverview() {
  return (
    <div className="doctor-page page-enter">
      <div className="doctor-overview-header">
        <h1 className="doctor-overview-title">Dashboard Overview</h1>
        <p className="doctor-overview-subtitle">Monitor your patients and manage their care</p>
      </div>
      <div className="doctor-metrics">
        <div className="doctor-metric-card">
          <span className="doctor-metric-icon" aria-hidden>👥</span>
          <span className="doctor-metric-value">6</span>
          <span className="doctor-metric-label">Total Patients</span>
          <span className="doctor-metric-desc">Active monitoring</span>
        </div>
        <div className="doctor-metric-card doctor-metric-card-danger">
          <span className="doctor-metric-icon" aria-hidden>⚠</span>
          <span className="doctor-metric-value">2</span>
          <span className="doctor-metric-label">High Risk Alerts</span>
          <span className="doctor-metric-desc">Require attention</span>
        </div>
        <div className="doctor-metric-card">
          <span className="doctor-metric-icon" aria-hidden>📈</span>
          <span className="doctor-metric-value">2</span>
          <span className="doctor-metric-label">Recent Reports</span>
          <span className="doctor-metric-desc">Last 24 hours</span>
        </div>
        <div className="doctor-metric-card doctor-metric-card-success">
          <span className="doctor-metric-icon" aria-hidden>✓</span>
          <span className="doctor-metric-value">82%</span>
          <span className="doctor-metric-label">Avg. Adherence</span>
          <span className="doctor-metric-desc">Medication compliance</span>
        </div>
      </div>
      <div className="doctor-two-col">
        <section className="doctor-section">
          <div className="doctor-section-header">
            <h2 className="section-title">High Risk Patients</h2>
            <a href="#view-all" className="doctor-view-all">View All →</a>
          </div>
          <div className="dashboard-card doctor-list-card">
            {HIGH_RISK_PATIENTS.map((p) => (
              <div key={p.id} className="high-risk-row">
                <span className="high-risk-avatar">{p.initials}</span>
                <div className="high-risk-info">
                  <strong>{p.name}</strong>
                  <span className="high-risk-meta">{p.age} years • {p.gender}</span>
                  <span className="high-risk-conditions">{p.conditions}</span>
                  <span className="high-risk-adherence">Adherence: {p.adherence}% • {p.updated}</span>
                </div>
                <span className="badge badge-danger">High Risk</span>
              </div>
            ))}
          </div>
        </section>
        <section className="doctor-section">
          <h2 className="section-title">Recent Activity</h2>
          <div className="dashboard-card doctor-activity-card">
            <ul className="activity-list">
              {RECENT_ACTIVITY.map((a) => (
                <li key={a.id} className="activity-item">
                  <span className={`activity-icon activity-icon-${a.icon}`} aria-hidden>
                    {a.icon === 'check' && '✓'}
                    {a.icon === 'injury' && '🩹'}
                    {a.icon === 'med' && '💊'}
                    {a.icon === 'lab' && '🩸'}
                  </span>
                  <div className="activity-body">
                    <span className="activity-text">{a.text}</span>
                    {a.priority && (
                      <span className={`activity-priority activity-priority-${a.priority}`}>
                        {a.priority === 'high' ? 'High Priority' : 'Medium Priority'}
                      </span>
                    )}
                    <span className="activity-time">{a.time}</span>
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
