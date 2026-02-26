'use client';
import { useState, useEffect } from 'react';
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

export default function OTPage() {
    const [surgeries, setSurgeries] = useState([]);
    const [theatres, setTheatres] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    // Backend Surgery model uses: procedureName (required), procedureType (required enum), leadSurgeon (required ref), estimatedDuration (required)
    const [form, setForm] = useState({ procedureName: '', procedureType: 'elective', patient: '', leadSurgeon: '', theatre: '', scheduledDate: '', startTime: '08:00', endTime: '10:00', estimatedDuration: 120 });
    const [msg, setMsg] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const [s, t, p, d] = await Promise.allSettled([api.get('/ot/surgeries'), api.get('/ot/theatres'), api.get('/opd/patients?limit=100'), api.get('/opd/doctors')]);
        if (s.status === 'fulfilled' && s.value.success) setSurgeries(s.value.data);
        if (t.status === 'fulfilled' && t.value.success) setTheatres(t.value.data);
        if (p.status === 'fulfilled' && p.value.success) setPatients(p.value.data);
        if (d.status === 'fulfilled' && d.value.success) setDoctors(d.value.data);
    };

    const scheduleSurgery = async () => {
        if (!form.procedureName || !form.patient || !form.leadSurgeon || !form.theatre || !form.scheduledDate) { setMsg('Fill all required fields'); setTimeout(() => setMsg(''), 3000); return; }
        const r = await api.post('/ot/surgeries', form);
        if (r.success) { setMsg('Surgery scheduled!'); setShowForm(false); setForm({ procedureName: '', procedureType: 'elective', patient: '', leadSurgeon: '', theatre: '', scheduledDate: '', startTime: '08:00', endTime: '10:00', estimatedDuration: 120 }); loadData(); }
        else setMsg(r.message || 'Failed — possible schedule conflict!');
        setTimeout(() => setMsg(''), 4000);
    };

    const updateSurgery = async (id, status) => {
        const r = await api.patch(`/ot/surgeries/${id}`, { status });
        if (r.success) { setMsg(`Surgery status → ${status}`); loadData(); }
        else setMsg(r.message || 'Update failed');
        setTimeout(() => setMsg(''), 3000);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">⚕️ OT Scheduling</h1><p className="text-sm text-gray-500">Operating theatre management & surgery scheduling</p></div>
                <button onClick={() => setShowForm(true)} className="btn-primary">+ Schedule Surgery</button>
            </div>

            {msg && <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium animate-fade-in">{msg}</div>}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {theatres.map((t) => (
                    <div key={t._id} className={`card ${t.status === 'in-use' ? 'border-red-300 dark:border-red-700' : t.status === 'available' ? 'border-emerald-300 dark:border-emerald-700' : 'border-amber-300'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-800 dark:text-white">{t.name}</h3>
                            <span className={`badge ${t.status === 'available' ? 'badge-green' : t.status === 'in-use' ? 'badge-red' : 'badge-yellow'}`}>{t.status}</span>
                        </div>
                        <p className="text-sm text-gray-500">Type: {t.type} • Floor {t.floor}</p>
                        <div className="mt-2 flex flex-wrap gap-1">{t.equipment?.map((e) => <span key={e} className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400">{e}</span>)}</div>
                    </div>
                ))}
                {theatres.length === 0 && <div className="card text-center text-gray-400 py-6 col-span-4">No theatres configured. Add via seed data.</div>}
            </div>

            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Surgery Schedule</h2>
            <div className="card overflow-hidden p-0">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-dark-800"><tr>{['Procedure', 'Patient', 'Surgeon', 'Theatre', 'Date/Time', 'Duration', 'Type', 'Status', 'Actions'].map((h) => <th key={h} className="table-header">{h}</th>)}</tr></thead>
                    <tbody>
                        {surgeries.map((s) => (
                            <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-dark-800/50">
                                <td className="table-cell font-medium">{s.procedureName}</td>
                                <td className="table-cell">{s.patient?.name || 'N/A'}</td>
                                <td className="table-cell">{s.leadSurgeon?.name || 'N/A'}</td>
                                <td className="table-cell">{s.theatre?.name || 'N/A'}</td>
                                <td className="table-cell text-xs">{new Date(s.scheduledDate).toLocaleDateString()}<br />{s.startTime} — {s.endTime}</td>
                                <td className="table-cell">{s.estimatedDuration} min</td>
                                <td className="table-cell"><span className={`badge ${s.procedureType === 'emergency' ? 'badge-red' : s.procedureType === 'day-case' ? 'badge-yellow' : 'badge-blue'}`}>{s.procedureType}</span></td>
                                <td className="table-cell"><span className={`badge ${s.status === 'completed' ? 'badge-green' : s.status === 'in-progress' ? 'badge-blue' : s.status === 'cancelled' ? 'badge-red' : 'badge-yellow'}`}>{s.status}</span></td>
                                <td className="table-cell">
                                    <div className="flex gap-1">
                                        {s.status === 'scheduled' && <button onClick={() => updateSurgery(s._id, 'in-progress')} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">Start</button>}
                                        {s.status === 'in-progress' && <button onClick={() => updateSurgery(s._id, 'completed')} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-medium">Complete</button>}
                                        {s.status === 'scheduled' && <button onClick={() => updateSurgery(s._id, 'cancelled')} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium">Cancel</button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {surgeries.length === 0 && <tr><td colSpan="9" className="table-cell text-center text-gray-400 py-8">No surgeries scheduled. Click "+ Schedule Surgery".</td></tr>}
                    </tbody>
                </table>
            </div>

            <Modal open={showForm} onClose={() => setShowForm(false)} title="Schedule Surgery">
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Procedure Name *</label><input className="input-field" placeholder="e.g. Appendectomy" value={form.procedureName} onChange={(e) => setForm({ ...form, procedureName: e.target.value })} /></div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Procedure Type *</label><select className="input-field" value={form.procedureType} onChange={(e) => setForm({ ...form, procedureType: e.target.value })}><option value="elective">Elective</option><option value="emergency">Emergency</option><option value="day-case">Day Case</option></select></div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Patient *</label><select className="input-field" value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })}><option value="">Select Patient</option>{patients.map(p => <option key={p._id} value={p._id}>{p.name} ({p.patientId})</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Lead Surgeon *</label><select className="input-field" value={form.leadSurgeon} onChange={(e) => setForm({ ...form, leadSurgeon: e.target.value })}><option value="">Select Surgeon</option>{doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}</select></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Theatre *</label><select className="input-field" value={form.theatre} onChange={(e) => setForm({ ...form, theatre: e.target.value })}><option value="">Select OT</option>{theatres.filter(t => t.status === 'available').map(t => <option key={t._id} value={t._id}>{t.name} ({t.type})</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Date *</label><input type="date" className="input-field" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Start</label><input type="time" className="input-field" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">End</label><input type="time" className="input-field" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div>
                    </div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Estimated Duration (min) *</label><input type="number" className="input-field" value={form.estimatedDuration} onChange={(e) => setForm({ ...form, estimatedDuration: parseInt(e.target.value) || 0 })} /></div>
                    <div className="flex gap-2 pt-2"><button onClick={scheduleSurgery} className="btn-primary flex-1">Schedule Surgery</button><button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>
        </div>
    );
}
