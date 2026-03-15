import './PatientDoctorReport.css';

const MEDS_ADHERENCE = [
  { name: 'Lisinopril 10mg', pct: 100, detail: 'Daily at 8:00 AM - 7/7 doses taken' },
  { name: 'Metformin 500mg', pct: 100, detail: 'Daily at 8:00 AM - 7/7 doses taken' },
  { name: 'Atorvastatin 20mg', pct: 80, detail: 'Daily at 5:00 PM - 6/7 doses taken' },
];

const AI_INSIGHTS = [
  { text: 'Excellent medication compliance (95% overall adherence)', highlight: true },
  { text: 'Reported headaches may be related to Lisinopril adjustment period', highlight: false },
  { text: 'Symptoms are mild and within expected range', highlight: false },
];

const SYMPTOMS_LOG = [
  { name: 'Mild Headache', count: 2, severity: '3/10' },
  { name: 'Dizziness', count: 1, severity: '2/10' },
  { name: 'Fatigue', count: 1, severity: '4/10' },
];

const reportDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

export default function PatientDoctorReport() {
  return (
    <div className="patient-page patient-report page-enter">
      <div className="report-header">
        <div>
          <h1 className="report-title">Health Report</h1>
          <p className="report-date">
            <span className="report-date-icon">📅</span>
            Generated on {reportDate}
          </p>
        </div>
        <div className="report-header-actions">
          <button type="button" className="btn-report btn-report-outline">
            <span>📥</span> Export PDF
          </button>
          <button type="button" className="btn-report btn-report-primary">
            <span>↗</span> Share
          </button>
        </div>
      </div>
      <div className="report-grid">
        <div className="dashboard-card report-card report-patient-info">
          <span className="report-avatar">MJ</span>
          <h3>Maria Johnson</h3>
          <p className="report-meta">Patient ID: #MJ-2004</p>
          <p className="report-meta"><strong>DATE OF BIRTH</strong><br />January 15, 1985</p>
          <p className="report-meta"><strong>REPORT PERIOD</strong><br />Last 7 Days</p>
        </div>
        <div className="dashboard-card report-card report-adherence">
          <h3 className="report-card-title">💊 Medications Adherence</h3>
          {MEDS_ADHERENCE.map((m, i) => (
            <div key={i} className="report-adherence-item">
              <div className="report-adherence-header">
                <span className="report-adherence-name">{m.name}</span>
                <span className="report-adherence-pct">{m.pct}%</span>
              </div>
              <div className="report-adherence-bar-wrap">
                <div
                  className={`report-adherence-bar ${m.pct === 100 ? 'report-adherence-bar-full' : ''}`}
                  style={{ width: `${m.pct}%` }}
                />
              </div>
              <p className="report-adherence-detail">{m.detail}</p>
            </div>
          ))}
        </div>
        <div className="dashboard-card report-card report-ai">
          <h3 className="report-card-title">🤖 AI Analysis</h3>
          <p className="report-ai-intro">Based on the medication adherence and symptom data, our AI health assistant has identified the following insights:</p>
          <ul className="report-ai-list">
            {AI_INSIGHTS.map((item, i) => (
              <li key={i} className={item.highlight ? 'report-ai-highlight' : ''}>{item.text}</li>
            ))}
          </ul>
        </div>
        <div className="dashboard-card report-card report-symptoms">
          <h3 className="report-card-title">📊 Symptoms Log</h3>
          <ul className="report-symptoms-list">
            {SYMPTOMS_LOG.map((s, i) => (
              <li key={i} className="report-symptom-item">
                <span className="report-symptom-num">{i + 1}</span>
                <div>
                  <strong>{s.name}</strong>
                  <span className="report-symptom-meta">Occurred {s.count} time{s.count > 1 ? 's' : ''} · SEVERITY: {s.severity}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
