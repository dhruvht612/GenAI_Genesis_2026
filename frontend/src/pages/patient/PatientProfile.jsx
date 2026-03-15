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
          name: name.trim() || sessionDisplayName,
          age: age.trim() ? parseInt(age, 10) : 0,
          conditions: primaryCondition ? [primaryCondition] : [],
          medications: medications.filter(Boolean),
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
            <h2 className="profile-name">{name || sessionDisplayName}</h2>
            <p className="profile-id">Patient ID: {userId ? `#${userId}` : '—'}</p>
            <div className="profile-contact">
              <p><span className="profile-contact-icon">✉</span> {sessionEmail || '—'}</p>
              {phone && <p><span className="profile-contact-icon">📞</span> {phone}</p>}
              {(address || city) && (
                <p><span className="profile-contact-icon">📍</span> {[address, city, province, postalCode].filter(Boolean).join(', ')}</p>
              )}
            </div>
          </div>
          <div className="dashboard-card profile-edit-card">
            <h3 className="profile-card-heading">Edit profile</h3>
            {loading ? (
              <p className="profile-loading">Loading...</p>
            ) : (
              <form onSubmit={handleSave} className="profile-edit-form">
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
                  />
                </div>
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
                  <label>Medications</label>
                  <MedicationTagInput
                    value={medications}
                    onChange={setMedications}
                    placeholder="Type medication and press Enter"
                  />
                </div>
                {saveMessage && (
                  <p className={`profile-save-msg ${saveMessage.includes('updated') ? 'profile-save-msg-ok' : 'profile-save-msg-err'}`}>
                    {saveMessage}
                  </p>
                )}
                <button type="submit" className="profile-save-btn" disabled={saving}>
                  {saving ? 'Saving...' : 'Update profile'}
                </button>
              </form>
            )}
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
            <h3 className="profile-card-heading">👤 Health summary</h3>
            <div className="profile-health-rows">
              <div className="profile-health-row profile-health-row-static">
                <span>Age</span>
                <span className="profile-health-value">{age ? `${age} years` : '—'}</span>
              </div>
              <div className="profile-health-row profile-health-row-static">
                <span>Condition</span>
                <span className="profile-health-value">{primaryCondition || '—'}</span>
              </div>
            </div>
          </div>
          <div className="dashboard-card profile-meds-card">
            <h3 className="profile-card-heading">💊 Active medications</h3>
            {medications.length === 0 ? (
              <p className="profile-meds-empty">No medications listed. Add them in the form to the left.</p>
            ) : (
              medications.map((m, i) => (
                <div key={i} className="profile-med-row">
                  <strong>{m}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
