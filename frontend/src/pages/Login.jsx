import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import RoleSelector from '../components/RoleSelector';
import AuthSidePanel from '../components/AuthSidePanel';
import './Auth.css';

const DEMO_PATIENT = {
  role: 'patient',
  email: 'maria.chen@demo.mediguard.ca',
  password: 'demo123',
};
const DEMO_DOCTOR = {
  role: 'doctor',
  email: 'dr.smith@demo.mediguard.ca',
  password: 'demo123',
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location]);

  const saveSession = (r, em) => {
    sessionStorage.setItem('mediguard_role', r);
    sessionStorage.setItem('mediguard_email', em);
    sessionStorage.setItem('mediguard_displayName', r === 'patient' ? 'Maria' : 'Dr. Smith');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveSession(role, email);
    navigate(role === 'doctor' ? '/doctor' : '/dashboard', { state: { role, email } });
  };

  const handleDemoLogin = (demo) => {
    setRole(demo.role);
    setEmail(demo.email);
    setPassword(demo.password);
    saveSession(demo.role, demo.email);
    navigate(demo.role === 'doctor' ? '/doctor' : '/dashboard', { state: { role: demo.role, email: demo.email } });
  };

  return (
    <div className="auth-page page-enter">
      <div className="auth-split">
        <AuthSidePanel />
        <div className="auth-form-panel">
          <div className="auth-form-wrap">
            <h1 className="auth-form-title">Log in</h1>
            {successMessage && (
              <p className="auth-success-msg">{successMessage}</p>
            )}
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Role</label>
                <RoleSelector value={role} onChange={setRole} />
              </div>
              <div className="form-group">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input"
                />
                <a href="#" className="form-link" onClick={(e) => e.preventDefault()}>Forgot password?</a>
              </div>
              <button
                type="submit"
                className={`auth-submit ${role === 'patient' ? 'auth-submit-primary' : 'auth-submit-secondary'}`}
              >
                Log in
              </button>
              <div className="demo-buttons">
                <span className="demo-label">Try demo:</span>
                <button
                  type="button"
                  className="demo-btn demo-btn-patient"
                  onClick={() => handleDemoLogin(DEMO_PATIENT)}
                >
                  Demo Patient
                </button>
                <button
                  type="button"
                  className="demo-btn demo-btn-doctor"
                  onClick={() => handleDemoLogin(DEMO_DOCTOR)}
                >
                  Demo Doctor
                </button>
              </div>
            </form>
            <p className="auth-switch">
              Don&apos;t have an account? <Link to="/signup">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
