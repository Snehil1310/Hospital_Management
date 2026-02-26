'use client';
import { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from '../../contexts/AuthContext';
import { SocketProvider } from '../../contexts/SocketContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import api from '../../lib/api';

const moduleGroups = [
    {
        label: 'My Portal',
        items: [
            { name: 'My Portal', path: '/dashboard/patient-portal', icon: '🏥', roles: ['patient'] },
        ],
    },
    {
        label: 'Patient Care',
        items: [
            { name: 'OPD', path: '/dashboard/opd', icon: '🏥', roles: ['admin', 'doctor', 'nurse', 'receptionist'] },
            { name: 'ICU & Beds', path: '/dashboard/icu', icon: '🛏️', roles: ['admin', 'doctor', 'nurse'] },
            { name: 'Emergency', path: '/dashboard/emergency', icon: '🚨', roles: ['admin', 'doctor', 'nurse', 'ambulance_driver'] },
            { name: 'OT Schedule', path: '/dashboard/ot', icon: '⚕️', roles: ['admin', 'doctor'] },
        ],
    },
    {
        label: 'Clinical',
        items: [
            { name: 'Lab Tracking', path: '/dashboard/lab', icon: '🔬', roles: ['admin', 'doctor', 'nurse', 'lab_technician'] },
            { name: 'Pharmacy', path: '/dashboard/pharmacy', icon: '💊', roles: ['admin', 'doctor', 'pharmacist'] },
            { name: 'Blood Bank', path: '/dashboard/bloodbank', icon: '🅱️', roles: ['admin', 'doctor', 'nurse', 'lab_technician'] },
        ],
    },
    {
        label: 'Operations',
        items: [
            { name: 'Transport', path: '/dashboard/transport', icon: '🚑', roles: ['admin', 'nurse', 'receptionist'] },
            { name: 'Nursing Roster', path: '/dashboard/nursing', icon: '👩‍⚕️', roles: ['admin', 'nurse'] },
            { name: 'Ambulance', path: '/dashboard/ambulance', icon: '🚒', roles: ['admin', 'ambulance_driver'] },
        ],
    },
    {
        label: 'Administration',
        items: [
            { name: 'User Management', path: '/dashboard/admin', icon: '👥', roles: ['admin'] },
            { name: 'Billing', path: '/dashboard/billing', icon: '💰', roles: ['admin', 'receptionist'] },
            { name: 'HR & Staff', path: '/dashboard/hr', icon: '👤', roles: ['admin'] },
            { name: 'Equipment', path: '/dashboard/equipment', icon: '🔧', roles: ['admin', 'maintenance_staff'] },
            { name: 'Laundry', path: '/dashboard/laundry', icon: '🧺', roles: ['admin', 'maintenance_staff'] },
        ],
    },
    {
        label: 'Insights',
        items: [
            { name: 'Analytics', path: '/dashboard/analytics', icon: '📊', roles: ['admin', 'doctor'] },
        ],
    },
];

function Sidebar({ collapsed, setCollapsed }) {
    const { user } = useAuth();
    const pathname = usePathname();

    return (
        <aside className={`fixed left-0 top-0 h-screen bg-white dark:bg-dark-900 border-r border-gray-200 dark:border-dark-700 z-40 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} flex flex-col`}>
            <div className="p-4 border-b border-gray-200 dark:border-dark-700 flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-hospital-500 rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0">🏥</div>
                {!collapsed && <span className="font-bold text-lg bg-gradient-to-r from-primary-600 to-hospital-600 bg-clip-text text-transparent">Hospital ERP</span>}
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-4">
                <Link href="/dashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${pathname === '/dashboard' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-800'}`}>
                    <span className="text-lg">📋</span>
                    {!collapsed && <span>Dashboard</span>}
                </Link>

                {moduleGroups.map((group) => {
                    const visibleItems = group.items.filter((item) => item.roles.includes(user?.role));
                    if (visibleItems.length === 0) return null;
                    return (
                        <div key={group.label}>
                            {!collapsed && <p className="px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{group.label}</p>}
                            {visibleItems.map((item) => (
                                <Link key={item.path} href={item.path}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${pathname === item.path || pathname?.startsWith(item.path + '/')
                                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-800'}`}>
                                    <span className="text-base">{item.icon}</span>
                                    {!collapsed && <span>{item.name}</span>}
                                </Link>
                            ))}
                        </div>
                    );
                })}
            </nav>

            <button onClick={() => setCollapsed(!collapsed)} className="p-3 border-t border-gray-200 dark:border-dark-700 text-gray-400 hover:text-gray-600 text-sm">
                {collapsed ? '→' : '← Collapse'}
            </button>
        </aside>
    );
}

function ServerStatus() {
    const [status, setStatus] = useState('checking');

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await fetch('/api/health');
                const data = await res.json();
                setStatus(res.ok && data?.status === 'OK' ? 'online' : 'offline');
            } catch {
                setStatus('offline');
            }
        };
        checkHealth();
        const interval = setInterval(checkHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-xs font-medium mr-2">
            <span className="relative flex h-2.5 w-2.5">
                {status === 'online' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status === 'online' ? 'bg-green-500' : status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
            </span>
            <span className="text-gray-600 dark:text-gray-300">
                {status === 'online' ? 'Backend Live' : status === 'offline' ? 'Backend Offline' : 'Checking...'}
            </span>
        </div>
    );
}

function Header() {
    const { user, logout } = useAuth();
    const [dark, setDark] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        if (localStorage.getItem('theme') === 'dark') { setDark(true); document.documentElement.classList.add('dark'); }
    }, []);

    const toggleDark = () => {
        setDark(!dark);
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', !dark ? 'dark' : 'light');
    };

    const roleLabels = { admin: 'Admin', doctor: 'Doctor', nurse: 'Nurse', receptionist: 'Receptionist', lab_technician: 'Lab Tech', pharmacist: 'Pharmacist', maintenance_staff: 'Maintenance', ambulance_driver: 'Driver', patient: 'Patient' };

    return (
        <header className="h-16 bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between px-6 sticky top-0 z-30">
            <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Welcome back, {user?.name?.split(' ')[0]} 👋</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{roleLabels[user?.role] || user?.role}</p>
            </div>
            <div className="flex items-center gap-3">
                <ServerStatus />
                <button onClick={toggleDark} className="p-2 rounded-lg bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 text-lg">
                    {dark ? '☀️' : '🌙'}
                </button>
                <button className="p-2 rounded-lg bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700 text-lg relative">
                    🔔
                </button>
                <div className="relative">
                    <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-dark-800 hover:bg-gray-200 dark:hover:bg-dark-700">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-hospital-500 flex items-center justify-center text-white text-xs font-bold">{user?.name?.[0]}</div>
                        {!dropdownOpen ? '▼' : '▲'}
                    </button>
                    {dropdownOpen && (
                        <div className="absolute right-0 top-12 w-48 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-xl z-50 py-1">
                            <div className="px-4 py-2 border-b border-gray-100 dark:border-dark-700">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{user?.name}</p>
                                <p className="text-xs text-gray-500">{user?.email}</p>
                            </div>
                            <button onClick={() => { logout(); window.location.href = '/'; }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

function DashboardShell({ children }) {
    const { user, loading } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-950"><div className="text-xl">Loading...</div></div>;
    if (!user) { if (typeof window !== 'undefined') window.location.href = '/'; return null; }

    return (
        <SocketProvider>
            <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
                <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
                <div className={`transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}>
                    <Header />
                    <main className="p-6 animate-fade-in">{children}</main>
                </div>
            </div>
        </SocketProvider>
    );
}

export default function DashboardLayout({ children }) {
    return <AuthProvider><DashboardShell>{children}</DashboardShell></AuthProvider>;
}
