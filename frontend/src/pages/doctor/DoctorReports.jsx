import { useState } from 'react';
import './DoctorReports.css';

const PATIENTS = [
  { id: 1, name: 'Sarah Johnson', initials: 'SJ', age: 45, gender: 'Female', conditions: 'Hypertension, Type 2 Diabetes', risk: 'high' },
  { id: 2, name: 'Michael Chen', initials: 'MC', age: 62, gender: 'Male', conditions: 'COPD', risk: 'medium' },
  { id: 3, name: 'Emily Rodriguez', initials: 'ER', age: 38, gender: 'Female', conditions: 'Asthma', risk: 'low' },
  { id: 4, name: 'James Wilson', initials: 'JW', age: 71, gender: 'Male', conditions: 'Heart Failure, Hypertension', risk: 'high' },
  { id: 5, name: 'Lisa Anderson', initials: 'LA', age: 52, gender: 'Female', conditions: 'Rheumatoid Arthritis', risk: 'low' },
  { id: 6, name: 'David Martinez', initials: 'DM', age: 58, gender: 'Male', conditions: 'Type 2 Diabetes', risk: 'medium' },
];

const REPORT_TYPES = [
  { id: 'summary', label: 'Health Summary', desc: 'Overview of patient health status', icon: '📄' },
  { id: 'detailed', label: 'Detailed Report', desc: 'Comprehensive health insights', icon: '📄' },
  { id: 'medication', label: 'Medication Report', desc: 'Medication overview and effects', icon: '📄' },
];

export default function DoctorReports() {
  const [selectedId, setSelectedId] = useState(1);
  const [reportType, setReportType] = useState('summary');
  const [sendRecommendation, setSendRecommendation] = useState(false);
  const [message, setMessage] = useState('');

  const selected = PATIENTS.find((p) => p.id === selectedId) || PATIENTS[0];

  return (
    <div className="doctor-page doctor-reports page-enter">
      <h1 className="doctor-page-title">Reports &amp; Communication</h1>
      <p className="doctor-page-subtitle">Securely view patient reports and send recommendations.</p>
      <div className="reports-layout">
        <aside className="reports-patient-list">
          <h2 className="reports-list-title">Select Patient</h2>
          <div className="reports-list">
            {PATIENTS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`reports-patient-item ${selectedId === p.id ? 'reports-patient-item-active' : ''}`}
                onClick={() => setSelectedId(p.id)}
              >
                <span className="reports-patient-avatar">{p.initials}</span>
                <div className="reports-patient-info">
                  <strong>{p.name}</strong>
                  <span>{p.age} years - {p.conditions}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>
        <div className="reports-main">
          <div className="dashboard-card reports-selected-card">
            <span className="reports-selected-avatar">{selected.initials}</span>
            <div className="reports-selected-info">
              <strong>{selected.name}</strong>
              <span>{selected.age} years - {selected.gender} - {selected.conditions}</span>
            </div>
            <span className={`badge ${selected.risk === 'high' ? 'badge-danger' : selected.risk === 'medium' ? 'badge-warning' : 'badge-success'}`}>
              {selected.risk.charAt(0).toUpperCase() + selected.risk.slice(1)} risk
            </span>
          </div>
          <div className="reports-type-tabs">
            {REPORT_TYPES.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`reports-type-tab ${reportType === r.id ? 'reports-type-tab-active' : ''}`}
                onClick={() => setReportType(r.id)}
              >
                <span className="reports-type-icon">{r.icon}</span>
                <span className="reports-type-label">{r.label}</span>
                <span className="reports-type-desc">{r.desc}</span>
              </button>
            ))}
          </div>
          <div className="dashboard-card reports-preview">
            <h3 className="reports-preview-title">Patient Health Report</h3>
            <p className="reports-preview-subtitle">Health Summary Report · Generated: {new Date().toLocaleDateString('en-US')}</p>
            <div className="reports-summary-content">
              <div className="report-section">
                <h4>👤 Patient Information</h4>
                <p>Name: {selected.name}</p>
                <p>Age: {selected.age} years · Gender: Female</p>
                <p>Last Check-in: 2 hours ago</p>
              </div>
              <div className="report-section">
                <h4>❤ Medical Conditions</h4>
                <p><span className="report-tag">Hypertension</span> <span className="report-tag">Type 2 Diabetes</span></p>
              </div>
              <div className="report-section">
                <h4>💊 Current Medications</h4>
                <ul>
                  <li>Lisinopril 10mg</li>
                  <li>Metformin 500mg</li>
                  <li>Atorvastatin 20mg</li>
                </ul>
              </div>
              <div className="report-section">
                <h4>Health Metrics</h4>
                <p>Medication Adherence: 72%</p>
                <p>Risk Status: <span className="badge badge-danger">High</span></p>
              </div>
              <div className="report-section report-ai-summary">
                <h4>🤖 AI-Generated Summary</h4>
                <p>Patient shows concern regarding medication adherence at 72%. Current risk level is high. Immediate follow-up recommended to address emerging health concerns.</p>
              </div>
            </div>
            <div className="reports-actions">
              <button type="button" className="btn-doctor btn-doctor-primary">📥 Download PDF</button>
              <button type="button" className="btn-doctor btn-doctor-secondary">🖨 Print Report</button>
            </div>
            <div className="reports-send-section">
              <label className="reports-checkbox">
                <input type="checkbox" checked={sendRecommendation} onChange={(e) => setSendRecommendation(e.target.checked)} />
                Send Recommendation
              </label>
              <label className="reports-message-label">Message to Patient</label>
              <textarea
                className="reports-message-input"
                placeholder="Type your message or recommendation here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
              <div className="reports-send-actions">
                <button type="button" className="btn-doctor btn-doctor-primary">✉ Send Message</button>
                <button type="button" className="btn-doctor btn-doctor-secondary">📅 Schedule Consultation</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
