import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import './Nav.css';

export default function Nav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          <img className="nav-logo-icon" src="/medguard.png" alt="MediGuard logo" />
          <span className="nav-logo-wordmark">MediGuard</span>
        </Link>
        {!isAuthPage && (
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How it Works</a></li>
            <li><a href="#for-doctors">For Doctors</a></li>
          </ul>
        )}
        <div className="nav-actions">
          <button
            type="button"
            className="nav-theme-toggle"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button type="button" className="nav-btn nav-btn-ghost" onClick={() => navigate('/login')}>
            Login
          </button>
          <button type="button" className="nav-btn nav-btn-primary" onClick={() => navigate('/signup')}>
            Sign Up
          </button>
        </div>
      </div>
    </nav>
  );
}

