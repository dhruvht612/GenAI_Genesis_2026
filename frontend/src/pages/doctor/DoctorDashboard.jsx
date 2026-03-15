import { useEffect } from 'react';
import { useNavigate, Outlet, NavLink } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import '../Dashboard.css';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const role = sessionStorage.getItem('mediguard_role');
  const email = sessionStorage.getItem('mediguard_email');
  const displayName = sessionStorage.getItem('mediguard_displayName') || 'Doctor';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'DR';

  const handleLogout = () => {
    sessionStorage.removeItem('mediguard_role');
    sessionStorage.removeItem('mediguard_email');
    sessionStorage.removeItem('mediguard_user_id');
    sessionStorage.removeItem('mediguard_displayName');
    localStorage.removeItem('mediguard_patient_id');
    localStorage.removeItem('mediguard_latest_report');
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (role !== 'doctor' || !email) {
      navigate('/login', { replace: true });
    }
  }, [role, email, navigate]);

  if (role !== 'doctor' || !email) return null;

  return (
    <div className="dashboard page-enter dashboard-doctor">
      <div className="doctor-portal">
        <aside className="doctor-sidebar">
          <nav className="doctor-nav">
            <NavLink to="/doctor" end className={({ isActive }) => `doctor-nav-item ${isActive ? 'doctor-nav-item-active' : ''}`}>
              <span className="doctor-nav-icon" aria-hidden>▦</span>
              Overview
            </NavLink>
            <NavLink to="/doctor/patients" className={({ isActive }) => `doctor-nav-item ${isActive ? 'doctor-nav-item-active' : ''}`}>
              <span className="doctor-nav-icon" aria-hidden>👥</span>
              Patients
            </NavLink>
            <NavLink to="/doctor/insights" className={({ isActive }) => `doctor-nav-item ${isActive ? 'doctor-nav-item-active' : ''}`}>
              <span className="doctor-nav-icon" aria-hidden>◇</span>
              AI Insights
            </NavLink>
            <NavLink to="/doctor/reports" className={({ isActive }) => `doctor-nav-item ${isActive ? 'doctor-nav-item-active' : ''}`}>
              <span className="doctor-nav-icon" aria-hidden>📄</span>
              Reports
            </NavLink>
          </nav>
          <div className="doctor-sidebar-footer">
            <a href="#settings" className="doctor-nav-item">
              <span className="doctor-nav-icon" aria-hidden>⚙</span>
              Settings
            </a>
            <div className="doctor-profile">
              <span className="doctor-avatar">{initials}</span>
              <div className="doctor-profile-info">
                <span className="doctor-name">{displayName}</span>
                <button type="button" className="doctor-logout-link" onClick={handleLogout}>Log out</button>
              </div>
            </div>
          </div>
        </aside>
        <div className="doctor-main">
          <header className="doctor-topbar">
            <div className="doctor-topbar-brand">
              <span className="doctor-logo-icon">◆</span>
              <div>
                <span className="doctor-brand">MediGuard</span>
                <span className="doctor-portal-label">Doctor Portal</span>
              </div>
            </div>
            <div className="doctor-search-wrap">
              <span className="doctor-search-icon" aria-hidden>🔍</span>
              <input type="search" className="doctor-search" placeholder="Search patients..." aria-label="Search patients" />
            </div>
            <button type="button" className="doctor-notifications theme-toggle-btn" onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))} title={theme === 'light' ? 'Dark mode' : 'Light mode'} aria-label="Toggle theme">{theme === 'light' ? '🌙' : '☀️'}</button>
            <button type="button" className="doctor-notifications" aria-label="Notifications">🔔</button>
          </header>
          <div className="doctor-content">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
