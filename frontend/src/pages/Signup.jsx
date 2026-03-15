import { useNavigate } from 'react-router-dom';
import { TravelConnectSignUp } from '../components/ui/travel-connect-signup-1';
import './Auth.css';

export default function Signup() {
  const navigate = useNavigate();

  const handleSubmit = () => {
    navigate('/login', { state: { message: 'Account created. Please log in.' } });
  };

  return (
    <div className="auth-page page-enter min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <TravelConnectSignUp onSubmit={handleSubmit} />
    </div>
  );
}
