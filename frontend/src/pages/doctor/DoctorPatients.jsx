import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DoctorPatients.css';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const initialsFrom = (name = '') => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

export default function DoctorPatients() {
  const navigate = useNavigate();
  const [riskFilter, setRiskFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const doctorId = sessionStorage.getItem('medguard_user_id');
    if (!doctorId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(`${API}/doctor/${doctorId}/patients`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || 'Failed to load patients');
        setPatients(data.patients || []);
      } catch {
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => patients.filter((p) => {
    const matchRisk = riskFilter === 'all' || p.risk === riskFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.conditions.some((c) => c.toLowerCase().includes(search.toLowerCase()));
    return matchRisk && matchSearch;
  }), [patients, riskFilter, search]);

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
      <p className="doctor-patients-count">{loading ? 'Loading...' : `${filtered.length} Patients`}</p>
      <div className="dashboard-card doctor-patients-table-wrap">
        <table className="doctor-patients-table">
          <thead>
            <tr>
              <th>PATIENT</th>
              <th>BLOOD TYPE</th>
              <th>ALLERGIES</th>
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
              <tr key={p.patient_id}>
                <td>
                  <div className="patient-cell">
                    <span className="patient-cell-avatar">{initialsFrom(p.name)}</span>
                    <div>
                      <strong>{p.name}</strong>
                      <span className="patient-cell-meta">{p.age} years</span>
                    </div>
                  </div>
                </td>
                <td>{p.blood_type || 'Unknown'}</td>
                <td>{(p.allergies || []).join(', ') || 'None'}</td>
                <td>
                  <div className="conditions-tags">
                    {p.conditions.slice(0, 2).map((c) => (
                      <span key={c} className="condition-tag">{c}</span>
                    ))}
                    {p.conditions.length > 2 && <span className="condition-tag condition-tag-more">+{p.conditions.length - 2}</span>}
                  </div>
                </td>
                <td>{p.medications.length} medications</td>
                <td>
                  <span className={`risk-dot risk-dot-${p.risk}`} />
                  {p.risk === 'high' ? '⚠️ High Risk' : p.risk === 'medium' ? 'Moderate' : 'Low Risk'}
                  {p.risk_score !== undefined && <span style={{ color: '#9ca3af', fontSize: '0.75rem', marginLeft: '4px' }}>({p.risk_score}/10)</span>}
                </td>
                <td>{p.latest_assessment ? 'Recent' : 'No check-in yet'}</td>
                <td>
                  <div className="adherence-cell">
                    <span>{p.has_report ? 'Report ready' : 'No report'}</span>
                    <div className="adherence-bar-wrap">
                      <div className={`adherence-bar adherence-bar-${p.risk}`} style={{ width: p.has_report ? '100%' : '35%' }} />
                    </div>
                  </div>
                </td>
                <td><button type="button" className="row-arrow" aria-label="View" onClick={() => navigate('/doctor/reports', { state: { patientId: p.patient_id } })}>→</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
