import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TravelConnectSignIn } from '../components/ui/travel-connect-signin-1';
import RoleSelector from '../components/RoleSelector';
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

  const handleSubmit = (email, password) => {
    saveSession(role, email);
    navigate(role === 'doctor' ? '/doctor' : '/dashboard', { state: { role, email } });
  };

  const handleDemoLogin = (demo) => {
    saveSession(demo.role, demo.email);
    navigate(demo.role === 'doctor' ? '/doctor' : '/dashboard', {
      state: { role: demo.role, email: demo.email },
    });
  };

  return (
    <div className="auth-page page-enter min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <TravelConnectSignIn
        successMessage={successMessage}
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
