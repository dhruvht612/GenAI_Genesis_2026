import { useState, useEffect } from 'react';
import '../Dashboard.css';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export default function DoctorProfile() {
  const doctorId = sessionStorage.getItem('mediguard_user_id');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!!doctorId);
  const [displayName, setDisplayName] = useState(sessionStorage.getItem('mediguard_displayName') || '');
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    if (!doctorId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/doctor/${doctorId}/profile`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          if (data.display_name) setDisplayName(data.display_name);
        }
      } catch (_) {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [doctorId]);

  const handleSaveDisplayName = (e) => {
    e.preventDefault();
    const name = displayName.trim() || profile?.display_name || 'Doctor';
    setDisplayName(name);
    sessionStorage.setItem('mediguard_displayName', name);
    setSaveMessage('Display name updated.');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const initials = (displayName || profile?.display_name || 'DR')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'DR';

  const createdDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="doctor-page doctor-profile-page page-enter">
      <h1 className="doctor-page-title">Profile</h1>
      <p className="doctor-profile-desc">Your account and professional details.</p>

      {loading && !profile ? (
        <p className="doctor-profile-loading">Loading profile…</p>
      ) : (
        <div className="doctor-profile-layout">
          <div className="dashboard-card doctor-profile-hero">
            <div className="doctor-profile-avatar-wrap">
              <span className="doctor-profile-avatar">{initials}</span>
            </div>
            <div className="doctor-profile-hero-info">
              <h2 className="doctor-profile-name">{profile?.display_name || displayName || 'Doctor'}</h2>
              <p className="doctor-profile-email">{profile?.email || sessionStorage.getItem('mediguard_email') || '—'}</p>
              <p className="doctor-profile-id">ID: {profile?.doctor_id || doctorId || '—'}</p>
              {createdDate && (
                <p className="doctor-profile-joined">Member since {createdDate}</p>
              )}
            </div>
          </div>

          <div className="dashboard-card doctor-profile-card">
            <h3 className="doctor-profile-card-title">Personal information</h3>
            <p className="doctor-profile-card-hint">Update how your name appears in the portal.</p>
            <form onSubmit={handleSaveDisplayName} className="doctor-profile-form">
              <label className="doctor-profile-label" htmlFor="doctor-display-name">
                Display name
              </label>
              <div className="doctor-profile-field-row">
                <input
                  id="doctor-display-name"
                  type="text"
                  className="doctor-profile-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Dr. Smith"
                />
                <button type="submit" className="doctor-profile-save-btn">
                  Save
                </button>
              </div>
              {saveMessage && <p className="doctor-profile-save-msg">{saveMessage}</p>}
            </form>
          </div>

          <div className="dashboard-card doctor-profile-card">
            <h3 className="doctor-profile-card-title">Account details</h3>
            <dl className="doctor-profile-dl">
              <dt>Email</dt>
              <dd>{profile?.email || sessionStorage.getItem('mediguard_email') || '—'}</dd>
              <dt>Doctor ID</dt>
              <dd>{profile?.doctor_id || doctorId || '—'}</dd>
              <dt>Role</dt>
              <dd>Doctor</dd>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
