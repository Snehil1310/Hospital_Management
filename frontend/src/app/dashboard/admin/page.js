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

const ROLES = [
    { value: 'admin', label: 'Admin', color: 'badge-purple' },
    { value: 'doctor', label: 'Doctor', color: 'badge-blue' },
    { value: 'nurse', label: 'Nurse', color: 'badge-pink' },
    { value: 'receptionist', label: 'Receptionist', color: 'badge-yellow' },
    { value: 'lab_technician', label: 'Lab Technician', color: 'badge-green' },
    { value: 'pharmacist', label: 'Pharmacist', color: 'badge-green' },
    { value: 'maintenance_staff', label: 'Maintenance', color: 'badge-red' },
    { value: 'ambulance_driver', label: 'Ambulance Driver', color: 'badge-red' },
    { value: 'patient', label: 'Patient', color: 'badge-blue' },
];

const DEPARTMENTS = ['Administration', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'General', 'ICU', 'Emergency', 'Radiology', 'Pathology', 'Pharmacy', 'Maintenance', 'Front Desk', 'Surgery'];

export default function AdminPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [msg, setMsg] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [form, setForm] = useState({
        name: '', email: '', password: '', role: 'doctor',
        phone: '', department: 'General', specialization: '', patientId: ''
    });

    useEffect(() => { loadUsers(); }, [roleFilter, searchQuery]);

    const loadUsers = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (roleFilter) params.append('role', roleFilter);
        if (searchQuery) params.append('search', searchQuery);
        const r = await api.get(`/auth/users?${params.toString()}`);
        if (r.success) setUsers(r.data);
        setLoading(false);
    };

    const createUser = async () => {
        if (!form.name || !form.email || !form.password) {
            setMsg('Name, email and password are required');
            setTimeout(() => setMsg(''), 3000); return;
        }
        if (form.password.length < 6) {
            setMsg('Password must be at least 6 characters');
            setTimeout(() => setMsg(''), 3000); return;
        }
        const r = await api.post('/auth/register', form);
        if (r.success) {
            setMsg(`✅ ${form.name} created as ${ROLES.find(r => r.value === form.role)?.label}!`);
            setShowAdd(false);
            setForm({ name: '', email: '', password: '', role: 'doctor', phone: '', department: 'General', specialization: '', patientId: '' });
            loadUsers();
        } else {
            setMsg(r.message || 'Failed to create user');
        }
        setTimeout(() => setMsg(''), 5000);
    };

    const toggleActive = async (userId, currentStatus) => {
        const r = await api.patch(`/auth/users/${userId}`, { isActive: !currentStatus });
        if (r.success) {
            setMsg(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
            loadUsers();
        }
        setTimeout(() => setMsg(''), 3000);
    };

    const getRoleInfo = (role) => ROLES.find(r => r.value === role) || { label: role, color: 'badge-yellow' };

    const stats = {
        total: users.length,
        active: users.filter(u => u.isActive).length,
        doctors: users.filter(u => u.role === 'doctor').length,
        nurses: users.filter(u => u.role === 'nurse').length,
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">👥 User Management</h1>
                    <p className="text-sm text-gray-500">Create and manage user accounts for all hospital roles</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add User</button>
            </div>

            {msg && <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium animate-fade-in">{msg}</div>}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card text-center"><p className="text-xs text-gray-500">Total Users</p><p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">Active</p><p className="text-2xl font-bold text-emerald-600">{stats.active}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">Doctors</p><p className="text-2xl font-bold text-blue-600">{stats.doctors}</p></div>
                <div className="card text-center"><p className="text-xs text-gray-500">Nurses</p><p className="text-2xl font-bold text-pink-600">{stats.nurses}</p></div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap items-center">
                <input className="input-field max-w-xs" placeholder="Search by name, email or ID..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                <select className="input-field max-w-[200px]" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="">All Roles</option>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
            </div>

            {/* Users Table */}
            <div className="card overflow-hidden p-0">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-dark-800">
                        <tr>{['Employee ID', 'Name', 'Email', 'Role', 'Department', 'Phone', 'Status', 'Actions'].map((h) => <th key={h} className="table-header">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="8" className="table-cell text-center text-gray-400 py-8">Loading users...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan="8" className="table-cell text-center text-gray-400 py-8">No users found. Click &quot;+ Add User&quot; to create one.</td></tr>
                        ) : users.map((u) => {
                            const roleInfo = getRoleInfo(u.role);
                            return (
                                <tr key={u._id} className={`hover:bg-gray-50 dark:hover:bg-dark-800/50 ${!u.isActive ? 'opacity-50' : ''}`}>
                                    <td className="table-cell font-mono text-xs text-primary-600">{u.employeeId || '—'}</td>
                                    <td className="table-cell font-medium">{u.name}</td>
                                    <td className="table-cell text-sm text-gray-500">{u.email}</td>
                                    <td className="table-cell"><span className={`badge ${roleInfo.color}`}>{roleInfo.label}</span></td>
                                    <td className="table-cell text-sm">{u.department || '—'}</td>
                                    <td className="table-cell text-sm">{u.phone || '—'}</td>
                                    <td className="table-cell">
                                        <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                                            {u.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="table-cell">
                                        <button onClick={() => toggleActive(u._id, u.isActive)}
                                            className={`text-xs px-2 py-1 rounded font-medium ${u.isActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                                            {u.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Add User Modal */}
            <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New User">
                <div className="space-y-4">
                    <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Full Name *</label>
                        <input className="input-field" placeholder="Dr. John Smith" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Email *</label>
                            <input type="email" className="input-field" placeholder="john@hospital.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Password *</label>
                            <input type="password" className="input-field" placeholder="Min 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Role *</label>
                            <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Department</label>
                            <select className="input-field" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Phone</label>
                            <input className="input-field" placeholder="9876543210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                        <div><label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Specialization</label>
                            <input className="input-field" placeholder="e.g. Cardiologist" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} /></div>
                    </div>
                    {form.role === 'patient' && (
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                            <label className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1 block">Link to Patient ID (optional)</label>
                            <input className="input-field" placeholder="e.g. PAT-001" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value.toUpperCase() })} />
                            <p className="text-xs text-blue-500 mt-1">Enter the patient&apos;s existing Patient ID to link their records (lab results, bills, etc.)</p>
                        </div>
                    )}
                    <div className="flex gap-2 pt-2">
                        <button onClick={createUser} className="btn-primary flex-1">Create User</button>
                        <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
