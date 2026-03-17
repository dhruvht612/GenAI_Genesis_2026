import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  LayoutDashboard,
  MessageCircle,
  BarChart2,
  FileText,
  User,
  LogOut,
  Bell,
  Moon,
  Sun,
  ShieldPlus,
} from 'lucide-react';
import { SidebarBody, SidebarLink, SidebarAction } from '../components/ui/sidebar';
import './Dashboard.css';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const patientLinks = [
  { label: 'Dashboard',     to: '/dashboard',         icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" />, exact: true },
  { label: 'AI Check-In',   to: '/dashboard/check-in',icon: <MessageCircle   className="h-5 w-5 flex-shrink-0" /> },
  { label: 'Risk Score',    to: '/dashboard/risk',    icon: <BarChart2       className="h-5 w-5 flex-shrink-0" /> },
  { label: 'Doctor Report', to: '/dashboard/report',  icon: <FileText        className="h-5 w-5 flex-shrink-0" /> },
  { label: 'Profile',       to: '/dashboard/profile', icon: <User            className="h-5 w-5 flex-shrink-0" /> },
];

export default function Dashboard() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { theme, setTheme } = useTheme();

  const stateRole  = location.state?.role;
  const stateEmail = location.state?.email;
  const role        = stateRole  || sessionStorage.getItem('medguard_role')        || 'patient';
  const email       = stateEmail || sessionStorage.getItem('medguard_email')       || '';
  const displayName = sessionStorage.getItem('medguard_displayName') || 'Patient';
  const userId      = sessionStorage.getItem('medguard_user_id')     || 'N/A';
  const initials    = displayName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (stateRole)  sessionStorage.setItem('medguard_role',  stateRole);
    if (stateEmail) sessionStorage.setItem('medguard_email', stateEmail);
  }, [stateRole, stateEmail]);

  useEffect(() => {
    if (!role || !email) navigate('/login', { replace: true });
  }, [role, email, navigate]);

  useEffect(() => {
    if (role === 'doctor') navigate('/doctor', { replace: true });
  }, [role, navigate]);

  useEffect(() => {
    if (role !== 'patient' || !userId || userId === 'N/A') return;
    let mounted = true;
    const loadUnread = async () => {
      try {
        const res  = await fetch(`${API}/patient/${userId}/overview?t=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setUnreadMessages(Number(data.unread_doctor_messages || 0));
      } catch { /* ignore */ }
    };
    loadUnread();
    const timer = setInterval(loadUnread, 8000);
    return () => { mounted = false; clearInterval(timer); };
  }, [role, userId]);

  const handleLogout = () => {
    sessionStorage.removeItem('medguard_role');
    sessionStorage.removeItem('medguard_email');
    sessionStorage.removeItem('medguard_displayName');
    navigate('/login');
  };

  if (!role || !email) return null;
  if (role === 'doctor') return null;

  return (
    <div className="dashboard page-enter dashboard-patient">
      <div className="patient-portal" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <SidebarBody className="justify-between">

          {/* Top: logo + nav */}
          <div className="flex flex-col gap-1">
            {/* Logo */}
            <div className="flex items-center gap-2 px-3 py-2 mb-4" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <ShieldPlus className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
              <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>MedGuard</span>
            </div>

            {/* Nav links */}
            {patientLinks.map((link) => (
              <SidebarLink key={link.to} link={link} />
            ))}
          </div>

          {/* Bottom: user + logout */}
          <div className="flex flex-col gap-1">
            <SidebarAction
              icon={<LogOut className="h-5 w-5" />}
              label="Log out"
              onClick={handleLogout}
            />
            <div className="flex items-center gap-3 px-3 py-2 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ background: 'var(--primary)' }}>
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text)' }}>{displayName}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ID: #{userId}</p>
              </div>
            </div>
          </div>

        </SidebarBody>

        {/* ── Main area ── */}
        <div className="patient-main" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <header className="patient-topbar">
            <div className="patient-topbar-brand">
              <img className="patient-topbar-logo" src="/medguard.png" alt="MedGuard logo" />
              <div>
                <span className="patient-topbar-app">MedGuard</span>
                <span className="patient-topbar-label">Patient Portal</span>
              </div>
            </div>
            <div className="patient-topbar-actions">
              <button
                type="button"
                className="patient-topbar-btn theme-toggle-btn"
                onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
                title={theme === 'light' ? 'Dark mode' : 'Light mode'}
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </button>
              <button type="button" className="patient-topbar-btn patient-notification-btn" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {unreadMessages > 0 && (
                  <span className="patient-notification-dot">{unreadMessages > 9 ? '9+' : unreadMessages}</span>
                )}
              </button>
              <button type="button" className="patient-topbar-btn patient-topbar-logout" onClick={handleLogout}>
                Log out
              </button>
            </div>
          </header>
          <div className="patient-content" style={{ flex: 1, overflowY: 'auto' }}>
            <Outlet />
          </div>
        </div>

      </div>
    </div>
  );
}
