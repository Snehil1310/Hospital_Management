'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '../../../lib/api';

function Modal({ open, onClose, title, children }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-dark-700"><h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}

export default function BloodBankPage() {
    const [stats, setStats] = useState(null);
    const [donors, setDonors] = useState([]);
    const [requests, setRequests] = useState([]);
    const [tab, setTab] = useState('inventory');
    const [showDonor, setShowDonor] = useState(false);
    const [showRequest, setShowRequest] = useState(false);
    const [donorForm, setDonorForm] = useState({ name: '', bloodGroup: 'O+', age: '', gender: 'male', phone: '' });
    const [requestForm, setRequestForm] = useState({ patient: '', bloodGroup: 'O+', unitsRequired: 1, priority: 'routine' });
    const [patientIdInput, setPatientIdInput] = useState('');
    const [patientInfo, setPatientInfo] = useState(null);
    const [lookupError, setLookupError] = useState('');
    const [msg, setMsg] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const [s, d, r] = await Promise.allSettled([api.get('/bloodbank/dashboard'), api.get('/bloodbank/donors'), api.get('/bloodbank/requests')]);
        if (s.status === 'fulfilled' && s.value.success) setStats(s.value.data);
        if (d.status === 'fulfilled' && d.value.success) setDonors(d.value.data);
        if (r.status === 'fulfilled' && r.value.success) setRequests(r.value.data);
    };

    const addDonor = async () => {
        if (!donorForm.name || !donorForm.phone) { setMsg('Name and phone required'); setTimeout(() => setMsg(''), 3000); return; }
        const donorId = `DN-${Date.now().toString(36).toUpperCase()}`;
        const r = await api.post('/bloodbank/donors', { ...donorForm, donorId, isEligible: true });
        if (r.success) { setMsg('Donor registered!'); setShowDonor(false); setDonorForm({ name: '', bloodGroup: 'O+', age: '', gender: 'male', phone: '' }); loadData(); }
        else setMsg(r.message || 'Failed');
        setTimeout(() => setMsg(''), 4000);
    };

    const lookupPatient = useCallback(async (pid) => {
        if (!pid || pid.length < 3) { setPatientInfo(null); setLookupError(''); return; }
        setLookupError('');
        try {
            const r = await api.get(`/opd/patients/lookup/${encodeURIComponent(pid)}`);
            if (r.success && r.data) {
                setPatientInfo(r.data);
                setRequestForm(prev => ({ ...prev, patient: r.data._id, bloodGroup: r.data.bloodGroup || prev.bloodGroup }));
                setLookupError('');
            } else { setPatientInfo(null); setRequestForm(prev => ({ ...prev, patient: '' })); setLookupError('Patient not found'); }
        } catch { setPatientInfo(null); setLookupError('Lookup failed'); }
    }, []);

    const createRequest = async () => {
        if (!requestForm.patient || !requestForm.bloodGroup || !requestForm.unitsRequired) { setMsg('Patient, blood group and units required'); setTimeout(() => setMsg(''), 3000); return; }
        const r = await api.post('/bloodbank/requests', requestForm);
        if (r.success) { setMsg('Blood request created!'); setShowRequest(false); setRequestForm({ patient: '', bloodGroup: 'O+', unitsRequired: 1, priority: 'routine' }); setPatientIdInput(''); setPatientInfo(null); loadData(); }
        else setMsg(r.message || 'Failed');
        setTimeout(() => setMsg(''), 4000);
    };

    // Backend uses PATCH /bloodbank/requests/:id/fulfill with { bloodUnitIds }
    // Since we don't have specific unit IDs to fulfill with, we'll just mark as fulfilled via a simpler approach
    const fulfillRequest = async (id) => {
        // We need to pass bloodUnitIds — for now, pass an empty array to trigger the status update
        // But backend requires actual unit IDs. Let's try fetching available units for the blood group first.
        const request = requests.find(r => r._id === id);
        if (!request) return;
        const unitsRes = await api.get(`/bloodbank/units?bloodGroup=${encodeURIComponent(request.bloodGroup)}&status=available`);
        if (unitsRes.success && unitsRes.data.length >= (request.unitsRequired - (request.unitsIssued || 0))) {
            const needed = request.unitsRequired - (request.unitsIssued || 0);
            const unitIds = unitsRes.data.slice(0, needed).map(u => u._id);
            const r = await api.patch(`/bloodbank/requests/${id}/fulfill`, { bloodUnitIds: unitIds });
            if (r.success) { setMsg('Request fulfilled!'); loadData(); }
            else setMsg(r.message || 'Fulfillment failed');
        } else {
            setMsg(`Not enough units available for ${request.bloodGroup}. Need ${request.unitsRequired - (request.unitsIssued || 0)}, have ${unitsRes.data?.length || 0}.`);
        }
        setTimeout(() => setMsg(''), 4000);
    };

    const bgColors = { 'A+': 'from-red-400 to-red-600', 'A-': 'from-rose-400 to-rose-600', 'B+': 'from-blue-400 to-blue-600', 'B-': 'from-indigo-400 to-indigo-600', 'AB+': 'from-purple-400 to-purple-600', 'AB-': 'from-violet-400 to-violet-600', 'O+': 'from-emerald-400 to-emerald-600', 'O-': 'from-teal-400 to-teal-600' };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">🅱️ Blood Bank</h1><p className="text-sm text-gray-500">Inventory, donors & blood requests</p></div>
                <div className="flex gap-2">
                    <button onClick={() => setShowDonor(true)} className="btn-secondary">+ Register Donor</button>
                    <button onClick={() => setShowRequest(true)} className="btn-danger">+ Blood Request</button>
                </div>
            </div>

            {msg && <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium animate-fade-in">{msg}</div>}

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    {stats.inventory?.map((bg) => (
                        <div key={bg.bloodGroup} className={`rounded-xl p-4 bg-gradient-to-br ${bgColors[bg.bloodGroup] || 'from-gray-400 to-gray-600'} text-white text-center shadow-lg`}>
                            <p className="text-2xl font-black">{bg.bloodGroup}</p>
                            <p className="text-3xl font-bold mt-1">{bg.available}</p>
                            <p className="text-xs opacity-80 mt-1">Available</p>
                            {bg.reserved > 0 && <p className="text-xs opacity-70">{bg.reserved} reserved</p>}
                        </div>
                    ))}
                </div>
            )}

            <div className="flex gap-1 bg-gray-100 dark:bg-dark-800 rounded-lg p-1 w-fit">
                {['inventory', 'donors', 'requests'].map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${tab === t ? 'bg-white dark:bg-dark-700 shadow text-primary-600' : 'text-gray-500'}`}>{t}</button>
                ))}
            </div>

            {tab === 'donors' && (
                <div className="card overflow-hidden p-0">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-dark-800"><tr>{['Donor ID', 'Name', 'Blood Group', 'Phone', 'Donations', 'Eligible'].map((h) => <th key={h} className="table-header">{h}</th>)}</tr></thead>
                        <tbody>{donors.map((d) => (
                            <tr key={d._id} className="hover:bg-gray-50 dark:hover:bg-dark-800/50">
                                <td className="table-cell font-mono text-primary-600">{d.donorId}</td>
                                <td className="table-cell font-medium">{d.name}</td>
                                <td className="table-cell"><span className="badge-red">{d.bloodGroup}</span></td>
                                <td className="table-cell">{d.phone}</td>
                                <td className="table-cell">{d.totalDonations || 0}</td>
                                <td className="table-cell">{d.isEligible ? <span className="badge-green">Yes</span> : <span className="badge-red">No</span>}</td>
                            </tr>
                        ))}
                            {donors.length === 0 && <tr><td colSpan="6" className="table-cell text-center text-gray-400 py-8">No donors registered yet.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'requests' && (
                <div className="space-y-3">
                    {requests.map((r) => (
                        <div key={r._id} className="card flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2"><span className="font-medium">{r.patient?.name || 'N/A'}</span><span className="badge-red">{r.bloodGroup}</span><span className={`badge ${r.priority === 'emergency' ? 'badge-red' : 'badge-yellow'}`}>{r.priority}</span></div>
                                <p className="text-sm text-gray-500 mt-1">{r.unitsRequired} units required • {r.unitsIssued || 0} issued</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`badge ${r.status === 'fulfilled' ? 'badge-green' : r.status === 'pending' ? 'badge-yellow' : 'badge-blue'}`}>{r.status}</span>
                                {r.status === 'pending' && <button onClick={() => fulfillRequest(r._id)} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 font-medium">Fulfill</button>}
                            </div>
                        </div>
                    ))}
                    {requests.length === 0 && <div className="card text-center text-gray-400 py-8">No blood requests. Click "+ Blood Request" to create one.</div>}
                </div>
            )}

            {tab === 'inventory' && stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card text-center"><p className="text-xs text-gray-500">Total Donors</p><p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalDonors || donors.length}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-500">Pending Requests</p><p className="text-2xl font-bold text-amber-600">{stats.pendingRequests || 0}</p></div>
                    <div className="card text-center border-red-300"><p className="text-xs text-gray-500">Expiring Soon</p><p className="text-2xl font-bold text-red-500">{stats.expiringSoon || 0}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-500">Total Units</p><p className="text-2xl font-bold text-emerald-600">{stats.inventory?.reduce((a, b) => a + b.available, 0) || 0}</p></div>
                </div>
            )}

            <Modal open={showDonor} onClose={() => setShowDonor(false)} title="Register Blood Donor">
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Full Name *</label><input className="input-field" value={donorForm.name} onChange={(e) => setDonorForm({ ...donorForm, name: e.target.value })} /></div>
                    <div className="grid grid-cols-3 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Blood Group</label><select className="input-field" value={donorForm.bloodGroup} onChange={(e) => setDonorForm({ ...donorForm, bloodGroup: e.target.value })}>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}</select></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Age</label><input type="number" className="input-field" value={donorForm.age} onChange={(e) => setDonorForm({ ...donorForm, age: e.target.value })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Gender</label><select className="input-field" value={donorForm.gender} onChange={(e) => setDonorForm({ ...donorForm, gender: e.target.value })}><option value="male">Male</option><option value="female">Female</option></select></div>
                    </div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Phone *</label><input className="input-field" value={donorForm.phone} onChange={(e) => setDonorForm({ ...donorForm, phone: e.target.value })} /></div>
                    <div className="flex gap-2 pt-2"><button onClick={addDonor} className="btn-primary flex-1">Register Donor</button><button onClick={() => setShowDonor(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>

            <Modal open={showRequest} onClose={() => setShowRequest(false)} title="Blood Request">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Patient ID *</label>
                        <input className="input-field" placeholder="e.g. PAT-001" value={patientIdInput}
                            onChange={(e) => setPatientIdInput(e.target.value.toUpperCase())}
                            onBlur={() => lookupPatient(patientIdInput)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookupPatient(patientIdInput); } }} />
                        {patientInfo && <div className="mt-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm"><span className="font-medium text-green-700 dark:text-green-400">✓ {patientInfo.name}</span><span className="text-green-600 dark:text-green-500 ml-2">Blood: {patientInfo.bloodGroup}</span></div>}
                        {lookupError && <p className="text-xs text-red-500 mt-1">{lookupError}</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Blood Group</label><select className="input-field" value={requestForm.bloodGroup} onChange={(e) => setRequestForm({ ...requestForm, bloodGroup: e.target.value })}>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}</select></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Units *</label><input type="number" min="1" className="input-field" value={requestForm.unitsRequired} onChange={(e) => setRequestForm({ ...requestForm, unitsRequired: parseInt(e.target.value) || 1 })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Priority</label><select className="input-field" value={requestForm.priority} onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option></select></div>
                    </div>
                    <div className="flex gap-2 pt-2"><button onClick={createRequest} className="btn-danger flex-1">Submit Request</button><button onClick={() => setShowRequest(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>
        </div>
    );
}
