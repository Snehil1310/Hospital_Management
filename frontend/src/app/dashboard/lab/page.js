'use client';
import { useState, useEffect, useCallback } from 'react';
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

// Reusable Patient ID Lookup Component
function PatientLookup({ value, onChange, onPatientFound }) {
    const [patientIdInput, setPatientIdInput] = useState('');
    const [patientInfo, setPatientInfo] = useState(null);
    const [lookupError, setLookupError] = useState('');
    const [loading, setLoading] = useState(false);

    const lookupPatient = useCallback(async (pid) => {
        if (!pid || pid.length < 3) { setPatientInfo(null); setLookupError(''); return; }
        setLoading(true);
        setLookupError('');
        try {
            const r = await api.get(`/opd/patients/lookup/${encodeURIComponent(pid)}`);
            if (r.success && r.data) {
                setPatientInfo(r.data);
                onChange(r.data._id);
                if (onPatientFound) onPatientFound(r.data);
                setLookupError('');
            } else {
                setPatientInfo(null);
                onChange('');
                setLookupError('Patient not found');
            }
        } catch {
            setPatientInfo(null);
            onChange('');
            setLookupError('Lookup failed');
        }
        setLoading(false);
    }, [onChange, onPatientFound]);

    return (
        <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Patient ID *</label>
            <div className="flex gap-2">
                <input className="input-field flex-1" placeholder="e.g. PAT-001" value={patientIdInput}
                    onChange={(e) => { setPatientIdInput(e.target.value.toUpperCase()); }}
                    onBlur={() => lookupPatient(patientIdInput)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookupPatient(patientIdInput); } }} />
                {loading && <div className="flex items-center"><div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>}
            </div>
            {patientInfo && (
                <div className="mt-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm">
                    <span className="font-medium text-green-700 dark:text-green-400">✓ {patientInfo.name}</span>
                    <span className="text-green-600 dark:text-green-500 ml-2">Age: {patientInfo.age} • {patientInfo.bloodGroup} • {patientInfo.phone}</span>
                </div>
            )}
            {lookupError && <p className="text-xs text-red-500 mt-1">{lookupError}</p>}
        </div>
    );
}

