import { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  FileText,
  LogOut,
  Moon,
  Sun,
  ShieldPlus,
  Search,
} from 'lucide-react';
import { SidebarBody, SidebarLink, SidebarAction } from '../../components/ui/sidebar';
import '../Dashboard.css';

const doctorLinks = [
  { label: 'Overview',    to: '/doctor',           icon: <LayoutDashboard className="h-5 w-5 flex-shrink-0" />, exact: true },
  { label: 'Patients',    to: '/doctor/patients',  icon: <Users           className="h-5 w-5 flex-shrink-0" /> },
  { label: 'AI Insights', to: '/doctor/insights',  icon: <Sparkles        className="h-5 w-5 flex-shrink-0" /> },
  { label: 'Reports',     to: '/doctor/reports',   icon: <FileText        className="h-5 w-5 flex-shrink-0" /> },
];

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const role  = sessionStorage.getItem('medguard_role');
  const email = sessionStorage.getItem('medguard_email');
  const displayName = sessionStorage.getItem('medguard_displayName') || 'Doctor';
  const initials = displayName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    if (role !== 'doctor' || !email) navigate('/login', { replace: true });
  }, [role, email, navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('medguard_role');
    sessionStorage.removeItem('medguard_email');
    sessionStorage.removeItem('medguard_displayName');
    navigate('/login');
  };

  if (role !== 'doctor' || !email) return null;

  return (
    <div className="dashboard page-enter dashboard-doctor">
      <div className="doctor-portal" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <SidebarBody className="justify-between">

          {/* Top: logo + nav */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 px-3 py-2 mb-4" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <ShieldPlus className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--primary)' }} />
              <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>MedGuard</span>
            </div>

            {doctorLinks.map((link) => (
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
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Doctor Portal</p>
              </div>
            </div>
          </div>

        </SidebarBody>

        {/* ── Main area ── */}
        <div className="doctor-main" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <header className="doctor-topbar">
            <div className="doctor-topbar-brand">
              <img className="doctor-logo-icon" src="/medguard.png" alt="MedGuard logo" />
              <div>
                <span className="doctor-brand">MedGuard</span>
                <span className="doctor-portal-label">Doctor Portal</span>
              </div>
            </div>
            <div className="doctor-search-wrap">
              <Search className="h-4 w-4 doctor-search-icon" aria-hidden />
              <input type="search" className="doctor-search" placeholder="Search patients…" aria-label="Search patients" />
            </div>
            <button
              type="button"
              className="doctor-notifications theme-toggle-btn"
              onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
              title={theme === 'light' ? 'Dark mode' : 'Light mode'}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
          </header>
          <div className="doctor-content" style={{ flex: 1, overflowY: 'auto' }}>
            <Outlet />
          </div>
        </div>

      </div>
    </div>
  );
}
