import './PatientRiskAssessment.css';

const RECOMMENDATIONS = [
  'Continue taking medications as prescribed',
  'Monitor symptoms for the next 3-5 days',
  'Stay hydrated and get adequate rest',
];

export default function PatientRiskAssessment() {
  return (
    <div className="patient-page patient-risk page-enter">
      <div className="risk-header">
        <span className="risk-header-icon">⚠</span>
        <h1 className="risk-title">Risk Assessment</h1>
        <p className="risk-subtitle">Based on your recent medications and symptoms</p>
      </div>
      <div className="risk-grid">
        <div className="dashboard-card risk-level-card">
          <span className="risk-level-label">CURRENT RISK LEVEL</span>
          <span className="risk-level-value">Moderate Risk</span>
          <div className="risk-meter">
            <div className="risk-meter-bar">
              <span className="risk-meter-dot" style={{ left: '50%' }} />
            </div>
            <div className="risk-meter-labels">
              <span>Low</span>
              <span>Moderate</span>
              <span>High</span>
            </div>
          </div>
        </div>
        <div className="risk-right">
          <div className="dashboard-card risk-means-card">
            <div className="risk-means-header">
              <span className="risk-means-icon">ℹ</span>
              <h2>What This Means</h2>
            </div>
            <p className="risk-means-intro">Our AI has detected potential medication side effects based on your recent symptom reports:</p>
            <ul>
              <li>Headaches may be related to Lisinopril (blood pressure medication)</li>
              <li>Mild dizziness can occur when starting new medications</li>
            </ul>
          </div>
          <div className="dashboard-card risk-recommendations-card">
            <h2>Recommendations</h2>
            <ul className="risk-recommendations-list">
              {RECOMMENDATIONS.map((r, i) => (
                <li key={i}>
                  <span className="risk-check">✓</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="risk-actions">
        <button type="button" className="btn btn-risk-primary">
          <span className="btn-icon">📄</span>
          View Detailed Report
        </button>
        <button type="button" className="btn btn-risk-secondary">
          <span className="btn-icon">✈</span>
          Send to Doctor
        </button>
      </div>
    </div>
  );
}
