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

export default function BillingPage() {
    const [bills, setBills] = useState([]);
    const [stats, setStats] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ patient: '', items: [{ description: 'Consultation', unitPrice: 500, quantity: 1 }], discount: 0, notes: '' });
    const [patientIdInput, setPatientIdInput] = useState('');
    const [patientInfo, setPatientInfo] = useState(null);
    const [lookupError, setLookupError] = useState('');
    const [msg, setMsg] = useState('');

    useEffect(() => { loadData(); }, []);

    const lookupPatient = useCallback(async (pid) => {
        if (!pid || pid.length < 3) { setPatientInfo(null); setLookupError(''); return; }
        setLookupError('');
        try {
            const r = await api.get(`/opd/patients/lookup/${encodeURIComponent(pid)}`);
            if (r.success && r.data) { setPatientInfo(r.data); setForm(prev => ({ ...prev, patient: r.data._id })); setLookupError(''); }
            else { setPatientInfo(null); setForm(prev => ({ ...prev, patient: '' })); setLookupError('Patient not found'); }
        } catch { setPatientInfo(null); setLookupError('Lookup failed'); }
    }, []);

    const loadData = async () => {
        const [b, s] = await Promise.allSettled([api.get('/billing/bills'), api.get('/billing/dashboard')]);
        if (b.status === 'fulfilled' && b.value.success) setBills(b.value.data);
        if (s.status === 'fulfilled' && s.value.success) setStats(s.value.data);
    };

    const addItem = () => setForm({ ...form, items: [...form.items, { description: '', unitPrice: 0, quantity: 1 }] });
    const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
    const updateItem = (i, field, value) => { const items = [...form.items]; items[i][field] = value; setForm({ ...form, items }); };
    const total = form.items.reduce((sum, it) => sum + (it.unitPrice * it.quantity), 0) - form.discount;

    const createBill = async () => {
        const items = form.items.map(it => ({ ...it, total: it.unitPrice * it.quantity }));
        const r = await api.post('/billing/bills', { ...form, items, totalAmount: total });
        if (r.success) { setMsg(`Bill #${r.data.billNumber} created! Total: ₹${total}`); setShowForm(false); setForm({ patient: '', items: [{ description: 'Consultation', unitPrice: 500, quantity: 1 }], discount: 0, notes: '' }); loadData(); }
        else setMsg(r.message || 'Failed');
        setTimeout(() => setMsg(''), 4000);
    };

    const payBill = async (id, amount) => {
        const r = await api.post(`/billing/bills/${id}/pay`, { amount, paymentMethod: 'cash' });
        if (r.success) { setMsg('Payment recorded!'); loadData(); }
        setTimeout(() => setMsg(''), 3000);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">💰 Billing & Insurance</h1><p className="text-sm text-gray-500">Generate bills, record payments, manage claims</p></div>
                <button onClick={() => setShowForm(true)} className="btn-primary">+ Generate Bill</button>
            </div>

            {msg && <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium animate-fade-in">{msg}</div>}

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card text-center"><p className="text-xs text-gray-500">Monthly Revenue</p><p className="text-2xl font-bold text-emerald-600">₹{((stats.monthlyRevenue || 0) / 1000).toFixed(0)}K</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-500">Paid</p><p className="text-2xl font-bold text-green-600">{stats.paid || 0}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-500">Pending</p><p className="text-2xl font-bold text-amber-600">{stats.pending || 0}</p></div>
                    <div className="card text-center"><p className="text-xs text-gray-500">Claims</p><p className="text-2xl font-bold text-blue-600">{stats.pendingClaims || 0}</p></div>
                </div>
            )}

            <div className="card overflow-hidden p-0">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-dark-800"><tr>{['Bill #', 'Patient', 'Items', 'Total', 'Paid', 'Status', 'Date', 'Actions'].map((h) => <th key={h} className="table-header">{h}</th>)}</tr></thead>
                    <tbody>
                        {bills.map((b) => (
                            <tr key={b._id} className="hover:bg-gray-50 dark:hover:bg-dark-800/50">
                                <td className="table-cell font-mono font-medium text-primary-600">{b.billNumber}</td>
                                <td className="table-cell">{b.patient?.name || 'N/A'}</td>
                                <td className="table-cell text-xs">{b.items?.length || 0} items</td>
                                <td className="table-cell font-semibold">₹{b.totalAmount?.toLocaleString()}</td>
                                <td className="table-cell">₹{(b.paidAmount || 0).toLocaleString()}</td>
                                <td className="table-cell"><span className={`badge ${b.status === 'paid' ? 'badge-green' : b.status === 'overdue' ? 'badge-red' : 'badge-yellow'}`}>{b.status}</span></td>
                                <td className="table-cell text-xs">{new Date(b.createdAt).toLocaleDateString()}</td>
                                <td className="table-cell">
                                    {b.status !== 'paid' && (
                                        <div className="flex gap-1">
                                            <button onClick={() => payBill(b._id, b.totalAmount - (b.paidAmount || 0))} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 font-medium">Pay Full</button>
                                            <button onClick={() => { const amt = prompt('Enter partial amount:'); if (amt) payBill(b._id, parseFloat(amt)); }} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium">Partial</button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {bills.length === 0 && <tr><td colSpan="8" className="table-cell text-center text-gray-400 py-8">No bills yet. Click "+ Generate Bill" to create one.</td></tr>}
                    </tbody>
                </table>
            </div>

            <Modal open={showForm} onClose={() => setShowForm(false)} title="Generate Bill">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Patient ID *</label>
                        <input className="input-field" placeholder="e.g. PAT-001" value={patientIdInput}
                            onChange={(e) => setPatientIdInput(e.target.value.toUpperCase())}
                            onBlur={() => lookupPatient(patientIdInput)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookupPatient(patientIdInput); } }} />
                        {patientInfo && <div className="mt-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm"><span className="font-medium text-green-700 dark:text-green-400">✓ {patientInfo.name}</span><span className="text-green-600 dark:text-green-500 ml-2">{patientInfo.patientId} • {patientInfo.phone}</span></div>}
                        {lookupError && <p className="text-xs text-red-500 mt-1">{lookupError}</p>}
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2"><label className="text-sm font-medium text-gray-600 dark:text-gray-400">Bill Items</label><button onClick={addItem} className="text-xs text-primary-600 hover:underline">+ Add Item</button></div>
                        {form.items.map((item, i) => (
                            <div key={i} className="flex gap-2 mb-2 items-center">
                                <input className="input-field flex-1" placeholder="Description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} />
                                <input type="number" className="input-field w-20" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} />
                                <input type="number" className="input-field w-24" placeholder="₹ Price" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} />
                                {form.items.length > 1 && <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">✕</button>}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Discount</label><input type="number" className="input-field" value={form.discount} onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} /></div>
                        <div className="flex items-end"><div className="w-full p-3 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-center"><p className="text-xs text-gray-500">Total</p><p className="text-xl font-bold text-primary-600">₹{total.toLocaleString()}</p></div></div>
                    </div>
                    <div className="flex gap-2 pt-2"><button onClick={createBill} className="btn-primary flex-1">Generate Bill</button><button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button></div>
                </div>
            </Modal>
        </div>
    );
}
