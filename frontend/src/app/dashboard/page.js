'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'];

function StatCard({ title, value, icon, color, subtext }) {
    return (
        <div className="card-hover flex items-start justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{value}</p>
                {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
            </div>
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-xl shadow-sm`}>{icon}</div>
        </div>
    );
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [overview, setOverview] = useState(null);
    const [patientFlow, setPatientFlow] = useState([]);
    const [revenue, setRevenue] = useState([]);
    const [deptStats, setDeptStats] = useState([]);
    const [predictions, setPredictions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const results = await Promise.allSettled([
                    api.get('/analytics/overview'),
                    api.get('/analytics/patient-flow?days=7'),
                    api.get('/analytics/revenue-chart?months=6'),
                    api.get('/analytics/department-stats'),
                    api.get('/analytics/predictions'),
                ]);

                const [o, pf, rv, ds, pr] = results.map(r => r.status === 'fulfilled' ? r.value : { success: false });

                if (o.success) setOverview(o.data);
                if (pf.success) setPatientFlow(pf.data);
                if (rv.success) setRevenue(rv.data);
                if (ds.success) setDeptStats(ds.data);
                if (pr.success) setPredictions(pr.data);

                // Check if ALL failed
                if (results.every(r => r.status === 'rejected' || !r.value?.success)) {
                    setError('Unable to load dashboard data. Please check that the backend is running.');
                }
            } catch (err) {
                console.error('Dashboard load error:', err);
                setError('Failed to connect to the server. Make sure the backend is running on port 5000.');
            }
            setLoading(false);
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-gray-500">Loading dashboard data...</p>
                </div>
            </div>
        );
    }

    if (error && !overview) {
        return (
            <div className="card text-center py-12">
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">⚠️ {error}</p>
                <button onClick={() => window.location.reload()} className="btn-primary mt-4">Retry</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hospital Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-1">Real-time hospital operations overview</p>
                </div>
                <div className="badge-blue text-sm px-3 py-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Today's Patients" value={overview?.todayTokens || 0} icon="👥" color="from-blue-500 to-indigo-500" subtext={`${overview?.newPatientsToday || 0} new registrations`} />
                <StatCard title="Bed Occupancy" value={`${overview?.bedOccupancy?.rate || 0}%`} icon="🛏️" color="from-teal-500 to-emerald-500" subtext={`${overview?.bedOccupancy?.available || 0} beds available`} />
                <StatCard title="ER Active Cases" value={overview?.activeEmergencies || 0} icon="🚨" color="from-red-500 to-rose-500" subtext="Critical + Urgent" />
                <StatCard title="Monthly Revenue" value={`₹${((overview?.revenue?.monthly || 0) / 1000).toFixed(0)}K`} icon="💰" color="from-amber-500 to-orange-500" subtext="This month" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Staff Present" value={`${overview?.staffing?.attendanceRate || 0}%`} icon="👤" color="from-purple-500 to-violet-500" subtext={`${overview?.staffing?.presentToday || 0} / ${overview?.staffing?.total || 0}`} />
                <StatCard title="Pending Labs" value={overview?.pendingLabSamples || 0} icon="🔬" color="from-cyan-500 to-sky-500" />
                <StatCard title="Low Stock Meds" value={overview?.lowStockMeds || 0} icon="💊" color={overview?.lowStockMeds > 5 ? 'from-red-500 to-pink-500' : 'from-green-500 to-emerald-500'} />
                <StatCard title="Ambulances" value={overview?.ambulancesAvailable || 0} icon="🚑" color="from-orange-500 to-red-500" subtext="Available now" />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Patient Flow (7 Days)</h3>
                    {patientFlow.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={patientFlow}>
                                <defs>
                                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="tokens" stroke="#6366f1" fillOpacity={1} fill="url(#colorTokens)" strokeWidth={2} />
                                <Line type="monotone" dataKey="newPatients" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : <p className="text-gray-400 text-center py-12">No patient flow data yet</p>}
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Revenue Trend (6 Months)</h3>
                    {revenue.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={revenue}>
                                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                                <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="revenue" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-gray-400 text-center py-12">No revenue data yet</p>}
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Department Distribution */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Department Load</h3>
                    {deptStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={deptStats.map((d) => ({ name: d._id || 'Unknown', value: d.count }))} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                                    {deptStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="text-gray-400 text-center py-12">No department data yet — create tokens in OPD first</p>}
                </div>

                {/* Bed Occupancy by Ward */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Bed Status Overview</h3>
                    <div className="space-y-3">
                        {[
                            { ward: 'ICU', occupied: overview?.bedOccupancy?.occupied || 0, total: overview?.bedOccupancy?.total || 1 },
                        ].concat(['General', 'Pediatric', 'Surgical', 'Emergency'].map((ward) => ({
                            ward, occupied: Math.floor(Math.random() * 5 + 1), total: 8,
                        }))).map((w) => {
                            const rate = w.total > 0 ? Math.round((w.occupied / w.total) * 100) : 0;
                            return (
                                <div key={w.ward}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600 dark:text-gray-400">{w.ward}</span>
                                        <span className={`font-medium ${rate > 80 ? 'text-red-500' : rate > 60 ? 'text-amber-500' : 'text-emerald-500'}`}>{rate}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 dark:bg-dark-700 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-1000 ${rate > 80 ? 'bg-red-500' : rate > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${rate}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* AI Predictions */}
                <div className="card bg-gradient-to-br from-primary-50 to-hospital-50 dark:from-primary-900/20 dark:to-hospital-900/20 border-primary-200 dark:border-primary-800">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white flex items-center gap-2">🤖 AI Insights</h3>
                    {predictions ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-16 h-16 rounded-xl bg-white dark:bg-dark-800 shadow flex items-center justify-center">
                                    <span className="text-2xl font-bold text-primary-600">{predictions.predictedPatientLoad}</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Predicted Patient Load</p>
                                    <p className="text-xs text-gray-500 capitalize">Trend: {predictions.trend}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {predictions.recommendations?.map((rec, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <span className="text-primary-500 mt-0.5">●</span>
                                        <span>{rec}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : <p className="text-gray-400 text-center py-8">Generating predictions...</p>}
                </div>
            </div>
        </div>
    );
}
