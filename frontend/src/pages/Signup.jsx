import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RoleSelector from '../components/RoleSelector';
import AuthSidePanel from '../components/AuthSidePanel';
import MedicationTagInput from '../components/MedicationTagInput';
import './Auth.css';

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

const SPECIALTIES = [
  'Family Medicine',
  'Internal Medicine',
  'Cardiology',
  'Endocrinology',
  'Other',
];

export default function Signup() {
  const navigate = useNavigate();
  const [role, setRole] = useState('patient');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [primaryCondition, setPrimaryCondition] = useState('');
  const [medications, setMedications] = useState([]);
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [terms, setTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Signup failed');

      if (role === 'patient') {
        localStorage.setItem('mediguard_conditions', JSON.stringify(primaryCondition ? [primaryCondition] : []));
        localStorage.setItem('mediguard_medications', JSON.stringify(medications));
      }

      navigate('/login', { state: { message: 'Account created. Please log in.' } });
    } catch (err) {
      setErrorMessage(err.message || 'Unable to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page page-enter">
      <div className="auth-split">
        <AuthSidePanel />
        <div className="auth-form-panel">
          <div className="auth-form-wrap auth-form-wrap-signup">
            <h1 className="auth-form-title">Sign up</h1>
            {errorMessage && <p className="auth-error-msg">{errorMessage}</p>}
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Role</label>
                <RoleSelector value={role} onChange={setRole} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="signup-first">First name</label>
                  <input
                    id="signup-first"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={loading}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="signup-last">Last name</label>
                  <input
                    id="signup-last"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={loading}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="signup-email">Email</label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="form-input"
                />
              </div>
              {role === 'patient' && (
                <>
                  <div className="form-group">
                    <label htmlFor="signup-condition">Primary Condition</label>
                    <select
                      id="signup-condition"
                      value={primaryCondition}
                      onChange={(e) => setPrimaryCondition(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Select condition</option>
                      {PRIMARY_CONDITIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Add Medications</label>
                    <MedicationTagInput value={medications} onChange={setMedications} />
                  </div>
                </>
              )}
              {role === 'doctor' && (
                <>
                  <div className="form-group">
                    <label htmlFor="signup-specialty">Specialty</label>
                    <select
                      id="signup-specialty"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="form-input"
                    >
                      <option value="">Select specialty</option>
                      {SPECIALTIES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="signup-license">License Number</label>
                    <input
                      id="signup-license"
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className="form-input"
                      placeholder="e.g. 12345"
                    />
                  </div>
                </>
              )}
              <div className="form-group form-group-checkbox">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(e) => setTerms(e.target.checked)}
                    required
                  />
                  I agree to the Terms and Privacy Policy
                </label>
              </div>
              <button
                type="submit"
                className={`auth-submit ${role === 'patient' ? 'auth-submit-primary' : 'auth-submit-secondary'}`}
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
            <p className="auth-switch">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
