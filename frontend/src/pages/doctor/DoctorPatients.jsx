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
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientDetail, setPatientDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  useEffect(() => {
    if (!selectedPatientId) {
      setPatientDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    fetch(`${API}/patient/${selectedPatientId}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setPatientDetail(data);
      })
      .catch(() => {
        if (!cancelled) setPatientDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedPatientId]);

  const closeDetail = useCallback(() => {
    setSelectedPatientId(null);
    setPatientDetail(null);
  }, []);

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
                  <tr
                    key={p.patient_id}
                    className="doctor-patients-row-clickable"
                    onClick={() => setSelectedPatientId(p.patient_id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPatientId(p.patient_id); } }}
                    aria-label={`View profile for ${p.name || 'Patient'}`}
                  >
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
                    <td><button type="button" className="row-arrow" aria-label="View profile" onClick={(e) => { e.stopPropagation(); setSelectedPatientId(p.patient_id); }}>→</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selectedPatientId && (
        <div className="patient-detail-overlay" onClick={closeDetail} role="dialog" aria-modal="true" aria-labelledby="patient-detail-title">
          <div className="patient-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="patient-detail-header">
              <h2 id="patient-detail-title" className="patient-detail-title">Patient Profile</h2>
              <button type="button" className="patient-detail-close" onClick={closeDetail} aria-label="Close">×</button>
            </div>
            {detailLoading ? (
              <div className="patient-detail-loading">Loading profile…</div>
            ) : patientDetail ? (
              <div className="patient-detail-body">
                <div className="patient-detail-hero">
                  <span className="patient-detail-avatar">{initialsFrom(patientDetail.name)}</span>
                  <div>
                    <h3 className="patient-detail-name">{patientDetail.name || '—'}</h3>
                    <p className="patient-detail-meta">Patient ID: #{patientDetail.patient_id}</p>
                    <p className="patient-detail-meta">{patientDetail.age != null ? `${patientDetail.age} years old` : '—'}</p>
                    <p className="patient-detail-risk">
                      <span className={`risk-dot risk-dot-${patientDetail.latest_assessment?.urgency || 'low'}`} />
                      Risk: {(patientDetail.latest_assessment?.urgency || 'low').charAt(0).toUpperCase() + (patientDetail.latest_assessment?.urgency || 'low').slice(1)}
                    </p>
                  </div>
                </div>

                <section className="patient-detail-section">
                  <h4 className="patient-detail-section-title">Conditions</h4>
                  <div className="patient-detail-tags conditions-tags">
                    {ensureArray(patientDetail.conditions).length === 0 ? (
                      <span className="condition-tag condition-tag-none">None listed</span>
                    ) : (
                      ensureArray(patientDetail.conditions).map((c) => (
                        <span key={String(c)} className="condition-tag">{c}</span>
                      ))
                    )}
                  </div>
                </section>

                <section className="patient-detail-section">
                  <h4 className="patient-detail-section-title">Medications</h4>
                  <ul className="patient-detail-list">
                    {ensureArray(patientDetail.medications).length === 0 ? (
                      <li className="patient-detail-list-none">None listed</li>
                    ) : (
                      ensureArray(patientDetail.medications).map((m) => (
                        <li key={String(m)}>{m}</li>
                      ))
                    )}
                  </ul>
                </section>

                {(patientDetail.metadata?.contact && (patientDetail.metadata.contact.email || patientDetail.metadata.contact.phone || patientDetail.metadata.contact.address || patientDetail.metadata.contact.city)) && (
                  <section className="patient-detail-section">
                    <h4 className="patient-detail-section-title">Profile (from their account)</h4>
                    <div className="patient-detail-profile-block">
                      {patientDetail.metadata.contact.email && (
                        <p className="patient-detail-profile-line">✉ {patientDetail.metadata.contact.email}</p>
                      )}
                      {patientDetail.metadata.contact.phone && (
                        <p className="patient-detail-profile-line">📞 {patientDetail.metadata.contact.phone}</p>
                      )}
                      {(patientDetail.metadata.contact.address || patientDetail.metadata.contact.city || patientDetail.metadata.contact.province || patientDetail.metadata.contact.postal_code) && (
                        <p className="patient-detail-profile-line patient-detail-address">
                          📍 {[patientDetail.metadata.contact.address, patientDetail.metadata.contact.city, [patientDetail.metadata.contact.province, patientDetail.metadata.contact.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {patientDetail.metadata?.location && !(patientDetail.metadata?.contact?.address || patientDetail.metadata?.contact?.city) && (
                  <section className="patient-detail-section">
                    <h4 className="patient-detail-section-title">Location</h4>
                    <p className="patient-detail-text">{patientDetail.metadata.location}</p>
                  </section>
                )}

                {patientDetail.metadata?.date_of_birth && (
                  <section className="patient-detail-section">
                    <h4 className="patient-detail-section-title">Date of birth</h4>
                    <p className="patient-detail-text">{patientDetail.metadata.date_of_birth}</p>
                  </section>
                )}

                {patientDetail.metadata?.blood_type && (
                  <section className="patient-detail-section">
                    <h4 className="patient-detail-section-title">Blood type</h4>
                    <p className="patient-detail-text">{patientDetail.metadata.blood_type}</p>
                  </section>
                )}

                {patientDetail.metadata?.allergies && patientDetail.metadata.allergies.length > 0 && (
                  <section className="patient-detail-section">
                    <h4 className="patient-detail-section-title">Allergies</h4>
                    <div className="patient-detail-tags conditions-tags">
                      {patientDetail.metadata.allergies.map((a) => (
                        <span key={String(a)} className="condition-tag" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#b91c1c' }}>{a}</span>
                      ))}
                    </div>
                  </section>
                )}

                <section className="patient-detail-section">
                  <h4 className="patient-detail-section-title">Status</h4>
                  <p className="patient-detail-text">
                    {patientDetail.has_report ? '✓ AI report generated' : 'No AI report yet'}
                    {patientDetail.latest_assessment && (
                      <span> · Last check-in: {patientDetail.latest_assessment.urgency || 'completed'}</span>
                    )}
                  </p>
                </section>
              </div>
            ) : (
              <div className="patient-detail-error">Could not load profile.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
