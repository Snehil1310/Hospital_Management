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

export default function TransportPage() {
    const [requests, setRequests] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [patients, setPatients] = useState([]);
    // Backend TransportRequest model uses: fromLocation (required), toLocation (required), patient (required ref), type (required enum: wheelchair/stretcher/walking-assist/bed-transfer)
    const [form, setForm] = useState({ patient: '', fromLocation: '', toLocation: '', type: 'wheelchair', priority: 'normal', notes: '' });
    const [msg, setMsg] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const [r, p] = await Promise.allSettled([api.get('/transport'), api.get('/opd/patients?limit=100')]);
        if (r.status === 'fulfilled' && r.value.success) setRequests(r.value.data);
        if (p.status === 'fulfilled' && p.value.success) setPatients(p.value.data);
    };

    const createRequest = async () => {
        if (!form.patient || !form.fromLocation || !form.toLocation) { setMsg('Patient, From and To locations required'); setTimeout(() => setMsg(''), 3000); return; }
        const r = await api.post('/transport', form);
        if (r.success) { setMsg('Transport request created!'); setShowForm(false); setForm({ patient: '', fromLocation: '', toLocation: '', type: 'wheelchair', priority: 'normal', notes: '' }); loadData(); }
        else setMsg(r.message || 'Failed');
        setTimeout(() => setMsg(''), 4000);
    };

    const updateStatus = async (id, status) => {
        const r = await api.patch(`/transport/${id}/status`, { status });
        if (r.success) { setMsg(`Status → ${status}`); loadData(); }
        else setMsg(r.message || 'Update failed');
        setTimeout(() => setMsg(''), 3000);
    };

    const statusColors = { pending: 'badge-yellow', assigned: 'badge-blue', 'in-transit': 'badge-purple', completed: 'badge-green', cancelled: 'badge-red' };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">🚑 Internal Transport</h1><p className="text-sm text-gray-500">Patient transport queue management</p></div>
                <button onClick={() => setShowForm(true)} className="btn-primary">+ New Request</button>
            </div>

            {msg && <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium animate-fade-in">{msg}</div>}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card text-center"><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-bold text-gray-800 dark:text-white">{requests.length}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">Pending</p><p className="text-2xl font-bold text-amber-600">{requests.filter(r => r.status === 'pending').length}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">In Transit</p><p className="text-2xl font-bold text-blue-600">{requests.filter(r => r.status === 'in-transit').length}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">Completed</p><p className="text-2xl font-bold text-emerald-600">{requests.filter(r => r.status === 'completed').length}</p></div>
            </div>

            <div className="space-y-3">
                {requests.map((r) => (
                    <div key={r._id} className="card flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{r.type === 'wheelchair' ? '🦽' : '🛏️'}</span>
                                <span className="font-semibold text-gray-800 dark:text-white">{r.patient?.name || 'N/A'}</span>
                                <span className={statusColors[r.status] || 'badge-yellow'}>{r.status}</span>
                                {r.priority === 'urgent' && <span className="badge-red">Urgent</span>}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">📍 {r.fromLocation} → {r.toLocation} • {r.type}</p>
                            <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                            {r.status === 'pending' && <button onClick={() => updateStatus(r._id, 'in-transit')} className="btn-primary text-xs">Start</button>}
                            {r.status === 'in-transit' && <button onClick={() => updateStatus(r._id, 'completed')} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 font-medium">Complete</button>}
                            {r.status === 'pending' && <button onClick={() => updateStatus(r._id, 'cancelled')} className="btn-danger text-xs">Cancel</button>}
                        </div>
                    </div>
                ))}
                {requests.length === 0 && <div className="card text-center text-gray-400 py-8">No transport requests. Click "+ New Request" to create one.</div>}
            </div>

            <Modal open={showForm} onClose={() => setShowForm(false)} title="New Transport Request">
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Patient *</label>
                        <select className="input-field" value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })}>
                            <option value="">Select Patient</option>
                            {patients.map(p => <option key={p._id} value={p._id}>{p.name} ({p.patientId})</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">From Location *</label><input className="input-field" placeholder="Ward/Room" value={form.fromLocation} onChange={(e) => setForm({ ...form, fromLocation: e.target.value })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">To Location *</label><input className="input-field" placeholder="Destination" value={form.toLocation} onChange={(e) => setForm({ ...form, toLocation: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Type</label><select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="wheelchair">Wheelchair</option><option value="stretcher">Stretcher</option><option value="walking-assist">Walking Assist</option><option value="bed-transfer">Bed Transfer</option></select></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Priority</label><select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="normal">Normal</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option></select></div>
                    </div>
                    <div className="flex gap-2 pt-2"><button onClick={createRequest} className="btn-primary flex-1">Create Request</button><button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>
        </div>
    );
}
