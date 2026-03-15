import { useState } from 'react';
import './DoctorPatients.css';

const PATIENTS = [
  { id: 1, name: 'Sarah Johnson', initials: 'SJ', age: 45, gender: 'Female', conditions: ['Hypertension', 'Type 2 Diabetes'], medications: 3, risk: 'high', lastCheckIn: '2 hours ago', adherence: 72 },
  { id: 2, name: 'Michael Chen', initials: 'MC', age: 62, gender: 'Male', conditions: ['COPD'], medications: 2, risk: 'medium', lastCheckIn: '1 day ago', adherence: 85 },
  { id: 3, name: 'Emily Rodriguez', initials: 'ER', age: 38, gender: 'Female', conditions: ['Asthma'], medications: 1, risk: 'low', lastCheckIn: '3 hours ago', adherence: 94 },
  { id: 4, name: 'James Wilson', initials: 'JW', age: 71, gender: 'Male', conditions: ['Heart Failure', 'Atrial Fibrillation'], medications: 4, risk: 'high', lastCheckIn: '3 hours ago', adherence: 68 },
  { id: 5, name: 'Lisa Anderson', initials: 'LA', age: 52, gender: 'Female', conditions: ['Rheumatoid Arthritis'], medications: 2, risk: 'low', lastCheckIn: '6 hours ago', adherence: 91 },
  { id: 6, name: 'David Martinez', initials: 'DM', age: 58, gender: 'Male', conditions: ['Type 2 Diabetes', 'Hyperlipidemia'], medications: 2, risk: 'medium', lastCheckIn: '4 hours ago', adherence: 79 },
];

export default function DoctorPatients() {
  const [riskFilter, setRiskFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = PATIENTS.filter((p) => {
    const matchRisk = riskFilter === 'all' || p.risk === riskFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.conditions.some((c) => c.toLowerCase().includes(search.toLowerCase()));
    return matchRisk && matchSearch;
  });

  return (
    <div className="doctor-page doctor-patients page-enter">
      <h1 className="doctor-page-title">Patient List</h1>
      <p className="doctor-page-subtitle">View and manage all patients under your care.</p>
      <div className="doctor-patients-toolbar">
        <div className="doctor-patients-search-wrap">
          <span className="doctor-search-icon" aria-hidden>🔍</span>
          <input
            type="search"
            className="doctor-patients-search"
            placeholder="Search by name or condition..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search patients"
          />
        </div>
        <div className="doctor-patients-filters">
          <span className="filter-label">Risk Status:</span>
          {['all', 'high', 'medium', 'low'].map((r) => (
            <button
              key={r}
              type="button"
              className={`filter-btn ${riskFilter === r ? 'filter-btn-active' : ''}`}
              onClick={() => setRiskFilter(r)}
            >
              {r === 'all' ? 'All' : r === 'high' ? 'High Risk' : r === 'medium' ? 'Medium' : 'Low Risk'}
            </button>
          ))}
        </div>
        <select className="doctor-patients-sort" aria-label="Sort by">
          <option>Sort by Name</option>
        </select>
      </div>
      <p className="doctor-patients-count">{filtered.length} Patients</p>
      <div className="dashboard-card doctor-patients-table-wrap">
        <table className="doctor-patients-table">
          <thead>
            <tr>
              <th>PATIENT</th>
              <th>CONDITIONS</th>
              <th>MEDICATIONS</th>
              <th>RISK STATUS</th>
              <th>LAST CHECK-IN</th>
              <th>ADHERENCE</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="patient-cell">
                    <span className="patient-cell-avatar">{p.initials}</span>
                    <div>
                      <strong>{p.name}</strong>
                      <span className="patient-cell-meta">{p.age} years • {p.gender}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="conditions-tags">
                    {p.conditions.slice(0, 2).map((c) => (
                      <span key={c} className="condition-tag">{c}</span>
                    ))}
                    {p.conditions.length > 2 && <span className="condition-tag condition-tag-more">+{p.conditions.length - 2}</span>}
                  </div>
                </td>
                <td>{p.medications} medications</td>
                <td>
                  <span className={`risk-dot risk-dot-${p.risk}`} />
                  {p.risk.charAt(0).toUpperCase() + p.risk.slice(1)}
                </td>
                <td>{p.lastCheckIn}</td>
                <td>
                  <div className="adherence-cell">
                    <span>{p.adherence}%</span>
                    <div className="adherence-bar-wrap">
                      <div className={`adherence-bar adherence-bar-${p.risk}`} style={{ width: `${p.adherence}%` }} />
                    </div>
                  </div>
                </td>
                <td><button type="button" className="row-arrow" aria-label="View">→</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
