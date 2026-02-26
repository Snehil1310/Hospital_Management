'use client';
import { useState, useEffect } from 'react';
import api from '../../../lib/api';

function Modal({ open, onClose, title, children }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-dark-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

export default function OPDPage() {
    const [tokens, setTokens] = useState([]);
    const [patients, setPatients] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [stats, setStats] = useState(null);
    const [tab, setTab] = useState('queue');
    const [showTokenForm, setShowTokenForm] = useState(false);
    const [showPatientForm, setShowPatientForm] = useState(false);
    const [tokenForm, setTokenForm] = useState({ patient: '', doctor: '', department: 'General', type: 'walk-in', priority: 'normal' });
    const [patientForm, setPatientForm] = useState({ name: '', age: '', gender: 'male', phone: '', bloodGroup: 'O+', address: { city: '' }, email: '' });
    const [search, setSearch] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [msg, setMsg] = useState('');
    const [allPatients, setAllPatients] = useState([]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const [t, d, s, p] = await Promise.allSettled([
            api.get('/opd/tokens'), api.get('/opd/doctors'), api.get('/opd/dashboard'), api.get('/opd/patients?limit=100')
        ]);
        if (t.status === 'fulfilled' && t.value.success) setTokens(t.value.data);
        if (d.status === 'fulfilled' && d.value.success) setDoctors(d.value.data);
        if (s.status === 'fulfilled' && s.value.success) setStats(s.value.data);
        if (p.status === 'fulfilled' && p.value.success) setAllPatients(p.value.data);
    };

    const searchPatients = async (q) => {
        setSearch(q);
        if (q.length > 1) {
            const r = await api.get(`/opd/patients?search=${q}`);
            if (r.success) setSearchResults(r.data);
        } else setSearchResults([]);
    };

    const registerPatient = async () => {
        if (!patientForm.name || !patientForm.phone) { setMsg('Name and phone are required'); setTimeout(() => setMsg(''), 3000); return; }
        const id = `PAT-${Date.now().toString(36).toUpperCase()}`;
        const r = await api.post('/opd/patients', { ...patientForm, patientId: id });
        if (r.success) {
            setMsg(`Patient ${r.data.name} registered! (${r.data.patientId})`);
            setShowPatientForm(false);
            setPatientForm({ name: '', age: '', gender: 'male', phone: '', bloodGroup: 'O+', address: { city: '' }, email: '' });
            setSelectedPatient(r.data);
            setTokenForm({ ...tokenForm, patient: r.data._id });
            loadData();
        } else setMsg(r.message || 'Registration failed');
        setTimeout(() => setMsg(''), 4000);
    };

    const createToken = async () => {
        if (!tokenForm.patient) { setMsg('Select a patient first'); setTimeout(() => setMsg(''), 3000); return; }
        const r = await api.post('/opd/tokens', tokenForm);
        if (r.success) {
            setMsg(`Token #${r.data.tokenNumber} generated!`);
            setShowTokenForm(false);
            setTokenForm({ patient: '', doctor: '', department: 'General', type: 'walk-in', priority: 'normal' });
            setSelectedPatient(null);
            setSearch('');
            loadData();
        } else setMsg(r.message || 'Failed to create token');
        setTimeout(() => setMsg(''), 4000);
    };

    const updateStatus = async (id, status) => {
        await api.patch(`/opd/tokens/${id}/status`, { status });
        setMsg(`Token status updated to ${status}`);
        loadData();
        setTimeout(() => setMsg(''), 3000);
    };

    const statusColors = { waiting: 'badge-yellow', 'in-consultation': 'badge-blue', completed: 'badge-green', cancelled: 'badge-red', 'no-show': 'badge-red' };
    const priorityColors = { normal: 'badge-blue', urgent: 'badge-yellow', emergency: 'badge-red' };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">🏥 OPD Management</h1><p className="text-sm text-gray-500">Patient registration, token queue & appointments</p></div>
                <div className="flex gap-2">
                    <button onClick={() => setShowPatientForm(true)} className="btn-secondary">+ Register Patient</button>
                    <button onClick={() => setShowTokenForm(true)} className="btn-primary">+ Generate Token</button>
                </div>
            </div>

            {msg && <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium animate-fade-in">{msg}</div>}

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[{ l: "Today's Tokens", v: stats.tokensToday || 0, c: 'text-blue-600' }, { l: 'Waiting', v: stats.waiting || 0, c: 'text-amber-600' }, { l: 'In Consultation', v: stats.inConsultation || 0, c: 'text-indigo-600' }, { l: 'Completed', v: stats.completed || 0, c: 'text-emerald-600' }, { l: 'Total Patients', v: allPatients.length, c: 'text-purple-600' }]
                        .map((s) => <div key={s.l} className="card text-center"><p className="text-xs text-gray-500">{s.l}</p><p className={`text-2xl font-bold ${s.c}`}>{s.v}</p></div>)}
                </div>
            )}

            <div className="flex gap-1 bg-gray-100 dark:bg-dark-800 rounded-lg p-1 w-fit">
                {['queue', 'patients'].map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t ? 'bg-white dark:bg-dark-700 shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
                        {t === 'queue' ? `Token Queue (${tokens.length})` : `Patients (${allPatients.length})`}
                    </button>
                ))}
            </div>

            {tab === 'queue' && (
                <div className="card overflow-hidden p-0">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-dark-800"><tr>{['#', 'Patient', 'Doctor', 'Department', 'Priority', 'Status', 'Actions'].map((h) => <th key={h} className="table-header">{h}</th>)}</tr></thead>
                        <tbody>
                            {tokens.map((token) => (
                                <tr key={token._id} className="hover:bg-gray-50 dark:hover:bg-dark-800/50">
                                    <td className="table-cell font-bold text-primary-600">#{token.tokenNumber}</td>
                                    <td className="table-cell font-medium">{token.patient?.name || 'N/A'}</td>
                                    <td className="table-cell">{token.doctor?.name || 'N/A'}</td>
                                    <td className="table-cell">{token.department}</td>
                                    <td className="table-cell"><span className={priorityColors[token.priority]}>{token.priority}</span></td>
                                    <td className="table-cell"><span className={statusColors[token.status]}>{token.status}</span></td>
                                    <td className="table-cell">
                                        <div className="flex gap-1">
                                            {token.status === 'waiting' && <button onClick={() => updateStatus(token._id, 'in-consultation')} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium">Start</button>}
                                            {token.status === 'in-consultation' && <button onClick={() => updateStatus(token._id, 'completed')} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 font-medium">Complete</button>}
                                            {token.status === 'waiting' && <button onClick={() => updateStatus(token._id, 'cancelled')} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 font-medium">Cancel</button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {tokens.length === 0 && <tr><td colSpan="7" className="table-cell text-center text-gray-400 py-8">No tokens for today. Click "+ Generate Token" to start.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'patients' && (
                <div className="card overflow-hidden p-0">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-dark-800"><tr>{['Patient ID', 'Name', 'Age/Gender', 'Phone', 'Blood Group', 'City', 'Registered'].map((h) => <th key={h} className="table-header">{h}</th>)}</tr></thead>
                        <tbody>
                            {allPatients.map((p) => (
                                <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-dark-800/50">
                                    <td className="table-cell font-mono text-primary-600">{p.patientId}</td>
                                    <td className="table-cell font-medium">{p.name}</td>
                                    <td className="table-cell">{p.age} / {p.gender}</td>
                                    <td className="table-cell">{p.phone}</td>
                                    <td className="table-cell"><span className="badge-red">{p.bloodGroup}</span></td>
                                    <td className="table-cell">{p.address?.city || '—'}</td>
                                    <td className="table-cell text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Register Patient Modal */}
            <Modal open={showPatientForm} onClose={() => setShowPatientForm(false)} title="Register New Patient">
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Full Name *</label><input className="input-field" placeholder="Patient full name" value={patientForm.name} onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })} /></div>
                    <div className="grid grid-cols-3 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Age *</label><input type="number" className="input-field" placeholder="Age" value={patientForm.age} onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Gender</label><select className="input-field" value={patientForm.gender} onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Blood Group</label><select className="input-field" value={patientForm.bloodGroup} onChange={(e) => setPatientForm({ ...patientForm, bloodGroup: e.target.value })}>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Phone *</label><input className="input-field" placeholder="9876543210" value={patientForm.phone} onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">City</label><input className="input-field" placeholder="City" value={patientForm.address.city} onChange={(e) => setPatientForm({ ...patientForm, address: { ...patientForm.address, city: e.target.value } })} /></div>
                    </div>
                    <div className="flex gap-2 pt-2"><button onClick={registerPatient} className="btn-primary flex-1">Register Patient</button><button onClick={() => setShowPatientForm(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>

            {/* Generate Token Modal */}
            <Modal open={showTokenForm} onClose={() => setShowTokenForm(false)} title="Generate OPD Token">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Search Patient *</label>
                        <input className="input-field" placeholder="Type name, phone, or patient ID..." value={search} onChange={(e) => searchPatients(e.target.value)} />
                        {searchResults.length > 0 && (
                            <div className="mt-1 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow max-h-40 overflow-y-auto">
                                {searchResults.map((p) => (
                                    <button key={p._id} onClick={() => { setSelectedPatient(p); setTokenForm({ ...tokenForm, patient: p._id }); setSearch(p.name); setSearchResults([]); }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 dark:hover:bg-dark-700 border-b border-gray-100 dark:border-dark-700">
                                        <span className="font-medium">{p.name}</span> — <span className="text-gray-500">{p.patientId} • {p.phone}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {selectedPatient && <div className="mt-2 p-2 rounded bg-primary-50 dark:bg-primary-900/20 text-sm"><strong>Selected:</strong> {selectedPatient.name} ({selectedPatient.patientId})</div>}
                        <button onClick={() => { setShowTokenForm(false); setShowPatientForm(true); }} className="text-xs text-primary-600 mt-2 hover:underline">Patient not found? Register new patient →</button>
                    </div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Doctor</label>
                        <select className="input-field" value={tokenForm.doctor} onChange={(e) => setTokenForm({ ...tokenForm, doctor: e.target.value })}>
                            <option value="">Select Doctor</option>
                            {doctors.map((d) => <option key={d._id} value={d._id}>{d.name} — {d.specialization || d.department}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Department</label>
                            <select className="input-field" value={tokenForm.department} onChange={(e) => setTokenForm({ ...tokenForm, department: e.target.value })}>
                                {['General', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'ENT', 'Dermatology', 'Gynecology'].map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Priority</label>
                            <select className="input-field" value={tokenForm.priority} onChange={(e) => setTokenForm({ ...tokenForm, priority: e.target.value })}>
                                <option value="normal">Normal</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2"><button onClick={createToken} className="btn-primary flex-1">Generate Token</button><button onClick={() => setShowTokenForm(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>
        </div>
    );
}
