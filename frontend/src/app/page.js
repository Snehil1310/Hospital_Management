'use client';
import { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from '../contexts/AuthContext';

function LoginPage() {
    const { login, isAuthenticated } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            window.location.href = '/dashboard';
        }
    }, [isAuthenticated]);

    const doLogin = async (loginEmail, loginPassword) => {
        setError('');
        setLoading(true);
        try {
            const result = await login(loginEmail, loginPassword);
            if (result.success) {
                setSuccess(true);
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 200);
            } else {
                setError(result.message || 'Login failed. Check your credentials.');
                setLoading(false);
            }
        } catch (err) {
            setError('Connection error. Make sure the backend server is running on port 5000.');
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await doLogin(email, password);
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-dark-950 via-primary-900 to-hospital-900 flex items-center justify-center">
                <div className="text-white text-xl font-medium flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Redirecting to dashboard...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-dark-950 via-primary-900 to-hospital-900 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-hospital-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-5xl grid md:grid-cols-2 gap-8">
                {/* Left - Branding */}
                <div className="flex flex-col justify-center text-white space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center text-2xl">🏥</div>
                        <h1 className="text-3xl font-bold">Smart Hospital ERP</h1>
                    </div>
                    <p className="text-white/70 text-lg leading-relaxed">
                        Next-generation hospital operations management. Streamline patient flow, optimize resources, and deliver better care with real-time insights.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        {['15 Integrated Modules', 'Real-time Updates', 'Smart Analytics', 'Multi-role Access'].map((f) => (
                            <div key={f} className="flex items-center gap-2 text-white/80 text-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-hospital-400"></span>{f}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right - Login Form */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/10">
                    <h2 className="text-2xl font-bold text-white mb-6">Sign In</h2>

                    {error && <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-white/70 text-sm font-medium mb-1 block">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                                placeholder="your.email@hospital.com" required />
                        </div>
                        <div>
                            <label className="text-white/70 text-sm font-medium mb-1 block">Password</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                                placeholder="••••••••" required />
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-primary-500 to-hospital-500 text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-6 pt-4 border-t border-white/10">
                        <p className="text-white/40 text-xs text-center">Contact your administrator for login credentials</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Page() {
    return <AuthProvider><LoginPage /></AuthProvider>;
}
