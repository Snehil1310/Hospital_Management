'use client';
import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';

const statusColors = {
    scheduled: 'badge-blue', confirmed: 'badge-green', completed: 'badge-green', cancelled: 'badge-red', 'no-show': 'badge-yellow',
    ordered: 'badge-purple', collected: 'badge-blue', processing: 'badge-yellow', 'report-ready': 'badge-green', delivered: 'badge-green',
    pending: 'badge-yellow', 'partially-dispensed': 'badge-blue', dispensed: 'badge-green',
    draft: 'badge-yellow', generated: 'badge-blue', sent: 'badge-purple', 'partially-paid': 'badge-yellow', paid: 'badge-green', overdue: 'badge-red',
};

export default function PatientPortalPage() {
    const { user } = useAuth();
    const [tab, setTab] = useState('overview');
    const [dashboard, setDashboard] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [labResults, setLabResults] = useState([]);
    const [bills, setBills] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadDashboard(); }, []);

    const loadDashboard = async () => {
        setLoading(true);
        const r = await api.get('/patient-portal/dashboard');
        if (r.success) setDashboard(r.data);
        setLoading(false);
    };

    const loadTab = async (t) => {
        setTab(t);
        if (t === 'appointments' && appointments.length === 0) {
            const r = await api.get('/patient-portal/appointments');
            if (r.success) setAppointments(r.data);
        }
        if (t === 'lab' && labResults.length === 0) {
            const r = await api.get('/patient-portal/lab-results');
            if (r.success) setLabResults(r.data);
        }
        if (t === 'bills' && bills.length === 0) {
            const r = await api.get('/patient-portal/bills');
            if (r.success) setBills(r.data);
        }
        if (t === 'prescriptions' && prescriptions.length === 0) {
            const r = await api.get('/patient-portal/prescriptions');
            if (r.success) setPrescriptions(r.data);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="text-center"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div><p className="text-gray-500">Loading your portal...</p></div></div>;

    if (!dashboard?.linked) {
        return (
            <div className="card text-center py-12 max-w-lg mx-auto mt-10">
                <div className="text-5xl mb-4">🏥</div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Welcome, {user?.name}!</h2>
                <p className="text-gray-500">Your account hasn&apos;t been linked to a patient record yet.</p>
                <p className="text-gray-400 text-sm mt-2">Please visit the hospital reception or contact an administrator to link your patient ID to your account.</p>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: '📋' },
        { id: 'appointments', label: 'Appointments', icon: '📅' },
        { id: 'lab', label: 'Lab Results', icon: '🔬' },
        { id: 'bills', label: 'Bills', icon: '💰' },
        { id: 'prescriptions', label: 'Prescriptions', icon: '💊' },
    ];

    const d = dashboard;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🏥 Patient Portal</h1>
                <p className="text-sm text-gray-500">Welcome, {d.name} — Patient ID: <span className="font-mono text-primary-600">{d.patientId}</span></p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap border-b border-gray-200 dark:border-dark-700 pb-2">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => loadTab(t.id)}
                        className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 border-b-2 border-primary-500' : 'bg-gray-50 dark:bg-dark-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100'}`}>
                        <span className="mr-1">{t.icon}</span> {t.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {tab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="card text-center"><p className="text-xs text-gray-500">Appointments</p><p className="text-2xl font-bold text-blue-600">{d.appointments}</p></div>
                        <div className="card text-center"><p className="text-xs text-gray-500">Lab Results</p><p className="text-2xl font-bold text-purple-600">{d.labResults}</p></div>
                        <div className="card text-center"><p className="text-xs text-gray-500">Prescriptions</p><p className="text-2xl font-bold text-teal-600">{d.prescriptions}</p></div>
                        <div className="card text-center"><p className="text-xs text-gray-500">Pending Bills</p><p className="text-2xl font-bold text-amber-600">{d.pendingBills}</p></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-blue-600">Total Billed</p>
                            <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">₹{(d.totalBillAmount || 0).toLocaleString()}</p>
                        </div>
                        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                            <p className="text-xs text-green-600">Total Paid</p>
                            <p className="text-2xl font-bold text-green-800 dark:text-green-300">₹{(d.totalPaid || 0).toLocaleString()}</p>
                        </div>
                        <div className="card bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
                            <p className="text-xs text-amber-600">Due Amount</p>
                            <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">₹{(d.dueAmount || 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Appointments Tab */}
            {tab === 'appointments' && (
                <div className="space-y-3">
                    {appointments.length === 0 ? <div className="card text-center text-gray-400 py-8">No appointments found</div> :
                        appointments.map(a => (
                            <div key={a._id} className="card">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-800 dark:text-white">{a.department}</span>
                                            <span className={statusColors[a.status] || 'badge-yellow'}>{a.status}</span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Dr. {a.doctor?.name || 'N/A'} {a.doctor?.specialization ? `(${a.doctor.specialization})` : ''}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(a.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                            {a.timeSlot?.start && ` • ${a.timeSlot.start} - ${a.timeSlot.end}`}
                                        </p>
                                        {a.reason && <p className="text-sm text-gray-500 mt-1">Reason: {a.reason}</p>}
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                </div>
            )}

            {/* Lab Results Tab */}
            {tab === 'lab' && (
                <div className="space-y-3">
                    {labResults.length === 0 ? <div className="card text-center text-gray-400 py-8">No lab results found</div> :
                        labResults.map(s => (
                            <div key={s._id} className="card">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-800 dark:text-white">{s.testType}</span>
                                            <span className={statusColors[s.status] || 'badge-yellow'}>{s.status}</span>
                                            {s.priority !== 'routine' && <span className="badge-red">{s.priority?.toUpperCase()}</span>}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">Category: {s.category} • Barcode: <span className="font-mono">{s.barcode}</span></p>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(s.createdAt).toLocaleString('en-IN')}</p>
                                        {s.results && (
                                            <div className="mt-2 p-2 rounded bg-gray-50 dark:bg-dark-700 text-sm">
                                                <p className="font-medium text-gray-700 dark:text-gray-300">Results:</p>
                                                <p className="text-gray-600 dark:text-gray-400">{typeof s.results === 'object' ? JSON.stringify(s.results) : s.results}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                </div>
            )}

            {/* Bills Tab */}
            {tab === 'bills' && (
                <div className="space-y-3">
                    {bills.length === 0 ? <div className="card text-center text-gray-400 py-8">No bills found</div> :
                        bills.map(b => (
                            <div key={b._id} className="card">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm text-primary-600">{b.billNumber}</span>
                                            <span className={statusColors[b.status] || 'badge-yellow'}>{b.status}</span>
                                        </div>
                                        <div className="mt-2 space-y-1">
                                            {b.items?.map((item, i) => (
                                                <p key={i} className="text-sm text-gray-600 dark:text-gray-400">
                                                    {item.description} × {item.quantity} — ₹{(item.total || item.unitPrice * item.quantity).toLocaleString()}
                                                </p>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">{new Date(b.createdAt).toLocaleDateString('en-IN')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-gray-800 dark:text-white">₹{(b.totalAmount || 0).toLocaleString()}</p>
                                        <p className="text-xs text-gray-500">Paid: ₹{(b.paidAmount || 0).toLocaleString()}</p>
                                        {b.dueAmount > 0 && <p className="text-xs text-red-500 font-medium">Due: ₹{b.dueAmount.toLocaleString()}</p>}
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                </div>
            )}

            {/* Prescriptions Tab */}
            {tab === 'prescriptions' && (
                <div className="space-y-3">
                    {prescriptions.length === 0 ? <div className="card text-center text-gray-400 py-8">No prescriptions found</div> :
                        prescriptions.map(p => (
                            <div key={p._id} className="card">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-800 dark:text-white">Prescription</span>
                                            <span className={statusColors[p.status] || 'badge-yellow'}>{p.status}</span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">Dr. {p.doctor?.name || 'N/A'} {p.doctor?.specialization ? `(${p.doctor.specialization})` : ''}</p>
                                        <div className="mt-2 space-y-1">
                                            {p.medicines?.map((med, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm">
                                                    <span className={`w-2 h-2 rounded-full ${med.dispensed ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">{med.medicineName || med.medicine?.name}</span>
                                                    <span className="text-gray-500">— {med.dosage}, {med.frequency} for {med.duration}</span>
                                                    {med.dispensed && <span className="text-xs text-green-600">(Dispensed)</span>}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-2">{new Date(p.createdAt).toLocaleDateString('en-IN')}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                </div>
            )}
        </div>
    );
}
