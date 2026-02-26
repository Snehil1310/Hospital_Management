'use client';
import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'];

export default function AnalyticsPage() {
    const [overview, setOverview] = useState(null);
    const [patientFlow, setPatientFlow] = useState([]);
    const [revenue, setRevenue] = useState([]);
    const [deptStats, setDeptStats] = useState([]);
    const [predictions, setPredictions] = useState(null);

    useEffect(() => {
        const load = async () => {
            const [o, pf, rv, ds, pr] = await Promise.all([api.get('/analytics/overview'), api.get('/analytics/patient-flow?days=14'), api.get('/analytics/revenue-chart?months=12'), api.get('/analytics/department-stats'), api.get('/analytics/predictions')]);
            if (o.success) setOverview(o.data);
            if (pf.success) setPatientFlow(pf.data);
            if (rv.success) setRevenue(rv.data);
            if (ds.success) setDeptStats(ds.data);
            if (pr.success) setPredictions(pr.data);
        };
        load();
    }, []);

    return (
        <div className="space-y-6">
            <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">📊 Advanced Analytics</h1><p className="text-sm text-gray-500">Deep insights into hospital operations</p></div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Patient Flow (14 Days)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={patientFlow}>
                            <defs><linearGradient id="gTokens" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="tokens" stroke="#6366f1" fill="url(#gTokens)" strokeWidth={2} />
                            <Line type="monotone" dataKey="newPatients" stroke="#14b8a6" strokeWidth={2} dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Revenue Trend (12 Months)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenue}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                            <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`]} />
                            <Bar dataKey="revenue" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Department Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={deptStats.map((d) => ({ name: d._id || 'Other', value: d.count }))} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2} dataKey="value" label={({ name }) => name}>
                                {deptStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="card col-span-2 bg-gradient-to-br from-primary-50 to-hospital-50 dark:from-primary-900/20 dark:to-hospital-900/20">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">🤖 AI Predictions & Recommendations</h3>
                    {predictions && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Predicted Tomorrow's Load</p>
                                <p className="text-4xl font-bold text-primary-600">{predictions.predictedPatientLoad}</p>
                                <p className="text-sm text-gray-500 capitalize mt-1">Trend: <span className={`font-medium ${predictions.trend === 'increasing' ? 'text-red-500' : predictions.trend === 'decreasing' ? 'text-green-500' : 'text-gray-700'}`}>{predictions.trend} ↗</span></p>
                            </div>
                            <div className="space-y-2">
                                {predictions.recommendations?.map((r, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm"><span className="text-primary-500 mt-0.5">●</span><span className="text-gray-600 dark:text-gray-400">{r}</span></div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
