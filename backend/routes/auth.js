const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const { auth, generateToken, generateRefreshToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 */
router.post('/register', [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['admin', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'pharmacist', 'maintenance_staff', 'ambulance_driver', 'patient']).withMessage('Valid role is required'),
    validate,
], async (req, res) => {
    try {
        const { name, email, password, role, phone, department, specialization, patientId } = req.body;
        const existing = await User.findOne({ email });
        if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

        const user = new User({
            name, email, password, role, phone, department, specialization,
            employeeId: role === 'patient' ? `PAT-USR-${Date.now().toString(36).toUpperCase()}` : `EMP-${Date.now().toString(36).toUpperCase()}`
        });
        await user.save();

        // If role is 'patient' and a patientId is provided, link the Patient record to this user
        if (role === 'patient' && patientId) {
            const { Patient } = require('../models/OPD');
            const patient = await Patient.findOne({ patientId: patientId.toUpperCase() });
            if (patient) {
                patient.user = user._id;
                await patient.save();
            }
        }

        const token = generateToken(user);
        const refreshToken = generateRefreshToken(user);
        user.refreshToken = refreshToken;
        await user.save();

        res.status(201).json({ success: true, data: { user, token, refreshToken } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 */
router.post('/login', [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
], async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        if (!user.isActive) return res.status(403).json({ success: false, message: 'Account deactivated' });

        user.lastLogin = new Date();
        const token = generateToken(user);
        const refreshToken = generateRefreshToken(user);
        user.refreshToken = refreshToken;
        await user.save();

        res.json({ success: true, data: { user, token, refreshToken } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ success: false, message: 'Invalid refresh token' });
        }

        const newToken = generateToken(user);
        const newRefreshToken = generateRefreshToken(user);
        user.refreshToken = newRefreshToken;
        await user.save();

        res.json({ success: true, data: { token: newToken, refreshToken: newRefreshToken } });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
});

router.get('/me', auth, async (req, res) => {
    res.json({ success: true, data: req.user });
});

router.post('/logout', auth, async (req, res) => {
    try {
        req.user.refreshToken = null;
        await req.user.save();
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/users/lookup/:employeeId', auth, async (req, res) => {
    try {
        const user = await User.findOne({ employeeId: req.params.employeeId.toUpperCase() }).select('-password -refreshToken');
        if (!user) return res.status(404).json({ success: false, message: 'Employee not found' });
        res.json({ success: true, data: user });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/users/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
        const { isActive, name, phone, department, specialization } = req.body;
        const update = {};
        if (typeof isActive === 'boolean') update.isActive = isActive;
        if (name) update.name = name;
        if (phone) update.phone = phone;
        if (department) update.department = department;
        if (specialization) update.specialization = specialization;
        const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password -refreshToken');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: user });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/users', auth, async (req, res) => {
    try {
        const { role, department, search, page = 1, limit = 50 } = req.query;
        const filter = {};
        if (role) filter.role = role;
        if (department) filter.department = department;
        if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }, { employeeId: new RegExp(search, 'i') }];

        const users = await User.find(filter)
            .select('-password -refreshToken')
            .skip((page - 1) * limit).limit(parseInt(limit))
            .sort({ createdAt: -1 });
        const total = await User.countDocuments(filter);

        res.json({ success: true, data: users, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
