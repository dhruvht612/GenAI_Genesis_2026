import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, Outlet, NavLink, Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import '../Dashboard.css';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

function timeAgo(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  const now = new Date();
  const sec = Math.floor((now - date) / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function activityIcon(eventType, priority) {
  if (eventType === 'report_generated') return '🩹';
  if (eventType === 'checkin_completed') return '✓';
  if (eventType === 'profile_created') return '👤';
  return priority === 'high' ? '⚠' : '📋';
}

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const role = sessionStorage.getItem('mediguard_role');
  const email = sessionStorage.getItem('mediguard_email');
  const displayName = sessionStorage.getItem('mediguard_displayName') || 'Doctor';
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationActivity, setNotificationActivity] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const notifRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    const doctorId = sessionStorage.getItem('mediguard_user_id');
    if (!doctorId) return;
    setNotificationLoading(true);
    try {
      const res = await fetch(`${API}/doctor/${doctorId}/overview`);
      if (res.ok) {
        const data = await res.json();
        setNotificationActivity(data.recent_activity ?? []);
      }
    } catch (_) {
      setNotificationActivity([]);
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  useEffect(() => {
    if (notificationsOpen) loadNotifications();
  }, [notificationsOpen, loadNotifications]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotificationsOpen(false);
    }
    if (notificationsOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [notificationsOpen]);

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
            <NavLink to="/doctor/profile" className={({ isActive }) => `doctor-nav-item ${isActive ? 'doctor-nav-item-active' : ''}`}>
              <span className="doctor-nav-icon" aria-hidden>👤</span>
              Profile
            </NavLink>
          </nav>
          <div className="doctor-sidebar-footer">
            <NavLink to="/doctor/settings" className={({ isActive }) => `doctor-nav-item ${isActive ? 'doctor-nav-item-active' : ''}`}>
              <span className="doctor-nav-icon" aria-hidden>⚙</span>
              Settings
            </NavLink>
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
                <span className="doctor-brand">MedGuard</span>
                <span className="doctor-portal-label">Doctor Portal</span>
              </div>
            </div>
            <div className="doctor-search-wrap">
              <span className="doctor-search-icon" aria-hidden>🔍</span>
              <input type="search" className="doctor-search" placeholder="Search patients..." aria-label="Search patients" />
            </div>
            <button type="button" className="doctor-notifications theme-toggle-btn" onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))} title={theme === 'light' ? 'Dark mode' : 'Light mode'} aria-label="Toggle theme">{theme === 'light' ? '🌙' : '☀️'}</button>
            <div className="doctor-notifications-wrap" ref={notifRef}>
              <button
                type="button"
                className={`doctor-notifications doctor-notifications-btn ${notificationsOpen ? 'doctor-notifications-open' : ''}`}
                onClick={(e) => { e.stopPropagation(); setNotificationsOpen((v) => !v); }}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                🔔
                {notificationActivity.length > 0 && (
                  <span className="doctor-notifications-badge">{notificationActivity.length > 9 ? '9+' : notificationActivity.length}</span>
                )}
              </button>
              {notificationsOpen && (
                <div className="doctor-notifications-dropdown" role="menu">
                  <div className="doctor-notifications-dropdown-header">
                    <span>Notifications</span>
                    <Link to="/doctor" className="doctor-notifications-view-all" onClick={() => setNotificationsOpen(false)}>View overview</Link>
                  </div>
                  <div className="doctor-notifications-dropdown-body">
                    {notificationLoading ? (
                      <p className="doctor-notifications-loading">Loading…</p>
                    ) : notificationActivity.length === 0 ? (
                      <p className="doctor-notifications-empty">No recent notifications.</p>
                    ) : (
                      <ul className="doctor-notifications-list">
                        {notificationActivity.slice(0, 10).map((a) => (
                          <li key={a.id} className="doctor-notification-item">
                            <span className="doctor-notification-icon" aria-hidden>{activityIcon(a.event_type, a.priority)}</span>
                            <div className="doctor-notification-content">
                              <span className="doctor-notification-message">{a.message}</span>
                              {a.patient_name && <span className="doctor-notification-patient">{a.patient_name}</span>}
                              <span className="doctor-notification-time">{timeAgo(a.created_at)}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </header>
          <div className="doctor-content">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
