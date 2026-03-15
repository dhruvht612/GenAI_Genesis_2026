import { useState } from 'react';
import './PatientProfile.css';

const ACTIVE_MEDS = [
  { name: 'Lisinopril 10mg', for: 'High Blood Pressure', reminder: 'Daily at 8:00 AM' },
  { name: 'Metformin 500mg', for: 'Type 2 Diabetes', reminder: 'Daily at 8:00 AM' },
  { name: 'Atorvastatin 20mg', for: 'High Cholesterol', reminder: 'Daily at 9:00 PM' },
];

export default function PatientProfile() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="patient-page patient-profile page-enter">
      <div className="profile-header">
        <h1 className="profile-title">Profile &amp; Settings</h1>
        <p className="profile-subtitle">Manage your health profile and preferences</p>
      </div>
      <div className="profile-grid">
        <div className="profile-left">
          <div className="dashboard-card profile-card profile-card-teal">
            <span className="profile-card-icon">👤</span>
            <h2 className="profile-name">Maria Johnson</h2>
            <p className="profile-id">Patient ID: #MJ-2024-01</p>
            <div className="profile-contact">
              <p><span className="profile-contact-icon">✉</span> maria.johnson@email.com</p>
              <p><span className="profile-contact-icon">📞</span> +1 (555) 123-4567</p>
              <p><span className="profile-contact-icon">📍</span> Toronto, ON</p>
            </div>
          </div>
          <div className="dashboard-card profile-settings-card">
            <h3 className="profile-settings-title">App Settings</h3>
            <div className="profile-toggle-row">
              <span className="profile-toggle-icon">🔔</span>
              <span className="profile-toggle-label">Push Notifications</span>
              <button
                type="button"
                role="switch"
                aria-checked={pushNotifications}
                className={`profile-toggle ${pushNotifications ? 'profile-toggle-on' : ''}`}
                onClick={() => setPushNotifications((v) => !v)}
              >
                <span className="profile-toggle-dot" />
              </button>
            </div>
            <div className="profile-toggle-row">
              <span className="profile-toggle-icon">☀</span>
              <span className="profile-toggle-label">Dark Mode</span>
              <button
                type="button"
                role="switch"
                aria-checked={darkMode}
                className={`profile-toggle ${darkMode ? 'profile-toggle-on' : ''}`}
                onClick={() => setDarkMode((v) => !v)}
              >
                <span className="profile-toggle-dot" />
              </button>
            </div>
          </div>
        </div>
        <div className="profile-right">
          <div className="dashboard-card profile-health-card">
            <h3 className="profile-card-heading">👤 Health Information</h3>
            <div className="profile-health-rows">
              <a href="#age" className="profile-health-row">
                <span>Age</span>
                <span className="profile-health-value">41 years</span>
                <span className="profile-health-arrow">→</span>
              </a>
              <a href="#blood" className="profile-health-row">
                <span>Blood Type</span>
                <span className="profile-health-value">O-</span>
                <span className="profile-health-arrow">→</span>
              </a>
              <a href="#allergies" className="profile-health-row">
                <span>Allergies</span>
                <span className="profile-health-value">Penicillin</span>
                <span className="profile-health-arrow">→</span>
              </a>
            </div>
          </div>
          <div className="dashboard-card profile-meds-card">
            <h3 className="profile-card-heading">💊 Active Medications</h3>
            {ACTIVE_MEDS.map((m, i) => (
              <div key={i} className="profile-med-row">
                <strong>{m.name}</strong>
                <span className="profile-med-for">For: {m.for}</span>
                <span className="profile-med-reminder">{m.reminder}</span>
              </div>
            ))}
          </div>
          <div className="dashboard-card profile-notifications-card">
            <h3 className="profile-card-heading">🔔 Notification Times</h3>
            <p className="profile-notifications-placeholder">Set your preferred reminder times for medications and check-ins.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
