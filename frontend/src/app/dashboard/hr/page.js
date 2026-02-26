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

export default function HRPage() {
    const [staff, setStaff] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [tab, setTab] = useState('staff');
    const [msg, setMsg] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        // Backend GET /hr/staff returns Staff docs with populated user field
        // Backend GET /hr/attendance returns attendance records
        const [s, a] = await Promise.allSettled([api.get('/hr/staff'), api.get('/hr/attendance')]);
        if (s.status === 'fulfilled' && s.value.success) setStaff(s.value.data);
        if (a.status === 'fulfilled' && a.value.success) setAttendance(a.value.data);
    };

    // Backend uses POST /hr/attendance/checkin with { staffId }
    const markPresent = async (staffId) => {
        const r = await api.post('/hr/attendance/checkin', { staffId });
        if (r.success) { setMsg('Checked in!'); loadData(); }
        else setMsg(r.message || 'Already checked in');
        setTimeout(() => setMsg(''), 3000);
    };

    // Backend uses POST /hr/attendance/checkout with { staffId }
    const markCheckout = async (staffId) => {
        const r = await api.post('/hr/attendance/checkout', { staffId });
        if (r.success) { setMsg('Checked out!'); loadData(); }
        else setMsg(r.message || 'No check-in found');
        setTimeout(() => setMsg(''), 3000);
    };

    // Backend uses PUT /hr/staff/:id (not PATCH)
    const toggleActive = async (id, isActive) => {
        const r = await api.put(`/hr/staff/${id}`, { isActive: !isActive });
        if (r.success) { setMsg(`Staff ${!isActive ? 'activated' : 'deactivated'}`); loadData(); }
        setTimeout(() => setMsg(''), 3000);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">👥 HR Management</h1><p className="text-sm text-gray-500">Staff records, attendance & payroll</p></div>
            </div>

            {msg && <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium animate-fade-in">{msg}</div>}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card text-center"><p className="text-xs text-gray-500">Total Staff</p><p className="text-2xl font-bold text-gray-800 dark:text-white">{staff.length}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">Active</p><p className="text-2xl font-bold text-emerald-600">{staff.filter(s => s.isActive).length}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">Departments</p><p className="text-2xl font-bold text-blue-600">{[...new Set(staff.map(s => s.department))].filter(Boolean).length}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">Today's Attendance</p><p className="text-2xl font-bold text-purple-600">{attendance.filter(a => new Date(a.date).toDateString() === new Date().toDateString()).length}</p></div>
            </div>

            <div className="flex gap-1 bg-gray-100 dark:bg-dark-800 rounded-lg p-1 w-fit">
                {['staff', 'attendance'].map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${tab === t ? 'bg-white dark:bg-dark-700 shadow text-primary-600' : 'text-gray-500'}`}>{t}</button>
                ))}
            </div>

            {tab === 'staff' && (
                <div className="card overflow-hidden p-0">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-dark-800"><tr>{['Employee ID', 'Name', 'Department', 'Designation', 'Role', 'Status', 'Actions'].map((h) => <th key={h} className="table-header">{h}</th>)}</tr></thead>
                        <tbody>
                            {staff.map((s) => (
                                <tr key={s._id} className="hover:bg-gray-50 dark:hover:bg-dark-800/50">
                                    <td className="table-cell font-mono text-primary-600">{s.employeeId}</td>
                                    <td className="table-cell font-medium">{s.user?.name || 'N/A'}</td>
                                    <td className="table-cell">{s.department}</td>
                                    <td className="table-cell">{s.designation}</td>
                                    <td className="table-cell capitalize">{s.user?.role || 'N/A'}</td>
                                    <td className="table-cell">{s.isActive ? <span className="badge-green">Active</span> : <span className="badge-red">Inactive</span>}</td>
                                    <td className="table-cell">
                                        <div className="flex gap-1">
                                            <button onClick={() => markPresent(s._id)} className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 font-medium">Check In</button>
                                            <button onClick={() => markCheckout(s._id)} className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">Check Out</button>
                                            <button onClick={() => toggleActive(s._id, s.isActive)} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 font-medium">{s.isActive ? 'Deactivate' : 'Activate'}</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {staff.length === 0 && <tr><td colSpan="7" className="table-cell text-center text-gray-400 py-8">No staff records. Staff is created via admin seed data.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'attendance' && (
                <div className="card overflow-hidden p-0">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-dark-800"><tr>{['Staff', 'Date', 'Status', 'Check In', 'Check Out', 'Work Hours'].map((h) => <th key={h} className="table-header">{h}</th>)}</tr></thead>
                        <tbody>
                            {attendance.map((a) => (
                                <tr key={a._id} className="hover:bg-gray-50 dark:hover:bg-dark-800/50">
                                    <td className="table-cell font-medium">{a.user?.name || a.staff?.employeeId || 'N/A'}</td>
                                    <td className="table-cell">{new Date(a.date).toLocaleDateString()}</td>
                                    <td className="table-cell"><span className={`badge ${a.status === 'present' ? 'badge-green' : a.status === 'absent' ? 'badge-red' : 'badge-yellow'}`}>{a.status}</span></td>
                                    <td className="table-cell text-xs">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : '—'}</td>
                                    <td className="table-cell text-xs">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : '—'}</td>
                                    <td className="table-cell">{a.workHours ? `${a.workHours}h` : '—'}</td>
                                </tr>
                            ))}
                            {attendance.length === 0 && <tr><td colSpan="6" className="table-cell text-center text-gray-400 py-8">No attendance records. Use Check In/Out from Staff tab.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
