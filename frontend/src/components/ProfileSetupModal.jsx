import { useState } from 'react';
import './ProfileSetupModal.css';

const PENDING_KEY = 'mediguard_pending_profile';

export function getPendingProfile() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingProfile() {
  sessionStorage.removeItem(PENDING_KEY);
}

export function setPendingProfile(profile) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(profile));
}

const PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
  'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon',
];

export default function ProfileSetupModal({ displayName: initialDisplayName, onComplete }) {
  const [displayName, setDisplayName] = useState(initialDisplayName || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    const profile = {
      displayName: displayName.trim() || initialDisplayName,
      phone: phone.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      province: province.trim() || null,
      postalCode: postalCode.trim() || null,
      medications: [],
    };
    setPendingProfile(profile);
    setSaving(false);
    onComplete?.();
  };

  return (
    <div className="profile-setup-overlay" role="dialog" aria-modal="true" aria-labelledby="profile-setup-title">
      <div className="profile-setup-backdrop" />
      <div className="profile-setup-modal">
        <h2 id="profile-setup-title" className="profile-setup-title">Set up your profile</h2>
        <p className="profile-setup-subtitle">Add your contact and address details.</p>
        <form onSubmit={handleSubmit} className="profile-setup-form">
          <div className="profile-setup-field">
            <label htmlFor="profile-setup-name">Display name</label>
            <input
              id="profile-setup-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How we should call you"
              className="profile-setup-input"
            />
          </div>
          <div className="profile-setup-field">
            <label htmlFor="profile-setup-phone">Phone number</label>
            <input
              id="profile-setup-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. (555) 123-4567"
              className="profile-setup-input"
            />
          </div>
          <div className="profile-setup-field">
            <label htmlFor="profile-setup-address">Street address</label>
            <input
              id="profile-setup-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street and number"
              className="profile-setup-input"
            />
          </div>
          <div className="profile-setup-row">
            <div className="profile-setup-field">
              <label htmlFor="profile-setup-city">City</label>
              <input
                id="profile-setup-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="profile-setup-input"
              />
            </div>
            <div className="profile-setup-field">
              <label htmlFor="profile-setup-province">Province</label>
              <select
                id="profile-setup-province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="profile-setup-input"
              >
                <option value="">Select</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="profile-setup-field">
            <label htmlFor="profile-setup-postal">Postal code</label>
            <input
              id="profile-setup-postal"
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="e.g. M5V 3A8"
              className="profile-setup-input"
              maxLength={7}
            />
          </div>
          <button type="submit" className="profile-setup-submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save and continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
