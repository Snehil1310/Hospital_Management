'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (user) {
            const token = localStorage.getItem('token');
            const newSocket = io('http://localhost:5000', { auth: { token }, transports: ['websocket', 'polling'] });

            newSocket.on('connect', () => console.log('Socket connected'));
            newSocket.on('notification:new', (data) => {
                setNotifications((prev) => [data, ...prev]);
            });
            newSocket.on('disconnect', () => console.log('Socket disconnected'));

            setSocket(newSocket);
            return () => newSocket.close();
        }
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, notifications, setNotifications }}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => useContext(SocketContext);
