import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileSetupModal from '../components/ProfileSetupModal';
import { TravelConnectSignUp } from '../components/ui/travel-connect-signup-1';
import './Auth.css';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export default function Signup() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [signupDisplayName, setSignupDisplayName] = useState('');

  const handleSubmit = async (data) => {
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: data.role,
          email: data.email,
          password: data.password,
          first_name: data.firstName,
          last_name: data.lastName,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result?.detail || 'Signup failed');

      if (data.role === 'patient') {
        setSignupDisplayName(result.display_name || `${data.firstName} ${data.lastName}`.trim());
        setShowProfileModal(true);
      } else {
        navigate('/login', { state: { message: 'Account created. Please log in.' } });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = () => {
    setShowProfileModal(false);
    navigate('/login', { state: { message: 'Account created. Please log in.' } });
  };

  return (
    <div className="auth-page page-enter min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {showProfileModal && (
        <ProfileSetupModal
          displayName={signupDisplayName}
          onComplete={handleProfileComplete}
        />
      )}
      <TravelConnectSignUp
        onSubmit={handleSubmit}
        errorMessage={errorMessage}
        isSubmitting={loading}
      />
    </div>
  );
}
