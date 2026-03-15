import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TravelConnectSignIn } from '../components/ui/travel-connect-signin-1';
import RoleSelector from '../components/RoleSelector';
import './Auth.css';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

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
    if (r === 'patient') {
      sessionStorage.setItem('mediguard_assigned_doctor_id', 'DR-1001');
    }
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
  const handleSubmit = (email, password) => {
    performLogin(role, email, password);
  };

  const handleDemoLogin = (demo) => {
    setRole(demo.role);
    performLogin(demo.role, demo.email, demo.password);
  };

  return (
    <div className="auth-page page-enter min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <TravelConnectSignIn
        successMessage={successMessage}
        errorMessage={errorMessage}
        isSubmitting={loading}
        topContent={
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sign in as</label>
            <RoleSelector value={role} onChange={setRole} />
          </div>
        }
        bottomContent={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-semibold border-2 border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-600 transition-colors"
              onClick={() => handleDemoLogin(DEMO_PATIENT)}
            >
              Demo Patient
            </button>
            <button
              type="button"
              className="flex-1 min-w-[120px] px-4 py-2.5 rounded-lg text-sm font-semibold border-2 border-indigo-500 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-600 transition-colors"
              onClick={() => handleDemoLogin(DEMO_DOCTOR)}
            >
              Demo Doctor
            </button>
          </div>
        }
        onSubmit={handleSubmit}
      />
    </div>
  );
}
