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

export default function AmbulancePage() {
    const [ambulances, setAmbulances] = useState([]);
    const [dispatches, setDispatches] = useState([]);
    const [stats, setStats] = useState(null);
    const [showDispatch, setShowDispatch] = useState(false);
    const [showAddAmb, setShowAddAmb] = useState(false);
    const [dispatchForm, setDispatchForm] = useState({ ambulance: '', callerName: '', callerPhone: '', pickupLocation: { address: '' }, dropLocation: { address: '' }, priority: 'urgent', notes: '' });
    const [addAmbForm, setAddAmbForm] = useState({ vehicleNumber: '', type: 'basic', equipment: '' });
    const [msg, setMsg] = useState('');

    useEffect(() => { loadData(); const i = setInterval(loadData, 15000); return () => clearInterval(i); }, []);

    const loadData = async () => {
        const [a, d, s] = await Promise.allSettled([api.get('/ambulance'), api.get('/ambulance/dispatches'), api.get('/ambulance/dashboard')]);
        if (a.status === 'fulfilled' && a.value.success) setAmbulances(a.value.data);
        if (d.status === 'fulfilled' && d.value.success) setDispatches(d.value.data);
        if (s.status === 'fulfilled' && s.value.success) setStats(s.value.data);
    };

    const createDispatch = async () => {
        if (!dispatchForm.ambulance || !dispatchForm.callerPhone || !dispatchForm.pickupLocation.address) { setMsg('Select ambulance, enter caller phone and pickup address'); setTimeout(() => setMsg(''), 3000); return; }
        // Backend requires 'driver' field — use the ambulance's currentDriver if assigned
        const selectedAmb = ambulances.find(a => a._id === dispatchForm.ambulance);
        const driverId = selectedAmb?.currentDriver?._id || selectedAmb?.currentDriver;
        if (!driverId) { setMsg('Selected ambulance has no driver assigned. Cannot dispatch.'); setTimeout(() => setMsg(''), 3000); return; }
        const payload = { ...dispatchForm, driver: driverId };
        const r = await api.post('/ambulance/dispatch', payload);
        if (r.success) { setMsg('Ambulance dispatched!'); setShowDispatch(false); setDispatchForm({ ambulance: '', callerName: '', callerPhone: '', pickupLocation: { address: '' }, dropLocation: { address: '' }, priority: 'urgent', notes: '' }); loadData(); }
        else setMsg(r.message || 'Dispatch failed');
        setTimeout(() => setMsg(''), 4000);
    };

    const updateAmbulance = async (id, status) => {
        const r = await api.put(`/ambulance/${id}`, { status });
        if (r.success) { setMsg(`Ambulance status → ${status}`); loadData(); }
        setTimeout(() => setMsg(''), 3000);
    };

    const statusColors = { available: 'bg-emerald-500', dispatched: 'bg-amber-500', 'en-route': 'bg-blue-500', 'at-scene': 'bg-purple-500', returning: 'bg-cyan-500', maintenance: 'bg-red-500' };

    const addAmbulance = async () => {
        if (!addAmbForm.vehicleNumber) { setMsg('Vehicle number is required'); setTimeout(() => setMsg(''), 3000); return; }
        const payload = { ...addAmbForm, equipment: addAmbForm.equipment ? addAmbForm.equipment.split(',').map(e => e.trim()).filter(Boolean) : [] };
        const r = await api.post('/ambulance', payload);
        if (r.success) { setMsg(`Ambulance ${addAmbForm.vehicleNumber} added!`); setShowAddAmb(false); setAddAmbForm({ vehicleNumber: '', type: 'basic', equipment: '' }); loadData(); }
        else setMsg(r.message || 'Failed');
        setTimeout(() => setMsg(''), 4000);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">🚒 Ambulance Fleet</h1><p className="text-sm text-gray-500">Fleet management & emergency dispatch</p></div>
                <div className="flex gap-2">
                    <button onClick={() => setShowAddAmb(true)} className="btn-primary">+ Add Ambulance</button>
                    <button onClick={() => setShowDispatch(true)} className="btn-danger">🚨 Dispatch Ambulance</button>
                </div>
            </div>

            {msg && <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium animate-fade-in">{msg}</div>}

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card text-center"><p className="text-xs text-gray-500">Total Fleet</p><p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total || ambulances.length}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-500">Available</p><p className="text-2xl font-bold text-emerald-600">{stats.available || 0}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-500">Dispatched</p><p className="text-2xl font-bold text-amber-600">{stats.dispatched || 0}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-500">Active Dispatches</p><p className="text-2xl font-bold text-blue-600">{stats.activeDispatches || dispatches.length}</p></div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ambulances.map((a) => (
                    <div key={a._id} className="card-hover">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-lg text-gray-800 dark:text-white">{a.vehicleNumber}</span>
                            <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${statusColors[a.status] || 'bg-gray-400'}`}></div><span className="text-sm capitalize text-gray-600 dark:text-gray-400">{a.status}</span></div>
                        </div>
                        <p className="text-sm text-gray-500 capitalize">Type: {a.type}</p>
                        {a.currentDriver && <p className="text-sm text-gray-500">Driver: {a.currentDriver.name || 'Assigned'}</p>}
                        <div className="mt-2 flex flex-wrap gap-1">{a.equipment?.map((e) => <span key={e} className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-dark-700 text-gray-500">{e}</span>)}</div>
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-dark-700">
                            {a.status === 'available' && <button onClick={() => { setDispatchForm({ ...dispatchForm, ambulance: a._id }); setShowDispatch(true); }} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium flex-1">Dispatch</button>}
                            {a.status === 'dispatched' && <button onClick={() => updateAmbulance(a._id, 'en-route')} className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium flex-1">En Route</button>}
                            {(a.status === 'en-route' || a.status === 'at-scene') && <button onClick={() => updateAmbulance(a._id, 'returning')} className="text-xs px-3 py-1.5 rounded-lg bg-cyan-100 text-cyan-700 hover:bg-cyan-200 font-medium flex-1">Returning</button>}
                            {a.status === 'returning' && <button onClick={() => updateAmbulance(a._id, 'available')} className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium flex-1">Mark Available</button>}
                        </div>
                    </div>
                ))}
                {ambulances.length === 0 && <div className="card text-center text-gray-400 py-8 col-span-3">No ambulances configured yet.</div>}
            </div>

            <Modal open={showDispatch} onClose={() => setShowDispatch(false)} title="🚨 Dispatch Ambulance">
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Select Ambulance *</label>
                        <select className="input-field" value={dispatchForm.ambulance} onChange={(e) => setDispatchForm({ ...dispatchForm, ambulance: e.target.value })}>
                            <option value="">-- Select Available Ambulance --</option>
                            {ambulances.filter(a => a.status === 'available').map(a => <option key={a._id} value={a._id}>{a.vehicleNumber} ({a.type}) {a.currentDriver ? '✓ Driver' : '✗ No Driver'}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Caller Name</label><input className="input-field" placeholder="Name" value={dispatchForm.callerName} onChange={(e) => setDispatchForm({ ...dispatchForm, callerName: e.target.value })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Caller Phone *</label><input className="input-field" placeholder="Phone number" value={dispatchForm.callerPhone} onChange={(e) => setDispatchForm({ ...dispatchForm, callerPhone: e.target.value })} /></div>
                    </div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Pickup Address *</label><input className="input-field" placeholder="Full pickup address" value={dispatchForm.pickupLocation.address} onChange={(e) => setDispatchForm({ ...dispatchForm, pickupLocation: { ...dispatchForm.pickupLocation, address: e.target.value } })} /></div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Drop Address</label><input className="input-field" placeholder="Hospital or destination" value={dispatchForm.dropLocation.address} onChange={(e) => setDispatchForm({ ...dispatchForm, dropLocation: { ...dispatchForm.dropLocation, address: e.target.value } })} /></div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Priority</label>
                        <select className="input-field" value={dispatchForm.priority} onChange={(e) => setDispatchForm({ ...dispatchForm, priority: e.target.value })}>
                            <option value="normal">Normal</option><option value="urgent">Urgent</option><option value="critical">Critical</option>
                        </select>
                    </div>
                    <div className="flex gap-2 pt-2"><button onClick={createDispatch} className="btn-danger flex-1">🚨 Dispatch Now</button><button onClick={() => setShowDispatch(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>

            <Modal open={showAddAmb} onClose={() => setShowAddAmb(false)} title="Add Ambulance">
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Vehicle Number *</label>
                        <input className="input-field" placeholder="e.g. DL-01-AM-1234" value={addAmbForm.vehicleNumber} onChange={(e) => setAddAmbForm({ ...addAmbForm, vehicleNumber: e.target.value.toUpperCase() })} /></div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Type</label>
                        <select className="input-field" value={addAmbForm.type} onChange={(e) => setAddAmbForm({ ...addAmbForm, type: e.target.value })}>
                            <option value="basic">Basic</option><option value="advanced">Advanced</option><option value="cardiac">Cardiac</option><option value="neonatal">Neonatal</option>
                        </select></div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Equipment (comma-separated)</label>
                        <input className="input-field" placeholder="e.g. Ventilator, Defibrillator, Oxygen" value={addAmbForm.equipment} onChange={(e) => setAddAmbForm({ ...addAmbForm, equipment: e.target.value })} /></div>
                    <div className="flex gap-2 pt-2"><button onClick={addAmbulance} className="btn-primary flex-1">Add Ambulance</button><button onClick={() => setShowAddAmb(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>
        </div>
    );
}
