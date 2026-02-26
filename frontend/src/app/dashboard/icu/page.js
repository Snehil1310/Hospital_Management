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

export default function ICUPage() {
    const [beds, setBeds] = useState([]);
    const [stats, setStats] = useState(null);
    const [ward, setWard] = useState('');
    const [showAssign, setShowAssign] = useState(false);
    const [showAddBed, setShowAddBed] = useState(false);
    const [selectedBed, setSelectedBed] = useState(null);
    const [patients, setPatients] = useState([]);
    const [assignForm, setAssignForm] = useState({ patient: '', severity: 'stable', diagnosis: '', admittingDoctor: '' });
    const [addBedForm, setAddBedForm] = useState({ bedNumber: '', ward: 'General', floor: 1, type: 'standard', dailyRate: 1500 });
    const [doctors, setDoctors] = useState([]);
    const [msg, setMsg] = useState('');

    useEffect(() => { loadData(); }, [ward]);

    const loadData = async () => {
        const [b, s, p, d] = await Promise.allSettled([
            api.get(`/icu/beds${ward ? `?ward=${ward}` : ''}`),
            api.get('/icu/dashboard'),
            api.get('/opd/patients?limit=100'),
            api.get('/opd/doctors')
        ]);
        if (b.status === 'fulfilled' && b.value.success) setBeds(b.value.data);
        if (s.status === 'fulfilled' && s.value.success) setStats(s.value.data);
        if (p.status === 'fulfilled' && p.value.success) setPatients(p.value.data);
        if (d.status === 'fulfilled' && d.value.success) setDoctors(d.value.data);
    };

    const assignBed = async () => {
        if (!assignForm.patient) { setMsg('Select a patient'); setTimeout(() => setMsg(''), 3000); return; }
        // Backend uses POST /icu/allocate with body: { bed, patient, severity }
        const r = await api.post('/icu/allocate', { bed: selectedBed._id, ...assignForm });
        if (r.success) { setMsg(`Bed ${selectedBed.bedNumber} assigned!`); setShowAssign(false); setSelectedBed(null); setAssignForm({ patient: '', severity: 'stable', diagnosis: '', admittingDoctor: '' }); loadData(); }
        else setMsg(r.message || 'Allocation failed');
        setTimeout(() => setMsg(''), 4000);
    };

    const dischargeBed = async (bedId) => {
        const r = await api.put(`/icu/beds/${bedId}`, { status: 'available', currentPatient: null });
        if (r.success) { setMsg('Patient discharged, bed available'); loadData(); }
        setTimeout(() => setMsg(''), 3000);
    };

    const addBed = async () => {
        if (!addBedForm.bedNumber) { setMsg('Bed number is required'); setTimeout(() => setMsg(''), 3000); return; }
        const r = await api.post('/icu/beds', addBedForm);
        if (r.success) { setMsg(`Bed ${addBedForm.bedNumber} added!`); setShowAddBed(false); setAddBedForm({ bedNumber: '', ward: 'General', floor: 1, type: 'standard', dailyRate: 1500 }); loadData(); }
        else setMsg(r.message || 'Failed to add bed');
        setTimeout(() => setMsg(''), 4000);
    };

    const wards = ['ICU', 'General', 'Pediatric', 'Maternity', 'Surgical', 'Emergency', 'Private'];
    const statusConfig = { available: { color: 'bg-emerald-500', ring: 'ring-emerald-200', text: 'text-emerald-700' }, occupied: { color: 'bg-red-500', ring: 'ring-red-200', text: 'text-red-700' }, reserved: { color: 'bg-amber-500', ring: 'ring-amber-200', text: 'text-amber-700' }, maintenance: { color: 'bg-gray-400', ring: 'ring-gray-200', text: 'text-gray-600' } };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">🛏️ ICU & Bed Management</h1><p className="text-sm text-gray-500">Real-time bed tracking & patient allocation</p></div>
                <button onClick={() => setShowAddBed(true)} className="btn-primary">+ Add Bed</button>
            </div>

            {msg && <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium animate-fade-in">{msg}</div>}

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card text-center"><p className="text-xs text-gray-500">Total Beds</p><p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalBeds || beds.length}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-500">Occupied</p><p className="text-2xl font-bold text-red-500">{stats.totalOccupied || beds.filter(b => b.status === 'occupied').length}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-500">Available</p><p className="text-2xl font-bold text-emerald-600">{stats.totalAvailable || beds.filter(b => b.status === 'available').length}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-500">Occupancy %</p><p className="text-2xl font-bold text-blue-600">{stats.overallOccupancy || Math.round(beds.filter(b => b.status === 'occupied').length / Math.max(beds.length, 1) * 100)}%</p></div>
                </div>
            )}

            <div className="flex gap-2 flex-wrap">
                <button onClick={() => setWard('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${!ward ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 dark:bg-dark-800 text-gray-600'}`}>All Wards</button>
                {wards.map((w) => (
                    <button key={w} onClick={() => setWard(w)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${ward === w ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 dark:bg-dark-800 text-gray-600'}`}>{w}</button>
                ))}
            </div>

            <div className="flex gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-500"></div>Available</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div>Occupied</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-500"></div>Reserved</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-400"></div>Maintenance</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {beds.map((bed) => {
                    const sc = statusConfig[bed.status] || statusConfig.available;
                    return (
                        <div key={bed._id} className={`card text-center cursor-pointer hover:shadow-md transition-all ring-2 ${sc.ring}`}
                            onClick={() => { if (bed.status === 'available') { setSelectedBed(bed); setShowAssign(true); } }}>
                            <div className={`w-4 h-4 rounded-full ${sc.color} mx-auto mb-1`}></div>
                            <p className="font-bold text-sm text-gray-800 dark:text-white">{bed.bedNumber}</p>
                            <p className="text-xs text-gray-400">{bed.ward}</p>
                            <p className={`text-xs font-medium mt-1 ${sc.text}`}>{bed.status}</p>
                            {bed.currentPatient && <p className="text-xs text-gray-500 mt-1">{bed.currentPatient.name}</p>}
                            {bed.status === 'occupied' && (
                                <button onClick={(e) => { e.stopPropagation(); dischargeBed(bed._id); }} className="mt-2 text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 font-medium w-full">Discharge</button>
                            )}
                            {bed.status === 'available' && (
                                <p className="text-xs text-primary-500 mt-1">Click to assign</p>
                            )}
                        </div>
                    );
                })}
            </div>

            <Modal open={showAssign} onClose={() => setShowAssign(false)} title={`Assign Bed ${selectedBed?.bedNumber}`}>
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">Ward: {selectedBed?.ward} • Floor {selectedBed?.floor} • Rate: ₹{selectedBed?.dailyRate}/day</p>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Patient *</label>
                        <select className="input-field" value={assignForm.patient} onChange={(e) => setAssignForm({ ...assignForm, patient: e.target.value })}>
                            <option value="">Select Patient</option>
                            {patients.map(p => <option key={p._id} value={p._id}>{p.name} ({p.patientId})</option>)}
                        </select>
                    </div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Severity *</label>
                        <select className="input-field" value={assignForm.severity} onChange={(e) => setAssignForm({ ...assignForm, severity: e.target.value })}>
                            <option value="critical">Critical</option><option value="serious">Serious</option><option value="stable">Stable</option><option value="recovering">Recovering</option>
                        </select>
                    </div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Admitting Doctor</label>
                        <select className="input-field" value={assignForm.admittingDoctor} onChange={(e) => setAssignForm({ ...assignForm, admittingDoctor: e.target.value })}>
                            <option value="">Select Doctor</option>
                            {doctors.map(d => <option key={d._id} value={d._id}>{d.name} — {d.specialization || d.department}</option>)}
                        </select>
                    </div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Diagnosis</label><textarea className="input-field" rows={2} placeholder="Primary diagnosis..." value={assignForm.diagnosis} onChange={(e) => setAssignForm({ ...assignForm, diagnosis: e.target.value })} /></div>
                    <div className="flex gap-2 pt-2"><button onClick={assignBed} className="btn-primary flex-1">Assign Bed</button><button onClick={() => setShowAssign(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>

            <Modal open={showAddBed} onClose={() => setShowAddBed(false)} title="Add New Bed">
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Bed Number *</label>
                        <input className="input-field" placeholder="e.g. G1-01" value={addBedForm.bedNumber} onChange={(e) => setAddBedForm({ ...addBedForm, bedNumber: e.target.value.toUpperCase() })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Ward *</label>
                            <select className="input-field" value={addBedForm.ward} onChange={(e) => setAddBedForm({ ...addBedForm, ward: e.target.value })}>
                                {wards.map(w => <option key={w} value={w}>{w}</option>)}
                            </select></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Floor *</label>
                            <input type="number" className="input-field" min={1} max={10} value={addBedForm.floor} onChange={(e) => setAddBedForm({ ...addBedForm, floor: parseInt(e.target.value) || 1 })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Type</label>
                            <select className="input-field" value={addBedForm.type} onChange={(e) => setAddBedForm({ ...addBedForm, type: e.target.value })}>
                                <option value="standard">Standard</option><option value="ICU">ICU</option><option value="electric">Electric</option><option value="pediatric">Pediatric</option>
                            </select></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Daily Rate (₹)</label>
                            <input type="number" className="input-field" value={addBedForm.dailyRate} onChange={(e) => setAddBedForm({ ...addBedForm, dailyRate: parseInt(e.target.value) || 0 })} /></div>
                    </div>
                    <div className="flex gap-2 pt-2"><button onClick={addBed} className="btn-primary flex-1">Add Bed</button><button onClick={() => setShowAddBed(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>
        </div>
    );
}
