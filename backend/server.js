require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { initializeSocket } = require('./config/socket');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const opdRoutes = require('./routes/opd');
const icuRoutes = require('./routes/icu');
const transportRoutes = require('./routes/transport');
const nursingRoutes = require('./routes/nursing');
const labRoutes = require('./routes/lab');
const pharmacyRoutes = require('./routes/pharmacy');
const otRoutes = require('./routes/ot');
const emergencyRoutes = require('./routes/emergency');
const equipmentRoutes = require('./routes/equipment');
const ambulanceRoutes = require('./routes/ambulance');
const billingRoutes = require('./routes/billing');
const hrRoutes = require('./routes/hr');
const laundryRoutes = require('./routes/laundry');
const bloodbankRoutes = require('./routes/bloodbank');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const patientPortalRoutes = require('./routes/patientPortal');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(cors({ origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Swagger API Docs
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Smart Hospital ERP API',
            version: '1.0.0',
            description: 'API documentation for the Smart Hospital Operations & Facility ERP system',
        },
        servers: [{ url: `http://localhost:${process.env.PORT || 5000}` }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./routes/*.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/opd', opdRoutes);
app.use('/api/icu', icuRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/nursing', nursingRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/ot', otRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/ambulance', ambulanceRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/laundry', laundryRoutes);
app.use('/api/bloodbank', bloodbankRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/patient-portal', patientPortalRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🏥 Smart Hospital ERP Server running on port ${PORT}`);
    console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => process.exit(0));
});

module.exports = app;