export default function LabPage() {
    const [samples, setSamples] = useState([]);
    const [stats, setStats] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ patient: '', testType: '', category: 'blood', priority: 'routine', notes: '' });
    const [msg, setMsg] = useState('');

    useEffect(() => { loadData(); }, [statusFilter]);

    const loadData = async () => {
        const [s, d] = await Promise.allSettled([api.get(`/lab/samples${statusFilter ? `?status=${statusFilter}` : ''}`), api.get('/lab/dashboard')]);
        if (s.status === 'fulfilled' && s.value.success) setSamples(s.value.data);
        if (d.status === 'fulfilled' && d.value.success) setStats(d.value.data);
    };

    const orderSample = async () => {
        if (!form.patient || !form.testType) { setMsg('Patient and test type required'); setTimeout(() => setMsg(''), 3000); return; }
        const r = await api.post('/lab/samples', form);
        if (r.success) { setMsg(`Lab sample ordered!`); setShowForm(false); setForm({ patient: '', testType: '', category: 'blood', priority: 'routine', notes: '' }); loadData(); }
        else setMsg(r.message || 'Failed to order');
        setTimeout(() => setMsg(''), 4000);
    };

    const updateStatus = async (id, status) => {
        const r = await api.patch(`/lab/samples/${id}/status`, { status });
        if (r.success) { setMsg(`Sample status → ${status}`); loadData(); }
        setTimeout(() => setMsg(''), 3000);
    };

    const statusColors = { ordered: 'badge-purple', collected: 'badge-blue', processing: 'badge-yellow', 'report-ready': 'badge-green', delivered: 'badge-green' };
    const statusSteps = ['ordered', 'collected', 'processing', 'report-ready', 'delivered'];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">🔬 Lab Tracking</h1><p className="text-sm text-gray-500">Order, track, and manage lab samples</p></div>
                <button onClick={() => setShowForm(true)} className="btn-primary">+ Order Lab Test</button>
            </div>

            {msg && <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium animate-fade-in">{msg}</div>}

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[{ l: 'Total', v: stats.total || 0 }, { l: 'Ordered', v: stats.ordered || 0 }, { l: 'Processing', v: stats.processing || 0 }, { l: 'Reports Ready', v: stats.reportReady || 0 }, { l: 'Today', v: stats.todayCount || 0 }]
                        .map((s) => <div key={s.l} className="card text-center"><p className="text-xs text-gray-500">{s.l}</p><p className="text-2xl font-bold text-gray-800 dark:text-white">{s.v}</p></div>)}
                </div>
            )}

            <div className="flex gap-2 flex-wrap">
                {['', ...statusSteps].map((s) => (
                    <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === s ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'bg-gray-100 dark:bg-dark-800 text-gray-600 dark:text-gray-400'}`}>
                        {s || 'All'}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
                {samples.map((sample) => {
                    const currentStep = statusSteps.indexOf(sample.status);
                    return (
                        <div key={sample._id} className="card">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-800 dark:text-white">{sample.testType}</span>
                                        <span className={statusColors[sample.status]}>{sample.status}</span>
                                        {(sample.priority === 'urgent' || sample.priority === 'stat') && <span className="badge-red">{sample.priority.toUpperCase()}</span>}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1 flex gap-4 flex-wrap">
                                        <span>Patient: {sample.patient?.name || 'N/A'} ({sample.patient?.patientId || ''})</span>
                                        <span>Barcode: <span className="font-mono">{sample.barcode}</span></span>
                                        <span>Category: {sample.category}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {sample.status === 'ordered' && <button onClick={() => updateStatus(sample._id, 'collected')} className="btn-secondary text-xs">Collect</button>}
                                    {sample.status === 'collected' && <button onClick={() => updateStatus(sample._id, 'processing')} className="btn-secondary text-xs">Process</button>}
                                    {sample.status === 'processing' && <button onClick={() => updateStatus(sample._id, 'report-ready')} className="btn-primary text-xs">Report Ready</button>}
                                    {sample.status === 'report-ready' && <button onClick={() => updateStatus(sample._id, 'delivered')} className="btn-success text-xs">Deliver</button>}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 mt-3">
                                {statusSteps.map((step, i) => (
                                    <div key={step} className="flex items-center flex-1">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i <= currentStep ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-dark-700 text-gray-400'}`}>{i + 1}</div>
                                        {i < statusSteps.length - 1 && <div className={`flex-1 h-1 mx-1 rounded ${i < currentStep ? 'bg-primary-500' : 'bg-gray-200 dark:bg-dark-700'}`}></div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
                {samples.length === 0 && <div className="card text-center text-gray-400 py-8">No samples found. Click &quot;+ Order Lab Test&quot; to create one.</div>}
            </div>

            <Modal open={showForm} onClose={() => setShowForm(false)} title="Order Lab Test">
                <div className="space-y-4">
                    <PatientLookup value={form.patient} onChange={(id) => setForm({ ...form, patient: id })} />
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Test Type *</label>
                        <select className="input-field" value={form.testType} onChange={(e) => setForm({ ...form, testType: e.target.value })}>
                            <option value="">Select Test</option>
                            {['Complete Blood Count (CBC)', 'Blood Sugar (Fasting)', 'Lipid Profile', 'Liver Function Test', 'Kidney Function Test', 'Thyroid Profile', 'Urinalysis', 'HbA1c', 'COVID-19 RT-PCR', 'Chest X-Ray'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Category</label>
                            <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                <option value="blood">Blood</option><option value="urine">Urine</option><option value="stool">Stool</option><option value="tissue">Tissue</option><option value="swab">Swab</option><option value="other">Other</option>
                            </select>
                        </div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Priority</label>
                            <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                                <option value="routine">Routine</option><option value="urgent">Urgent</option><option value="stat">STAT</option>
                            </select>
                        </div>
                    </div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Notes</label><textarea className="input-field" rows={2} placeholder="Special instructions..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                    <div className="flex gap-2 pt-2"><button onClick={orderSample} className="btn-primary flex-1">Order Test</button><button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>
        </div>
    );
}
