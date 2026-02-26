const API_BASE = '/api';

class ApiClient {
    constructor() {
        this.token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    }

    setToken(token) {
        this.token = token;
        if (typeof window !== 'undefined') localStorage.setItem('token', token);
    }

    clearToken() {
        this.token = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
        }
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

        try {
            const res = await fetch(url, { ...options, headers });
            const data = await res.json();

            if (res.status === 401) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    headers['Authorization'] = `Bearer ${this.token}`;
                    const retryRes = await fetch(url, { ...options, headers });
                    return retryRes.json();
                } else {
                    this.clearToken();
                    if (typeof window !== 'undefined') window.location.href = '/';
                    throw new Error('Session expired');
                }
            }
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async refreshToken() {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) return false;
            const res = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });
            if (!res.ok) return false;
            const data = await res.json();
            this.setToken(data.data.token);
            localStorage.setItem('refreshToken', data.data.refreshToken);
            return true;
        } catch { return false; }
    }

    get(endpoint) { return this.request(endpoint); }
    post(endpoint, body) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) }); }
    put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) }); }
    patch(endpoint, body) { return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }); }
    delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
}

const api = new ApiClient();
export default api;
