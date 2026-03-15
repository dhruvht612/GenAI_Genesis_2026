import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import MedicationTagInput from '../../components/MedicationTagInput';
import './PatientProfile.css';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const PRIMARY_CONDITIONS = [
  'Type 2 Diabetes',
  'Hypertension',
  'High Cholesterol',
  'Asthma',
  'COPD',
  'Heart Disease',
  'Other',
];

export default function PatientProfile() {
  const { profile: contextProfile, setProfile: setContextProfile, refetchProfile } = useOutletContext() || {};
  const userId = sessionStorage.getItem('mediguard_user_id');
  const sessionEmail = sessionStorage.getItem('mediguard_email');
  const sessionDisplayName = sessionStorage.getItem('mediguard_displayName') || 'Patient';

  const [loading, setLoading] = useState(!!userId);
  const [name, setName] = useState(sessionDisplayName);
  const [age, setAge] = useState('');
  const [primaryCondition, setPrimaryCondition] = useState('');
  const [medications, setMedications] = useState([]);
  const [phone, setPhone] = useState(sessionStorage.getItem('mediguard_phone') || '');
  const [address, setAddress] = useState(sessionStorage.getItem('mediguard_address') || '');
  const [city, setCity] = useState(sessionStorage.getItem('mediguard_city') || '');
  const [province, setProvince] = useState(sessionStorage.getItem('mediguard_province') || '');
  const [postalCode, setPostalCode] = useState(sessionStorage.getItem('mediguard_postalCode') || '');
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    if (contextProfile) {
      if (contextProfile.name) setName(contextProfile.name);
      if (contextProfile.age != null) setAge(String(contextProfile.age));
      if (contextProfile.conditions?.length) setPrimaryCondition(contextProfile.conditions[0]);
      if (Array.isArray(contextProfile.medications)) setMedications(contextProfile.medications);
      setLoading(false);
      return;
    }
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/patient/${userId}`);
        if (cancelled) return;
        if (!res.ok) {
          if (res.status === 404) {
            setLoading(false);
            return;
          }
          throw new Error('Failed to load profile');
        }
        const data = await res.json();
        if (cancelled) return;
        if (data.name) setName(data.name);
        if (data.age != null) setAge(String(data.age));
        if (data.conditions?.length) setPrimaryCondition(data.conditions[0]);
        if (Array.isArray(data.medications)) setMedications(data.medications);
      } catch (_) {
        if (!cancelled) setLoading(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, contextProfile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveMessage(null);
    setSaving(true);
    try {
      const res = await fetch(`${API}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          assigned_doctor_id: sessionStorage.getItem('mediguard_assigned_doctor_id') || 'DR-1001',
          name: name.trim() || sessionDisplayName,
          age: age.trim() ? parseInt(age, 10) : 0,
          conditions: primaryCondition ? [primaryCondition] : [],
          medications: medications.filter(Boolean),
          email: sessionStorage.getItem('mediguard_email') || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          province: province.trim() || undefined,
          postal_code: postalCode.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const displayName = name.trim() || sessionDisplayName;
      sessionStorage.setItem('mediguard_displayName', displayName);
      const updatedProfile = {
        name: displayName,
        age: age.trim() ? parseInt(age, 10) : null,
        conditions: primaryCondition ? [primaryCondition] : [],
        medications: medications.filter(Boolean),
      };
      if (setContextProfile) setContextProfile(updatedProfile);
      if (refetchProfile) refetchProfile();
      sessionStorage.setItem('mediguard_phone', phone.trim());
      sessionStorage.setItem('mediguard_address', address.trim());
      sessionStorage.setItem('mediguard_city', city.trim());
      sessionStorage.setItem('mediguard_province', province.trim());
      sessionStorage.setItem('mediguard_postalCode', postalCode.trim());
      setSaveMessage('Profile updated.');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (_) {
      setSaveMessage('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const initials = (name || sessionDisplayName)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase() || 'PT';

  return (
    <div className="patient-page patient-profile page-enter">
      <header className="profile-header">
        <h1 className="profile-title">Profile &amp; Settings</h1>
        <p className="profile-subtitle">Manage your health profile and preferences</p>
      </header>
      <div className="profile-grid">
        <div className="profile-left">
          <div className="dashboard-card profile-hero-card">
            <div className="profile-hero-avatar" aria-hidden>{initials}</div>
            <h2 className="profile-hero-name">{name || sessionDisplayName}</h2>
            <p className="profile-hero-id">Patient ID {userId ? `#${userId}` : '—'}</p>
            <div className="profile-hero-contact">
              <p className="profile-hero-contact-line">
                <span className="profile-hero-contact-icon" aria-hidden>✉</span>
                <span>{sessionEmail || '—'}</span>
              </p>
              {phone && (
                <p className="profile-hero-contact-line">
                  <span className="profile-hero-contact-icon" aria-hidden>📞</span>
                  <span>{phone}</span>
                </p>
              )}
              {(address || city) && (
                <p className="profile-hero-contact-line">
                  <span className="profile-hero-contact-icon" aria-hidden>📍</span>
                  <span>{[address, city, province, postalCode].filter(Boolean).join(', ')}</span>
                </p>
              )}
            </div>
          </div>
          <div className="dashboard-card profile-edit-card">
            <h3 className="profile-section-title">Edit profile</h3>
            <p className="profile-section-desc">Update your personal and health information.</p>
            {loading ? (
              <div className="profile-loading-wrap" aria-live="polite">
                <span className="profile-loading-dot" />
                <span className="profile-loading-dot" />
                <span className="profile-loading-dot" />
                <span className="profile-loading-text">Loading...</span>
              </div>
            ) : (
              <form onSubmit={handleSave} className="profile-edit-form">
                <fieldset className="profile-fieldset">
                  <legend className="profile-legend">Personal</legend>
                  <div className="profile-edit-field">
                    <label htmlFor="profile-name">Display name</label>
                    <input
                      id="profile-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="profile-edit-input"
                      placeholder="Your name"
                    />
                  </div>
                  <div className="profile-edit-field">
                    <label htmlFor="profile-age">Age</label>
                    <input
                      id="profile-age"
                      type="number"
                      min={1}
                      max={120}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="profile-edit-input"
                      placeholder="e.g. 45"
                      aria-describedby="profile-age-desc"
                    />
                    <span id="profile-age-desc" className="profile-field-hint">Optional</span>
                  </div>
                </fieldset>
                <fieldset className="profile-fieldset">
                  <legend className="profile-legend">Contact &amp; address</legend>
                  <div className="profile-edit-field">
                    <label htmlFor="profile-phone">Phone number</label>
                    <input
                      id="profile-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="profile-edit-input"
                      placeholder="e.g. (555) 123-4567"
                    />
                  </div>
                <div className="profile-edit-field">
                  <label htmlFor="profile-address">Street address</label>
                  <input
                    id="profile-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="profile-edit-input"
                    placeholder="Street and number"
                  />
                </div>
                <div className="profile-edit-row">
                  <div className="profile-edit-field">
                    <label htmlFor="profile-city">City</label>
                    <input
                      id="profile-city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="profile-edit-input"
                      placeholder="City"
                    />
                  </div>
                  <div className="profile-edit-field">
                    <label htmlFor="profile-province">Province</label>
                    <select
                      id="profile-province"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="profile-edit-input"
                    >
                      <option value="">Select</option>
                      {['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
                  <div className="profile-edit-field">
                    <label htmlFor="profile-postal">Postal code</label>
                    <input
                      id="profile-postal"
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="profile-edit-input"
                      placeholder="e.g. M5V 3A8"
                      maxLength={7}
                    />
                  </div>
                </fieldset>
                <fieldset className="profile-fieldset">
                  <legend className="profile-legend">Health</legend>
                  <div className="profile-edit-field">
                    <label htmlFor="profile-condition">Primary condition</label>
                    <select
                      id="profile-condition"
                      value={primaryCondition}
                      onChange={(e) => setPrimaryCondition(e.target.value)}
                      className="profile-edit-input"
                    >
                      <option value="">Select condition</option>
                      {PRIMARY_CONDITIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="profile-edit-field">
                    <label htmlFor="profile-medications">Medications</label>
                    <MedicationTagInput
                      value={medications}
                      onChange={setMedications}
                      placeholder="Type medication and press Enter"
                    />
                    <span className="profile-field-hint">Press Enter to add each medication</span>
                  </div>
                </fieldset>
                {saveMessage && (
                  <p role="status" className={`profile-save-msg ${saveMessage.includes('updated') ? 'profile-save-msg-ok' : 'profile-save-msg-err'}`}>
                    {saveMessage}
                  </p>
                )}
                <button type="submit" className="profile-save-btn" disabled={saving} aria-busy={saving}>
                  {saving ? 'Saving...' : 'Update profile'}
                </button>
              </form>
            )}
          </div>
          <div className="dashboard-card profile-settings-card">
            <h3 className="profile-section-title">App Settings</h3>
            <p className="profile-section-desc">Notifications and display preferences.</p>
            <div className="profile-toggle-row">
              <span className="profile-toggle-icon" aria-hidden>🔔</span>
              <div className="profile-toggle-text">
                <span className="profile-toggle-label">Push Notifications</span>
                <span className="profile-toggle-desc">Get reminders for check-ins and medications</span>
              </div>
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
              <span className="profile-toggle-icon" aria-hidden>☀</span>
              <div className="profile-toggle-text">
                <span className="profile-toggle-label">Dark Mode</span>
                <span className="profile-toggle-desc">Use dark theme across the app</span>
              </div>
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
          <div className="dashboard-card profile-summary-card">
            <h3 className="profile-section-title">Health summary</h3>
            <div className="profile-summary-list">
              <div className="profile-summary-item">
                <span className="profile-summary-label">Age</span>
                <span className="profile-summary-value">{age ? `${age} years` : '—'}</span>
              </div>
              <div className="profile-summary-item">
                <span className="profile-summary-label">Condition</span>
                <span className="profile-summary-value">{primaryCondition || '—'}</span>
              </div>
            </div>
          </div>
          <div className="dashboard-card profile-meds-card">
            <h3 className="profile-section-title">Active medications</h3>
            {medications.length === 0 ? (
              <div className="profile-meds-empty-state">
                <span className="profile-meds-empty-icon" aria-hidden>💊</span>
                <p className="profile-meds-empty-text">No medications listed yet.</p>
                <p className="profile-meds-empty-hint">Add them in the Edit profile form.</p>
              </div>
            ) : (
              <ul className="profile-meds-list">
                {medications.map((m, i) => (
                  <li key={i} className="profile-med-item">
                    <span className="profile-med-bullet" aria-hidden>•</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
