import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import RoleSelector from '../components/RoleSelector';
import AuthSidePanel from '../components/AuthSidePanel';
import './Auth.css';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location]);

  const saveSession = (r, em, userId, displayName) => {
    sessionStorage.setItem('mediguard_role', r);
    sessionStorage.setItem('mediguard_email', em);
    sessionStorage.setItem('mediguard_user_id', userId);
    sessionStorage.setItem('mediguard_displayName', displayName);
  };

  const performLogin = async (selectedRole, selectedEmail, selectedPassword) => {
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole, email: selectedEmail, password: selectedPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Login failed');

      saveSession(data.role, data.email, data.user_id, data.display_name);
      navigate(data.role === 'doctor' ? '/doctor' : '/dashboard', { state: { role: data.role, email: data.email } });
    } catch (err) {
      setErrorMessage(err.message || 'Unable to log in');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    performLogin(role, email, password);
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
            {errorMessage && (
              <p className="auth-error-msg">{errorMessage}</p>
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
                  disabled={loading}
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
                  disabled={loading}
                  className="form-input"
                />
                <a href="#" className="form-link" onClick={(e) => e.preventDefault()}>Forgot password?</a>
              </div>
              <button
                type="submit"
                className={`auth-submit ${role === 'patient' ? 'auth-submit-primary' : 'auth-submit-secondary'}`}
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Log in'}
              </button>
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
