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

export default function LaundryPage() {
    const [linen, setLinen] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [tab, setTab] = useState('linen');
    const [showTask, setShowTask] = useState(false);
    const [showAddLinen, setShowAddLinen] = useState(false);
    const [taskForm, setTaskForm] = useState({ area: '', type: 'routine', priority: 'medium', notes: '' });
    const [addLinenForm, setAddLinenForm] = useState({ type: 'bedsheet', ward: 'General', status: 'clean' });
    const [msg, setMsg] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        // Backend routes: GET /laundry/linen, GET /laundry/tasks
        const [l, t] = await Promise.allSettled([api.get('/laundry/linen'), api.get('/laundry/tasks')]);
        if (l.status === 'fulfilled' && l.value.success) setLinen(l.value.data);
        if (t.status === 'fulfilled' && t.value.success) setTasks(t.value.data);
    };

    // Backend Linen model uses statuses: clean, soiled, washing, damaged, disposed
    // PATCH /laundry/linen/:id with { status }
    const updateLinenStatus = async (id, status) => {
        const r = await api.patch(`/laundry/linen/${id}`, { status });
        if (r.success) { setMsg(`Linen status → ${status}`); loadData(); }
        else setMsg(r.message || 'Update failed');
        setTimeout(() => setMsg(''), 3000);
    };

    // POST /laundry/tasks
    const createTask = async () => {
        if (!taskForm.area) { setMsg('Area is required'); setTimeout(() => setMsg(''), 3000); return; }
        const r = await api.post('/laundry/tasks', taskForm);
        if (r.success) { setMsg('Sanitation task created!'); setShowTask(false); setTaskForm({ area: '', type: 'routine', priority: 'medium', notes: '' }); loadData(); }
        else setMsg(r.message || 'Failed');
        setTimeout(() => setMsg(''), 4000);
    };

    // PATCH /laundry/tasks/:id with { status }
    const updateTask = async (id, status) => {
        const r = await api.patch(`/laundry/tasks/${id}`, { status });
        if (r.success) { setMsg(`Task ${status}!`); loadData(); }
        else setMsg(r.message || 'Update failed');
        setTimeout(() => setMsg(''), 3000);
    };

    const statusColors = { clean: 'badge-green', soiled: 'badge-red', washing: 'badge-yellow', 'in-use': 'badge-blue', damaged: 'badge-red', disposed: 'badge-red' };

    const addLinen = async () => {
        const r = await api.post('/laundry/linen', addLinenForm);
        if (r.success) { setMsg('Linen item added!'); setShowAddLinen(false); setAddLinenForm({ type: 'bedsheet', ward: 'General', status: 'clean' }); loadData(); }
        else setMsg(r.message || 'Failed');
        setTimeout(() => setMsg(''), 4000);
    };

    const linenTypes = ['bedsheet', 'pillow-cover', 'blanket', 'towel', 'gown'];
    const wards = ['ICU', 'General', 'Pediatric', 'Maternity', 'Surgical', 'Emergency', 'Private'];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">🧺 Laundry & Sanitation</h1><p className="text-sm text-gray-500">Linen management & sanitation tasks</p></div>
                <div className="flex gap-2">
                    <button onClick={() => setShowAddLinen(true)} className="btn-primary">+ Add Linen</button>
                    <button onClick={() => setShowTask(true)} className="btn-primary">+ Sanitation Task</button>
                </div>
            </div>

            {msg && <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium animate-fade-in">{msg}</div>}

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="card text-center"><p className="text-xs text-gray-500">Total Linen</p><p className="text-2xl font-bold text-gray-800 dark:text-white">{linen.length}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">Clean</p><p className="text-2xl font-bold text-emerald-600">{linen.filter(l => l.status === 'clean').length}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">Washing</p><p className="text-2xl font-bold text-amber-600">{linen.filter(l => l.status === 'washing').length}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">Soiled</p><p className="text-2xl font-bold text-red-600">{linen.filter(l => l.status === 'soiled').length}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">Pending Tasks</p><p className="text-2xl font-bold text-purple-600">{tasks.filter(t => t.status !== 'completed' && t.status !== 'verified').length}</p></div>
            </div>

            <div className="flex gap-1 bg-gray-100 dark:bg-dark-800 rounded-lg p-1 w-fit">
                {['linen', 'tasks'].map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${tab === t ? 'bg-white dark:bg-dark-700 shadow text-primary-600' : 'text-gray-500'}`}>{t}</button>
                ))}
            </div>

            {tab === 'linen' && (
                <div className="card overflow-hidden p-0">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-dark-800"><tr>{['ID', 'Type', 'Ward', 'Status', 'Wash Count', 'Actions'].map((h) => <th key={h} className="table-header">{h}</th>)}</tr></thead>
                        <tbody>
                            {linen.map((item) => (
                                <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-dark-800/50">
                                    <td className="table-cell font-mono text-xs text-primary-600">{item.linenId}</td>
                                    <td className="table-cell capitalize">{item.type}</td>
                                    <td className="table-cell">{item.ward}</td>
                                    <td className="table-cell"><span className={statusColors[item.status] || 'badge-yellow'}>{item.status}</span></td>
                                    <td className="table-cell">{item.washCount || 0}</td>
                                    <td className="table-cell">
                                        <div className="flex gap-1">
                                            {item.status === 'clean' && <button onClick={() => updateLinenStatus(item._id, 'soiled')} className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium">Mark Soiled</button>}
                                            {item.status === 'soiled' && <button onClick={() => updateLinenStatus(item._id, 'washing')} className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 font-medium">Send to Wash</button>}
                                            {item.status === 'washing' && <button onClick={() => updateLinenStatus(item._id, 'clean')} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-medium">Mark Clean</button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {linen.length === 0 && <tr><td colSpan="6" className="table-cell text-center text-gray-400 py-8">No linen items. Linen is configured via seed data.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'tasks' && (
                <div className="space-y-3">
                    {tasks.map((t) => (
                        <div key={t._id} className="card flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-800 dark:text-white">{t.area}</p>
                                <p className="text-sm text-gray-500">{t.type} • {t.priority} priority</p>
                                {t.assignedTo && <p className="text-xs text-gray-400">Assigned: {t.assignedTo.name}</p>}
                            </div>
                            <div className="flex gap-2 items-center">
                                <span className={`badge ${t.status === 'completed' ? 'badge-green' : t.status === 'verified' ? 'badge-blue' : t.status === 'in-progress' ? 'badge-blue' : 'badge-yellow'}`}>{t.status}</span>
                                {t.status === 'pending' && <button onClick={() => updateTask(t._id, 'in-progress')} className="btn-primary text-xs">Start</button>}
                                {t.status === 'in-progress' && <button onClick={() => updateTask(t._id, 'completed')} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 font-medium">Complete</button>}
                                {t.status === 'completed' && <button onClick={() => updateTask(t._id, 'verified')} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium">Verify</button>}
                            </div>
                        </div>
                    ))}
                    {tasks.length === 0 && <div className="card text-center text-gray-400 py-8">No tasks. Click "+ Sanitation Task" to create one.</div>}
                </div>
            )}

            <Modal open={showTask} onClose={() => setShowTask(false)} title="Create Sanitation Task">
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Area *</label><input className="input-field" placeholder="e.g. ICU Ward 3, Operating Theatre 1..." value={taskForm.area} onChange={(e) => setTaskForm({ ...taskForm, area: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Type</label><select className="input-field" value={taskForm.type} onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })}><option value="routine">Routine</option><option value="deep-clean">Deep Clean</option><option value="emergency">Emergency</option><option value="terminal">Terminal</option></select></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Priority</label><select className="input-field" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
                    </div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Notes</label><textarea className="input-field" rows={2} value={taskForm.notes} onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })} /></div>
                    <div className="flex gap-2 pt-2"><button onClick={createTask} className="btn-primary flex-1">Create Task</button><button onClick={() => setShowTask(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>

            <Modal open={showAddLinen} onClose={() => setShowAddLinen(false)} title="Add Linen Item">
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Type</label>
                        <select className="input-field" value={addLinenForm.type} onChange={(e) => setAddLinenForm({ ...addLinenForm, type: e.target.value })}>
                            {linenTypes.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                        </select></div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Ward</label>
                        <select className="input-field" value={addLinenForm.ward} onChange={(e) => setAddLinenForm({ ...addLinenForm, ward: e.target.value })}>
                            {wards.map(w => <option key={w} value={w}>{w}</option>)}
                        </select></div>
                    <div className="flex gap-2 pt-2"><button onClick={addLinen} className="btn-primary flex-1">Add Linen</button><button onClick={() => setShowAddLinen(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>
        </div>
    );
}
