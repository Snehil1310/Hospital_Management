const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.id} (${socket.user.role})`);

        // Join role-based room
        socket.join(`role:${socket.user.role}`);
        socket.join(`user:${socket.user.id}`);

        // Join module rooms based on role
        const roleModuleMap = {
            admin: ['opd', 'icu', 'transport', 'nursing', 'lab', 'pharmacy', 'ot', 'emergency', 'equipment', 'ambulance', 'billing', 'hr', 'laundry', 'bloodbank', 'analytics'],
            doctor: ['opd', 'icu', 'ot', 'emergency', 'lab', 'pharmacy'],
            nurse: ['opd', 'icu', 'nursing', 'transport', 'emergency'],
            receptionist: ['opd', 'billing', 'transport'],
            lab_technician: ['lab'],
            pharmacist: ['pharmacy'],
            maintenance_staff: ['equipment', 'laundry'],
            ambulance_driver: ['ambulance', 'emergency'],
        };

        const modules = roleModuleMap[socket.user.role] || [];
        modules.forEach((mod) => socket.join(`module:${mod}`));

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user.id}`);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

const emitToModule = (moduleName, event, data) => {
    if (io) {
        io.to(`module:${moduleName}`).emit(event, data);
    }
};

const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
};

const emitToRole = (role, event, data) => {
    if (io) {
        io.to(`role:${role}`).emit(event, data);
    }
};

module.exports = { initializeSocket, getIO, emitToModule, emitToUser, emitToRole };
