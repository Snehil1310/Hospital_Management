'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (savedUser && token) {
            setUser(JSON.parse(savedUser));
            api.setToken(token);
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        if (res.success) {
            setUser(res.data.user);
            api.setToken(res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            localStorage.setItem('refreshToken', res.data.refreshToken);
            return { success: true };
        }
        return { success: false, message: res.message };
    };

    const logout = async () => {
        try { await api.post('/auth/logout'); } catch { }
        setUser(null);
        api.clearToken();
    };

    const register = async (data) => {
        const res = await api.post('/auth/register', data);
        if (res.success) {
            setUser(res.data.user);
            api.setToken(res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            localStorage.setItem('refreshToken', res.data.refreshToken);
            return { success: true };
        }
        return { success: false, message: res.message };
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, loading, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
