import { useEffect } from 'react';
import { useLocation, useNavigate, Outlet, NavLink } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const stateRole = location.state?.role;
  const stateEmail = location.state?.email;
  const role = stateRole || sessionStorage.getItem('mediguard_role') || '';
  const email = stateEmail || sessionStorage.getItem('mediguard_email') || '';
  const displayName = sessionStorage.getItem('mediguard_displayName') || 'Patient';
  const userId = sessionStorage.getItem('mediguard_user_id') || '';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'PT';

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
    if (stateRole) sessionStorage.setItem('mediguard_role', stateRole);
    if (stateEmail) sessionStorage.setItem('mediguard_email', stateEmail);
  }, [stateRole, stateEmail]);

  useEffect(() => {
    if (!role || !email) {
      navigate('/login', { replace: true });
    }
  }, [role, email, navigate]);

  useEffect(() => {
    if (role === 'doctor') {
      navigate('/doctor', { replace: true });
    }
  }, [role, navigate]);

  if (!role || !email) return null;
  if (role === 'doctor') return null;

  return (
    <div className="dashboard page-enter dashboard-patient">
        <div className="patient-portal">
          <aside className="patient-sidebar">
            <div className="patient-sidebar-brand">
              <span className="patient-logo-icon">🏠</span>
              <span className="patient-brand">MediGuard</span>
            </div>
            <nav className="patient-nav">
              <NavLink to="/dashboard" end className={({ isActive }) => `patient-nav-item ${isActive ? 'patient-nav-item-active' : ''}`}>
                <span className="patient-nav-icon" aria-hidden>🏠</span>
                Dashboard
              </NavLink>
              <NavLink to="/dashboard/check-in" className={({ isActive }) => `patient-nav-item ${isActive ? 'patient-nav-item-active' : ''}`}>
                <span className="patient-nav-icon" aria-hidden>💬</span>
                AI Check-In
              </NavLink>
              <NavLink to="/dashboard/risk" className={({ isActive }) => `patient-nav-item ${isActive ? 'patient-nav-item-active' : ''}`}>
                <span className="patient-nav-icon" aria-hidden>⚠</span>
                Risk Assessment
              </NavLink>
              <NavLink to="/dashboard/report" className={({ isActive }) => `patient-nav-item ${isActive ? 'patient-nav-item-active' : ''}`}>
                <span className="patient-nav-icon" aria-hidden>📄</span>
                Doctor Report
              </NavLink>
              <NavLink to="/dashboard/profile" className={({ isActive }) => `patient-nav-item ${isActive ? 'patient-nav-item-active' : ''}`}>
                <span className="patient-nav-icon" aria-hidden>👤</span>
                Profile
              </NavLink>
            </nav>
            <div className="patient-sidebar-footer">
              <span className="patient-avatar">{initials}</span>
              <div className="patient-profile-info">
                <span className="patient-profile-name">{displayName}</span>
                <span className="patient-id">Patient ID: #{userId || 'N/A'}</span>
              </div>
            </div>
          </aside>
          <div className="patient-main">
            <header className="patient-topbar">
              <div className="patient-topbar-brand">
                <span className="patient-topbar-logo">◆</span>
                <div>
                  <span className="patient-topbar-app">MediGuard</span>
                  <span className="patient-topbar-label">Patient Portal</span>
                </div>
              </div>
              <div className="patient-topbar-actions">
                <button type="button" className="patient-topbar-btn" aria-label="Notifications">🔔</button>
                <button type="button" className="patient-topbar-btn patient-topbar-logout" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            </header>
            <div className="patient-content">
              <Outlet />
            </div>
          </div>
        </div>
    </div>
  );
}
