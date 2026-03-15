import './AuthSidePanel.css';

export default function AuthSidePanel() {
  return (
    <div className="auth-side-panel">
      <div className="auth-side-content">
        <div className="auth-side-logo">
          <img className="auth-logo-icon" src="/medguard.png" alt="MediGuard logo" />
          <span className="auth-logo-wordmark">MediGuard</span>
        </div>
        <h2 className="auth-side-headline">Your health, proactively managed</h2>
        <ul className="auth-side-features">
          <li><span className="auth-feature-icon">💊</span> Track medications & side effects</li>
          <li><span className="auth-feature-icon">🤖</span> AI check-ins at the right time</li>
          <li><span className="auth-feature-icon">📄</span> Share reports with your doctor</li>
        </ul>
        <p className="auth-side-footer">Built for Canadians · Sun Life Best Health Care Hack</p>
      </div>
    </div>
  );
}

