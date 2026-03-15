import { useCallback, useEffect, useMemo, useState } from 'react';
import './DoctorPatients.css';

const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const initialsFrom = (name = '') => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

const ensureArray = (v) => (Array.isArray(v) ? v : []);

export default function DoctorPatients() {
  const [riskFilter, setRiskFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPatients = useCallback(async () => {
    const doctorId = sessionStorage.getItem('mediguard_user_id');
    if (!doctorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/doctor/${doctorId}/patients`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Failed to load patients');
      const list = (data.patients || []).map((p) => ({
        ...p,
        conditions: ensureArray(p.conditions),
        medications: ensureArray(p.medications),
      }));
      setPatients(list);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const filtered = useMemo(() => patients.filter((p) => {
    const conditions = ensureArray(p.conditions);
    const medications = ensureArray(p.medications);
    const matchRisk = riskFilter === 'all' || (p.risk || 'low') === riskFilter;
    const searchLower = search.trim().toLowerCase();
    const matchSearch = !searchLower ||
      (p.name || '').toLowerCase().includes(searchLower) ||
      conditions.some((c) => String(c).toLowerCase().includes(searchLower)) ||
      medications.some((m) => String(m).toLowerCase().includes(searchLower));
    return matchRisk && matchSearch;
  }), [patients, riskFilter, search]);

  return (
    <div className="doctor-page doctor-patients page-enter">
      <div className="doctor-patients-header">
        <div>
          <h1 className="doctor-page-title">Patient List</h1>
          <p className="doctor-page-subtitle">All patients who have created an account and completed their profile (medications &amp; conditions).</p>
        </div>
        <button
          type="button"
          className="doctor-patients-refresh"
          onClick={loadPatients}
          disabled={loading}
          aria-label="Refresh patient list"
        >
          {loading ? '…' : '↻'} Refresh
        </button>
      </div>
      <div className="doctor-patients-toolbar">
        <div className="doctor-patients-search-wrap">
          <span className="doctor-search-icon" aria-hidden>🔍</span>
          <input
            type="search"
            className="doctor-patients-search"
            placeholder="Search by name, condition, or medication..."
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
      <p className="doctor-patients-count">{loading ? 'Loading...' : `${filtered.length} Patient${filtered.length !== 1 ? 's' : ''}`}</p>
      <div className="dashboard-card doctor-patients-table-wrap">
        {filtered.length === 0 && !loading ? (
          <div className="doctor-patients-empty">
            <p className="doctor-patients-empty-title">No patients yet</p>
            <p className="doctor-patients-empty-text">When patients sign up and complete their profile (name, conditions, medications), they will appear here.</p>
          </div>
        ) : (
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
              {filtered.map((p) => {
                const conditions = ensureArray(p.conditions);
                const medications = ensureArray(p.medications);
                const risk = p.risk || 'low';
                return (
                  <tr key={p.patient_id}>
                    <td>
                      <div className="patient-cell">
                        <span className="patient-cell-avatar">{initialsFrom(p.name)}</span>
                        <div>
                          <strong>{p.name || '—'}</strong>
                          <span className="patient-cell-meta">{p.age != null ? `${p.age} years` : '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="conditions-tags">
                        {conditions.length === 0 ? (
                          <span className="condition-tag condition-tag-none">None</span>
                        ) : (
                          <>
                            {conditions.slice(0, 2).map((c) => (
                              <span key={String(c)} className="condition-tag">{c}</span>
                            ))}
                            {conditions.length > 2 && <span className="condition-tag condition-tag-more">+{conditions.length - 2}</span>}
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="medications-tags">
                        {medications.length === 0 ? (
                          <span className="medication-tag medication-tag-none">None</span>
                        ) : (
                          <>
                            {medications.slice(0, 2).map((m) => (
                              <span key={String(m)} className="medication-tag">{m}</span>
                            ))}
                            {medications.length > 2 && <span className="medication-tag medication-tag-more">+{medications.length - 2}</span>}
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`risk-dot risk-dot-${risk}`} />
                      {risk.charAt(0).toUpperCase() + risk.slice(1)}
                    </td>
                    <td>{p.latest_assessment ? 'Recent' : 'No check-in yet'}</td>
                    <td>
                      <div className="adherence-cell">
                        <span>{p.has_report ? 'Report ready' : 'No report'}</span>
                        <div className="adherence-bar-wrap">
                          <div className={`adherence-bar adherence-bar-${risk}`} style={{ width: p.has_report ? '100%' : '35%' }} />
                        </div>
                      </div>
                    </td>
                    <td><button type="button" className="row-arrow" aria-label="View">→</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
