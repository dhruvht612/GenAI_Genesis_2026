import './RoleSelector.css';

export default function RoleSelector({ value, onChange }) {
  return (
    <div className="role-selector">
      <button
        type="button"
        className={`role-card ${value === 'patient' ? 'role-card-active role-card-patient' : ''}`}
        onClick={() => onChange('patient')}
      >
        <span className="role-icon">👤</span>
        <span className="role-label">Patient</span>
      </button>
      <button
        type="button"
        className={`role-card ${value === 'doctor' ? 'role-card-active role-card-doctor' : ''}`}
        onClick={() => onChange('doctor')}
      >
        <span className="role-icon">🩺</span>
        <span className="role-label">Doctor</span>
      </button>
    </div>
  );
}
