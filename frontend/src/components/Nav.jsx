import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Nav.css';

export default function Nav() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuth = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">
          <span className="nav-logo-icon" aria-hidden>◆</span>
          <span className="nav-logo-wordmark">MediGuard</span>
        </Link>
        {!isAuth && (
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How it Works</a></li>
            <li><a href="#for-doctors">For Doctors</a></li>
          </ul>
        )}
        <div className="nav-actions">
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
