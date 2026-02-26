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

export default function PharmacyPage() {
    const [medicines, setMedicines] = useState([]);
    const [stats, setStats] = useState(null);
    const [showAddMed, setShowAddMed] = useState(false);
    const [medForm, setMedForm] = useState({ name: '', genericName: '', category: 'tablet', manufacturer: '', quantity: 0, minStockLevel: 10, unitPrice: 0, sellingPrice: 0, expiryDate: '' });
    const [msg, setMsg] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        // Backend uses $text search which requires a text index; load all medicines without search for now
        const [m, s] = await Promise.allSettled([api.get('/pharmacy/medicines'), api.get('/pharmacy/dashboard')]);
        if (m.status === 'fulfilled' && m.value.success) setMedicines(m.value.data);
        if (s.status === 'fulfilled' && s.value.success) setStats(s.value.data);
    };

    const addMedicine = async () => {
        if (!medForm.name) { setMsg('Medicine name required'); setTimeout(() => setMsg(''), 3000); return; }
        const r = await api.post('/pharmacy/medicines', medForm);
        if (r.success) { setMsg(`${medForm.name} added to inventory!`); setShowAddMed(false); setMedForm({ name: '', genericName: '', category: 'tablet', manufacturer: '', quantity: 0, minStockLevel: 10, unitPrice: 0, sellingPrice: 0, expiryDate: '' }); loadData(); }
        else setMsg(r.message || 'Failed');
        setTimeout(() => setMsg(''), 4000);
    };

    const restockMed = async (id, name) => {
        const qty = prompt(`Restock ${name} — enter quantity to add:`);
        if (qty && !isNaN(qty)) {
            // Backend uses PATCH /pharmacy/medicines/:id/restock with body { quantity }
            const r = await api.patch(`/pharmacy/medicines/${id}/restock`, { quantity: parseInt(qty) });
            if (r.success) { setMsg(`${name} restocked with ${qty} units`); loadData(); }
            else setMsg(r.message || 'Restock failed');
            setTimeout(() => setMsg(''), 3000);
        }
    };

    // Client-side search filter
    const [search, setSearch] = useState('');
    const filtered = medicines.filter(m => !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.genericName?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">💊 Pharmacy</h1><p className="text-sm text-gray-500">Medicine inventory & prescriptions</p></div>
                <button onClick={() => setShowAddMed(true)} className="btn-primary">+ Add Medicine</button>
            </div>

            {msg && <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium animate-fade-in">{msg}</div>}

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[{ l: 'Total Medicines', v: stats.totalMedicines || 0 }, { l: 'Low Stock', v: stats.lowStock || 0, d: stats.lowStock > 0 }, { l: 'Expiring Soon', v: stats.expiringSoon || 0, d: stats.expiringSoon > 0 }, { l: 'Pending Rx', v: stats.pendingPrescriptions || 0 }, { l: 'Suppliers', v: stats.totalSuppliers || 0 }]
                        .map((s) => <div key={s.l} className={`card text-center ${s.d ? 'border-red-300 dark:border-red-700' : ''}`}><p className="text-xs text-gray-500">{s.l}</p><p className={`text-2xl font-bold ${s.d ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>{s.v}</p></div>)}
                </div>
            )}

            <input className="input-field max-w-md" placeholder="🔍 Search medicines..." value={search} onChange={(e) => setSearch(e.target.value)} />

            <div className="card overflow-hidden p-0">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-dark-800"><tr>{['Medicine', 'Category', 'Stock', 'Min Level', 'Sell Price', 'Expiry', 'Status', 'Action'].map((h) => <th key={h} className="table-header">{h}</th>)}</tr></thead>
                    <tbody>
                        {filtered.map((m) => {
                            const isLow = m.quantity <= m.minStockLevel;
                            const isExpiring = m.expiryDate && new Date(m.expiryDate) < new Date(Date.now() + 90 * 86400000);
                            return (
                                <tr key={m._id} className={`hover:bg-gray-50 dark:hover:bg-dark-800/50 ${isLow ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                                    <td className="table-cell"><div><p className="font-medium">{m.name}</p><p className="text-xs text-gray-400">{m.genericName} • {m.manufacturer}</p></div></td>
                                    <td className="table-cell capitalize">{m.category}</td>
                                    <td className="table-cell"><span className={`font-bold ${isLow ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>{m.quantity}</span></td>
                                    <td className="table-cell">{m.minStockLevel}</td>
                                    <td className="table-cell">₹{m.sellingPrice}</td>
                                    <td className="table-cell"><span className={isExpiring ? 'text-red-500 font-medium' : ''}>{m.expiryDate ? new Date(m.expiryDate).toLocaleDateString() : '—'}</span></td>
                                    <td className="table-cell">{isLow ? <span className="badge-red">Low Stock</span> : isExpiring ? <span className="badge-yellow">Expiring</span> : <span className="badge-green">OK</span>}</td>
                                    <td className="table-cell"><button onClick={() => restockMed(m._id, m.name)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium">Restock</button></td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && <tr><td colSpan="8" className="table-cell text-center text-gray-400 py-8">No medicines found. Click "+ Add Medicine" to add one.</td></tr>}
                    </tbody>
                </table>
            </div>

            <Modal open={showAddMed} onClose={() => setShowAddMed(false)} title="Add Medicine">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Name *</label><input className="input-field" value={medForm.name} onChange={(e) => setMedForm({ ...medForm, name: e.target.value })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Generic Name</label><input className="input-field" value={medForm.genericName} onChange={(e) => setMedForm({ ...medForm, genericName: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Category</label><select className="input-field" value={medForm.category} onChange={(e) => setMedForm({ ...medForm, category: e.target.value })}><option value="tablet">Tablet</option><option value="capsule">Capsule</option><option value="syrup">Syrup</option><option value="injection">Injection</option><option value="ointment">Ointment</option><option value="drops">Drops</option></select></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Manufacturer</label><input className="input-field" value={medForm.manufacturer} onChange={(e) => setMedForm({ ...medForm, manufacturer: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Quantity</label><input type="number" className="input-field" value={medForm.quantity} onChange={(e) => setMedForm({ ...medForm, quantity: parseInt(e.target.value) || 0 })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Unit Price</label><input type="number" className="input-field" value={medForm.unitPrice} onChange={(e) => setMedForm({ ...medForm, unitPrice: parseFloat(e.target.value) || 0 })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Sell Price</label><input type="number" className="input-field" value={medForm.sellingPrice} onChange={(e) => setMedForm({ ...medForm, sellingPrice: parseFloat(e.target.value) || 0 })} /></div>
                    </div>
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Expiry Date</label><input type="date" className="input-field" value={medForm.expiryDate} onChange={(e) => setMedForm({ ...medForm, expiryDate: e.target.value })} /></div>
                    <div className="flex gap-2 pt-2"><button onClick={addMedicine} className="btn-primary flex-1">Add Medicine</button><button onClick={() => setShowAddMed(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>
        </div>
    );
}
