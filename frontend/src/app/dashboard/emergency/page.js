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

export default function EmergencyPage() {
    const [cases, setCases] = useState([]);
    const [stats, setStats] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [form, setForm] = useState({ patient: '', chiefComplaint: '', priority: 'urgent', arrivalMode: 'walk-in', vitals: { bloodPressure: '', heartRate: '', temperature: '', oxygenSaturation: '' } });
    const [msg, setMsg] = useState('');

    useEffect(() => { loadData(); const i = setInterval(loadData, 15000); return () => clearInterval(i); }, []);

    const loadData = async () => {
        const [c, s, p, d] = await Promise.allSettled([api.get('/emergency/cases'), api.get('/emergency/dashboard'), api.get('/opd/patients?limit=100'), api.get('/opd/doctors')]);
        if (c.status === 'fulfilled' && c.value.success) setCases(c.value.data);
        if (s.status === 'fulfilled' && s.value.success) setStats(s.value.data);
        if (p.status === 'fulfilled' && p.value.success) setPatients(p.value.data);
        if (d.status === 'fulfilled' && d.value.success) setDoctors(d.value.data);
    };

    const createCase = async () => {
        if (!form.chiefComplaint) { setMsg('Chief complaint is required'); setTimeout(() => setMsg(''), 3000); return; }
        const r = await api.post('/emergency/cases', { ...form, arrivalTime: new Date() });
        if (r.success) { setMsg(`Emergency case created! Priority: ${form.priority}`); setShowForm(false); setForm({ patient: '', chiefComplaint: '', priority: 'urgent', arrivalMode: 'walk-in', vitals: { bloodPressure: '', heartRate: '', temperature: '', oxygenSaturation: '' } }); loadData(); }
        else setMsg(r.message || 'Failed to create case');
        setTimeout(() => setMsg(''), 4000);
    };

    const updateCase = async (id, data) => {
        const r = await api.patch(`/emergency/cases/${id}`, data);
        if (r.success) { setMsg(`Case updated!`); loadData(); }
        setTimeout(() => setMsg(''), 3000);
    };

    const priorityConfig = { critical: { color: 'bg-red-500', badge: 'badge-red', border: 'border-red-500' }, urgent: { color: 'bg-orange-500', badge: 'badge-yellow', border: 'border-orange-500' }, 'semi-urgent': { color: 'bg-amber-400', badge: 'badge-yellow', border: 'border-amber-400' }, normal: { color: 'bg-green-500', badge: 'badge-green', border: 'border-green-500' } };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">🚨 Emergency Triage</h1><p className="text-sm text-gray-500">Real-time emergency case management</p></div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2"><div className="status-red"></div><span className="text-sm text-gray-500">Live</span></div>
                    <button onClick={() => setShowForm(true)} className="btn-danger">+ New Emergency</button>
                </div>
            </div>

            {msg && <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium animate-fade-in">{msg}</div>}

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="card text-center border-l-4 border-red-500"><p className="text-xs text-gray-500">Critical</p><p className="text-3xl font-bold text-red-500">{stats.critical || 0}</p></div>
                    <div className="card text-center border-l-4 border-orange-500"><p className="text-xs text-gray-500">Urgent</p><p className="text-3xl font-bold text-orange-500">{stats.urgent || 0}</p></div>
                    <div className="card text-center border-l-4 border-amber-500"><p className="text-xs text-gray-500">Semi-Urgent</p><p className="text-3xl font-bold text-amber-500">{stats.semiUrgent || 0}</p></div>
                    <div className="card text-center border-l-4 border-green-500"><p className="text-xs text-gray-500">Normal</p><p className="text-3xl font-bold text-green-500">{stats.normal || 0}</p></div>
                    <div className="card text-center border-l-4 border-blue-500"><p className="text-xs text-gray-500">In Treatment</p><p className="text-3xl font-bold text-blue-500">{stats.inTreatment || 0}</p></div>
                    <div className="card text-center border-l-4 border-purple-500"><p className="text-xs text-gray-500">Waiting</p><p className="text-3xl font-bold text-purple-500">{stats.waiting || 0}</p></div>
                </div>
            )}

            <div className="space-y-3">
                {cases.map((c) => {
                    const pc = priorityConfig[c.priority] || priorityConfig.normal;
                    return (
                        <div key={c._id} className={`card border-l-4 ${pc.border} ${c.priority === 'critical' ? 'animate-pulse-slow' : ''}`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-800 dark:text-white">{c.patient?.name || 'Unknown Patient'}</span>
                                        <span className={pc.badge}>{c.priority}</span>
                                        <span className="badge-blue">{c.status}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1"><strong>Complaint:</strong> {c.chiefComplaint}</p>
                                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                        <span>ID: {c.caseId}</span>
                                        <span>Arrival: {c.arrivalMode}</span>
                                        {c.assignedDoctor && <span>Doctor: {c.assignedDoctor.name}</span>}
                                        <span>{new Date(c.arrivalTime || c.createdAt).toLocaleTimeString()}</span>
                                    </div>
                                    {(c.vitals?.bloodPressure || c.vitals?.heartRate || c.vitals?.oxygenSaturation) && (
                                        <div className="flex gap-3 mt-2">
                                            {c.vitals.bloodPressure && <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400">BP: {c.vitals.bloodPressure}</span>}
                                            {c.vitals.heartRate && <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400">HR: {c.vitals.heartRate}</span>}
                                            {c.vitals.oxygenSaturation && <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400">SpO2: {c.vitals.oxygenSaturation}%</span>}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2">
                                    {c.status === 'waiting' && (
                                        <>
                                            <select className="input-field text-xs py-1" onChange={(e) => { if (e.target.value) updateCase(c._id, { assignedDoctor: e.target.value }); }}>
                                                <option value="">Assign Doctor</option>
                                                {doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                            </select>
                                            <button onClick={() => updateCase(c._id, { status: 'in-treatment' })} className="btn-primary text-xs">Start Treatment</button>
                                        </>
                                    )}
                                    {c.status === 'in-treatment' && (
                                        <>
                                            <button onClick={() => updateCase(c._id, { status: 'admitted' })} className="btn-secondary text-xs">Admit</button>
                                            <button onClick={() => updateCase(c._id, { status: 'discharged' })} className="btn-success text-xs">Discharge</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {cases.length === 0 && <div className="card text-center text-gray-400 py-12">No active emergency cases. Click "+ New Emergency" to register one.</div>}
            </div>

            <Modal open={showForm} onClose={() => setShowForm(false)} title="Register Emergency Case">
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Patient</label>
                        <select className="input-field" value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })}>
                            <option value="">Unknown / Walk-in</option>
                            {patients.map(p => <option key={p._id} value={p._id}>{p.name} ({p.patientId})</option>)}
                        </select>
                    </div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Chief Complaint *</label><textarea className="input-field" rows={2} placeholder="Chest pain, difficulty breathing, trauma..." value={form.chiefComplaint} onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Priority</label>
                            <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                                <option value="critical">🔴 Critical</option><option value="urgent">🟠 Urgent</option><option value="semi-urgent">🟡 Semi-Urgent</option><option value="normal">🟢 Normal</option>
                            </select>
                        </div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Arrival Mode</label>
                            <select className="input-field" value={form.arrivalMode} onChange={(e) => setForm({ ...form, arrivalMode: e.target.value })}>
                                <option value="walk-in">Walk-in</option><option value="ambulance">Ambulance</option><option value="referral">Referral</option><option value="police">Police</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Vitals (optional)</p>
                        <div className="grid grid-cols-2 gap-3">
                            <input className="input-field" placeholder="BP (e.g. 120/80)" value={form.vitals.bloodPressure} onChange={(e) => setForm({ ...form, vitals: { ...form.vitals, bloodPressure: e.target.value } })} />
                            <input className="input-field" placeholder="Heart Rate" value={form.vitals.heartRate} onChange={(e) => setForm({ ...form, vitals: { ...form.vitals, heartRate: e.target.value } })} />
                            <input className="input-field" placeholder="Temperature °F" value={form.vitals.temperature} onChange={(e) => setForm({ ...form, vitals: { ...form.vitals, temperature: e.target.value } })} />
                            <input className="input-field" placeholder="SpO2 %" value={form.vitals.oxygenSaturation} onChange={(e) => setForm({ ...form, vitals: { ...form.vitals, oxygenSaturation: e.target.value } })} />
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2"><button onClick={createCase} className="btn-danger flex-1">Register Emergency</button><button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>
        </div>
    );
}
