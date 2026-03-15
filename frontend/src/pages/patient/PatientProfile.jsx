import { useEffect, useState } from 'react';
import MedicationTagInput from '../../components/MedicationTagInput';
import { useTheme } from '../../contexts/ThemeContext';
import './PatientProfile.css';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export default function PatientProfile() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [overview, setOverview] = useState(null);
  const [conditions, setConditions] = useState([]);
  const [medications, setMedications] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState('');
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const patientId = sessionStorage.getItem('mediguard_user_id');
    if (!patientId) return;

    const load = async () => {
      try {
        const res = await fetch(`${API}/patient/${patientId}/overview`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || 'Failed to load profile');
        setOverview(data);
      } catch {
        setOverview(null);
      }
    };

    load();
  }, []);

  const reloadOverview = async () => {
    const id = sessionStorage.getItem('mediguard_user_id');
    if (!id) return;
    const res = await fetch(`${API}/patient/${id}/overview`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || 'Failed to load profile');
    setOverview(data);
  };

  const displayName = overview?.name || sessionStorage.getItem('mediguard_displayName') || 'Patient';
  const patientId = overview?.patient_id || sessionStorage.getItem('mediguard_user_id') || 'N/A';
  const contact = overview?.contact || {};
  const meds = overview?.medication_plan || [];
  const conditionsList = overview?.conditions || [];

  useEffect(() => {
    if (!overview) return;
    setConditions(overview.conditions || []);
    setMedications(overview.medications || []);
  }, [overview]);

  const saveClinicalProfile = async () => {
    const id = sessionStorage.getItem('mediguard_user_id');
    if (!id) return;

    setSavingProfile(true);
    setProfileStatus('');
    try {
      const res = await fetch(`${API}/patient/${id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditions, medications }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Failed to save profile');
      setProfileStatus('Profile updated');
      await reloadOverview();
    } catch {
      setProfileStatus('Could not update profile');
    } finally {
      setSavingProfile(false);
    }
  };

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
            <h2 className="profile-name">{displayName}</h2>
            <p className="profile-id">Patient ID: #{patientId}</p>
            <div className="profile-contact">
              <p><span className="profile-contact-icon">✉</span> {contact.email || sessionStorage.getItem('mediguard_email') || 'N/A'}</p>
              <p><span className="profile-contact-icon">📞</span> {contact.phone || 'N/A'}</p>
              <p><span className="profile-contact-icon">📍</span> {overview?.location || 'N/A'}</p>
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
                aria-checked={theme === 'dark'}
                className={`profile-toggle ${theme === 'dark' ? 'profile-toggle-on' : ''}`}
                onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
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
                <span className="profile-health-value">{overview?.age ? `${overview.age} years` : 'Unknown'}</span>
                <span className="profile-health-arrow">→</span>
              </a>
              <a href="#blood" className="profile-health-row">
                <span>Blood Type</span>
                <span className="profile-health-value">{overview?.blood_type || 'Unknown'}</span>
                <span className="profile-health-arrow">→</span>
              </a>
              <a href="#allergies" className="profile-health-row">
                <span>Allergies</span>
                <span className="profile-health-value">{(overview?.allergies || []).join(', ') || 'None listed'}</span>
                <span className="profile-health-arrow">→</span>
              </a>
            </div>
          </div>
          <div className="dashboard-card profile-meds-card">
            <h3 className="profile-card-heading">🩺 Clinical Profile</h3>
            <p className="profile-notifications-placeholder">Add or update your conditions and medications here. Your doctor and AI check-in will use this data.</p>

            <p className="profile-card-heading" style={{ marginTop: '0.8rem' }}>Conditions</p>
            <MedicationTagInput
              value={conditions}
              onChange={setConditions}
              placeholder="Type condition and press Enter (e.g. Asthma)"
            />

            <p className="profile-card-heading" style={{ marginTop: '0.8rem' }}>Medications</p>
            <MedicationTagInput
              value={medications}
              onChange={setMedications}
              placeholder="Type medication and press Enter (e.g. Albuterol inhaler)"
            />

            <div className="profile-add-medication-row" style={{ marginTop: '0.9rem' }}>
              <button type="button" className="profile-add-medication-btn" onClick={saveClinicalProfile} disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save Clinical Profile'}
              </button>
            </div>
            {profileStatus && <p className="profile-notifications-placeholder">{profileStatus}</p>}

            {conditionsList.length > 0 && (
              <p className="profile-notifications-placeholder" style={{ marginTop: '0.8rem' }}>
                Active conditions: {conditionsList.join(', ')}
              </p>
            )}

            {meds.map((m, i) => (
              <div key={i} className="profile-med-row">
                <strong>{m.name}</strong>
                <span className="profile-med-for">For: {m.for || 'Condition management'}</span>
                <span className="profile-med-reminder">Daily at {m.time || 'N/A'}</span>
              </div>
            ))}
            {meds.length === 0 && <p className="profile-notifications-placeholder">No active medications in profile.</p>}
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
