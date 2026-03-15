import { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import '../Dashboard.css';

const SETTINGS_KEY = 'medguard_doctor_settings';

const defaultSettings = {
  emailAlerts: true,
  highRiskAlerts: true,
  newReportAlerts: true,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultSettings, ...parsed };
    }
  } catch (_) {}
  return { ...defaultSettings };
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (_) {}
}

export default function DoctorSettings() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const update = (key, value) => setSettings((s) => ({ ...s, [key]: value }));

  return (
    <div className="doctor-page doctor-settings-page page-enter">
      <h1 className="doctor-page-title">Settings</h1>
      <p className="doctor-settings-desc">Manage your account and notification preferences.</p>

      <div className="dashboard-card doctor-settings-card">
        <h2 className="doctor-settings-card-title">Display</h2>
        <div className="doctor-settings-row">
          <div className="doctor-settings-row-label">
            <span className="doctor-settings-icon" aria-hidden>☀️</span>
            <div>
              <span className="doctor-settings-label">Dark mode</span>
              <span className="doctor-settings-hint">Use dark theme across the app</span>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            className={`doctor-settings-toggle ${theme === 'dark' ? 'doctor-settings-toggle-on' : ''}`}
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          >
            <span className="doctor-settings-toggle-dot" />
          </button>
        </div>
      </div>

      <div className="dashboard-card doctor-settings-card">
        <h2 className="doctor-settings-card-title">Notifications</h2>
        <p className="doctor-settings-card-hint">Choose what you want to be notified about.</p>
        <div className="doctor-settings-row">
          <div className="doctor-settings-row-label">
            <span className="doctor-settings-icon" aria-hidden>🔔</span>
            <div>
              <span className="doctor-settings-label">High-risk patient alerts</span>
              <span className="doctor-settings-hint">Get notified when a patient is flagged high risk</span>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.highRiskAlerts}
            className={`doctor-settings-toggle ${settings.highRiskAlerts ? 'doctor-settings-toggle-on' : ''}`}
            onClick={() => update('highRiskAlerts', !settings.highRiskAlerts)}
          >
            <span className="doctor-settings-toggle-dot" />
          </button>
        </div>
        <div className="doctor-settings-row">
          <div className="doctor-settings-row-label">
            <span className="doctor-settings-icon" aria-hidden>📄</span>
            <div>
              <span className="doctor-settings-label">New report alerts</span>
              <span className="doctor-settings-hint">When an AI doctor report is generated</span>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.newReportAlerts}
            className={`doctor-settings-toggle ${settings.newReportAlerts ? 'doctor-settings-toggle-on' : ''}`}
            onClick={() => update('newReportAlerts', !settings.newReportAlerts)}
          >
            <span className="doctor-settings-toggle-dot" />
          </button>
        </div>
        <div className="doctor-settings-row">
          <div className="doctor-settings-row-label">
            <span className="doctor-settings-icon" aria-hidden>✉️</span>
            <div>
              <span className="doctor-settings-label">Email digest</span>
              <span className="doctor-settings-hint">Daily summary of activity and alerts</span>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.emailAlerts}
            className={`doctor-settings-toggle ${settings.emailAlerts ? 'doctor-settings-toggle-on' : ''}`}
            onClick={() => update('emailAlerts', !settings.emailAlerts)}
          >
            <span className="doctor-settings-toggle-dot" />
          </button>
        </div>
      </div>

      <div className="dashboard-card doctor-settings-card">
        <h2 className="doctor-settings-card-title">Account</h2>
        <p className="doctor-settings-card-hint">Logged in as your doctor account. Sign out from the sidebar to switch account.</p>
      </div>
    </div>
  );
}
