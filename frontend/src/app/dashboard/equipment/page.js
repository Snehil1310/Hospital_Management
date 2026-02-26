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

export default function EquipmentPage() {
    const [equipment, setEquipment] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [stats, setStats] = useState(null);
    const [tab, setTab] = useState('equipment');
    const [showAddEquip, setShowAddEquip] = useState(false);
    const [showAddTicket, setShowAddTicket] = useState(false);
    const [equipForm, setEquipForm] = useState({ name: '', category: 'diagnostic', manufacturer: '', serialNumber: '', status: 'operational', location: { department: '', room: '', floor: 1 }, maintenanceCycle: 90 });
    const [ticketForm, setTicketForm] = useState({ equipment: '', description: '', priority: 'medium', type: 'corrective', faultType: 'mechanical' });
    const [msg, setMsg] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const [e, t, d] = await Promise.allSettled([api.get('/equipment'), api.get('/equipment/tickets'), api.get('/equipment/dashboard')]);
        if (e.status === 'fulfilled' && e.value.success) setEquipment(e.value.data);
        if (t.status === 'fulfilled' && t.value.success) setTickets(t.value.data);
        if (d.status === 'fulfilled' && d.value.success) setStats(d.value.data);
    };

    const addEquipment = async () => {
        const id = `EQ-${Date.now().toString(36).toUpperCase()}`;
        const r = await api.post('/equipment', { ...equipForm, equipmentId: id });
        if (r.success) { setMsg('Equipment added!'); loadData(); setShowAddEquip(false); setEquipForm({ name: '', category: 'diagnostic', manufacturer: '', serialNumber: '', status: 'operational', location: { department: '', room: '', floor: 1 }, maintenanceCycle: 90 }); }
        else setMsg(r.message || 'Failed to add equipment');
        setTimeout(() => setMsg(''), 3000);
    };

    const addTicket = async () => {
        if (!ticketForm.equipment || !ticketForm.description) { setMsg('Select equipment and enter description'); setTimeout(() => setMsg(''), 3000); return; }
        const r = await api.post('/equipment/tickets', ticketForm);
        if (r.success) { setMsg('Maintenance ticket created!'); loadData(); setShowAddTicket(false); setTicketForm({ equipment: '', description: '', priority: 'medium', type: 'corrective', faultType: 'mechanical' }); }
        else setMsg(r.message || 'Failed to create ticket');
        setTimeout(() => setMsg(''), 3000);
    };

    const updateTicketStatus = async (id, status) => {
        const r = await api.patch(`/equipment/tickets/${id}`, { status });
        if (r.success) { setMsg(`Ticket ${status}!`); loadData(); }
        setTimeout(() => setMsg(''), 3000);
    };

    const updateEquipStatus = async (id, status) => {
        const r = await api.put(`/equipment/${id}`, { status });
        if (r.success) { setMsg(`Equipment marked as ${status}`); loadData(); }
        setTimeout(() => setMsg(''), 3000);
    };

    const statusColors = { operational: 'badge-green', maintenance: 'badge-yellow', faulty: 'badge-red', decommissioned: 'badge-purple' };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">🔧 Equipment Management</h1><p className="text-sm text-gray-500">Biomedical equipment registry & maintenance</p></div>
                <div className="flex gap-2">
                    <button onClick={() => setShowAddEquip(true)} className="btn-primary">+ Add Equipment</button>
                    <button onClick={() => { setTab('tickets'); setShowAddTicket(true); }} className="btn-danger">+ Report Fault</button>
                </div>
            </div>

            {msg && <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium animate-fade-in">{msg}</div>}

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="card text-center"><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-500">Operational</p><p className="text-2xl font-bold text-emerald-600">{stats.operational}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-500">In Maintenance</p><p className="text-2xl font-bold text-amber-600">{stats.maintenance}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-500">Faulty</p><p className="text-2xl font-bold text-red-500">{stats.faulty}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-500">Open Tickets</p><p className="text-2xl font-bold text-blue-600">{stats.openTickets}</p></div>
                </div>
            )}

            <div className="flex gap-1 bg-gray-100 dark:bg-dark-800 rounded-lg p-1 w-fit">
                {['equipment', 'tickets'].map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === t ? 'bg-white dark:bg-dark-700 shadow text-primary-600' : 'text-gray-500'}`}>
                        {t === 'equipment' ? `Equipment (${equipment.length})` : `Tickets (${tickets.length})`}
                    </button>
                ))}
            </div>

            {tab === 'equipment' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {equipment.map((e) => (
                        <div key={e._id} className="card-hover">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-gray-800 dark:text-white">{e.name}</span>
                                <span className={statusColors[e.status]}>{e.status}</span>
                            </div>
                            <p className="text-sm text-gray-500">{e.manufacturer} • {e.category}</p>
                            <p className="text-xs text-gray-400 mt-1">ID: {e.equipmentId} • S/N: {e.serialNumber}</p>
                            <p className="text-xs text-gray-400">Location: {e.location?.department} — Room {e.location?.room}, Floor {e.location?.floor}</p>
                            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-dark-700">
                                {e.status === 'operational' && <button onClick={() => { setTicketForm({ ...ticketForm, equipment: e._id }); setShowAddTicket(true); }} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 font-medium">Report Fault</button>}
                                {e.status === 'faulty' && <button onClick={() => updateEquipStatus(e._id, 'maintenance')} className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium">Send to Maintenance</button>}
                                {e.status === 'maintenance' && <button onClick={() => updateEquipStatus(e._id, 'operational')} className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium">Mark Operational</button>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {tab === 'tickets' && (
                <div className="space-y-3">
                    {tickets.map((t) => (
                        <div key={t._id} className={`card flex items-center justify-between ${t.status === 'open' ? 'border-l-4 border-red-500' : t.status === 'in-progress' ? 'border-l-4 border-amber-500' : 'border-l-4 border-green-500'}`}>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-800 dark:text-white">{t.equipment?.name || 'Unknown Equipment'}</span>
                                    <span className={`badge ${t.status === 'open' ? 'badge-red' : t.status === 'in-progress' ? 'badge-yellow' : 'badge-green'}`}>{t.status}</span>
                                    <span className={`badge ${t.priority === 'critical' ? 'badge-red' : t.priority === 'high' ? 'badge-yellow' : 'badge-blue'}`}>{t.priority}</span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">{t.description}</p>
                                <p className="text-xs text-gray-400 mt-1">Reported: {new Date(t.createdAt).toLocaleString()} {t.reportedBy && `by ${t.reportedBy.name}`}</p>
                            </div>
                            <div className="flex gap-2">
                                {t.status === 'open' && <button onClick={() => updateTicketStatus(t._id, 'in-progress')} className="btn-primary text-xs">Start Work</button>}
                                {t.status === 'in-progress' && <button onClick={() => updateTicketStatus(t._id, 'resolved')} className="btn-success text-xs">Mark Resolved</button>}
                            </div>
                        </div>
                    ))}
                    {tickets.length === 0 && <div className="card text-center text-gray-400 py-8">No maintenance tickets yet. Click "Report Fault" to create one.</div>}
                </div>
            )}

            {/* Add Equipment Modal */}
            <Modal open={showAddEquip} onClose={() => setShowAddEquip(false)} title="Add New Equipment">
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Equipment Name *</label><input className="input-field" placeholder="e.g. MRI Scanner" value={equipForm.name} onChange={(e) => setEquipForm({ ...equipForm, name: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Category</label><select className="input-field" value={equipForm.category} onChange={(e) => setEquipForm({ ...equipForm, category: e.target.value })}><option value="diagnostic">Diagnostic</option><option value="therapeutic">Therapeutic</option><option value="monitoring">Monitoring</option><option value="imaging">Imaging</option><option value="lab">Lab</option><option value="surgical">Surgical</option></select></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Manufacturer *</label><input className="input-field" placeholder="e.g. Siemens" value={equipForm.manufacturer} onChange={(e) => setEquipForm({ ...equipForm, manufacturer: e.target.value })} /></div>
                    </div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Serial Number *</label><input className="input-field" placeholder="e.g. MRI-2024-001" value={equipForm.serialNumber} onChange={(e) => setEquipForm({ ...equipForm, serialNumber: e.target.value })} /></div>
                    <div className="grid grid-cols-3 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Department</label><input className="input-field" placeholder="ICU" value={equipForm.location.department} onChange={(e) => setEquipForm({ ...equipForm, location: { ...equipForm.location, department: e.target.value } })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Room</label><input className="input-field" placeholder="R-1" value={equipForm.location.room} onChange={(e) => setEquipForm({ ...equipForm, location: { ...equipForm.location, room: e.target.value } })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Floor</label><input type="number" className="input-field" value={equipForm.location.floor} onChange={(e) => setEquipForm({ ...equipForm, location: { ...equipForm.location, floor: parseInt(e.target.value) } })} /></div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={addEquipment} className="btn-primary flex-1">Add Equipment</button>
                        <button onClick={() => setShowAddEquip(false)} className="btn-secondary">Cancel</button>
                    </div>
                </div>
            </Modal>

            {/* Report Fault / Create Ticket Modal */}
            <Modal open={showAddTicket} onClose={() => setShowAddTicket(false)} title="Report Equipment Fault">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Select Equipment *</label>
                        <select className="input-field" value={ticketForm.equipment} onChange={(e) => setTicketForm({ ...ticketForm, equipment: e.target.value })}>
                            <option value="">-- Select Equipment --</option>
                            {equipment.filter(eq => eq.status !== 'decommissioned').map((eq) => <option key={eq._id} value={eq._id}>{eq.name} ({eq.equipmentId}) — {eq.location?.department}</option>)}
                        </select>
                    </div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Fault Description *</label><textarea className="input-field" rows={3} placeholder="Describe the issue in detail..." value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} /></div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Ticket Type *</label><select className="input-field" value={ticketForm.type} onChange={(e) => setTicketForm({ ...ticketForm, type: e.target.value })}><option value="corrective">Corrective</option><option value="preventive">Preventive</option><option value="emergency">Emergency</option><option value="calibration">Calibration</option></select></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Priority</label><select className="input-field" value={ticketForm.priority} onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Fault Type</label><select className="input-field" value={ticketForm.faultType} onChange={(e) => setTicketForm({ ...ticketForm, faultType: e.target.value })}><option value="mechanical">Mechanical</option><option value="electrical">Electrical</option><option value="software">Software</option><option value="calibration">Calibration</option><option value="other">Other</option></select></div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button onClick={addTicket} className="btn-danger flex-1">Submit Fault Report</button>
                        <button onClick={() => setShowAddTicket(false)} className="btn-secondary">Cancel</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
