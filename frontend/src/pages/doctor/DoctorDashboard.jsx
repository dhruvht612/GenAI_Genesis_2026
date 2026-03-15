import { useEffect } from 'react';
import { useNavigate, Outlet, NavLink } from 'react-router-dom';
import '../Dashboard.css';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const role = sessionStorage.getItem('mediguard_role');
  const email = sessionStorage.getItem('mediguard_email');

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
              <span className="doctor-avatar">DR</span>
              <div className="doctor-profile-info">
                <span className="doctor-name">Dr. Smith</span>
                <button type="button" className="doctor-logout-link" onClick={() => navigate('/login')}>Log out</button>
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
