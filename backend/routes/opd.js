const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { Patient, Token, Appointment } = require('../models/OPD');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { authorizeModule } = require('../middleware/rbac');
const { auditAction } = require('../middleware/audit');
const { validate } = require('../middleware/validate');
const { emitToModule } = require('../config/socket');

router.use(auth);
router.use(authorizeModule('opd'));
router.use(auditAction('opd'));

// ===== PATIENTS =====
router.get('/patients', async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (search) filter.$or = [
            { name: new RegExp(search, 'i') },
            { patientId: new RegExp(search, 'i') },
            { phone: new RegExp(search, 'i') },
        ];
        const patients = await Patient.find(filter).skip((page - 1) * limit).limit(parseInt(limit)).sort({ createdAt: -1 });
        const total = await Patient.countDocuments(filter);
        res.json({ success: true, data: patients, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/patients', [
    body('name').trim().notEmpty(),
    body('age').isInt({ min: 0, max: 150 }),
    body('gender').isIn(['male', 'female', 'other']),
    body('phone').notEmpty(),
    validate,
], async (req, res) => {
    try {
        const patientId = `PAT-${Date.now().toString(36).toUpperCase()}`;
        const patient = new Patient({ ...req.body, patientId });
        await patient.save();
        res.status(201).json({ success: true, data: patient });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/patients/lookup/:patientId', async (req, res) => {
    try {
        const patient = await Patient.findOne({ patientId: req.params.patientId.toUpperCase() });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
        res.json({ success: true, data: patient });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/patients/:id', async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
        res.json({ success: true, data: patient });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.put('/patients/:id', async (req, res) => {
    try {
        const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
        res.json({ success: true, data: patient });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== TOKEN QUEUE =====
router.get('/tokens', async (req, res) => {
    try {
        const { date, doctor, status, page = 1, limit = 50 } = req.query;
        const filter = {};
        if (date) filter.date = new Date(date);
        else filter.date = new Date(new Date().setHours(0, 0, 0, 0));
        if (doctor) filter.doctor = doctor;
        if (status) filter.status = status;

        const tokens = await Token.find(filter)
            .populate('patient', 'name patientId age gender phone')
            .populate('doctor', 'name specialization department')
            .skip((page - 1) * limit).limit(parseInt(limit)).sort({ priority: -1, tokenNumber: 1 });
        const total = await Token.countDocuments(filter);

        // Calculate wait times
        const waitingCount = await Token.countDocuments({ ...filter, status: 'waiting' });

        res.json({
            success: true, data: tokens, stats: { total, waiting: waitingCount, avgWaitTime: waitingCount * 12 },
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/tokens', async (req, res) => {
    try {
        const today = new Date(new Date().setHours(0, 0, 0, 0));
        const lastToken = await Token.findOne({ date: today, doctor: req.body.doctor }).sort({ tokenNumber: -1 });
        const tokenNumber = lastToken ? lastToken.tokenNumber + 1 : 1;

        const token = new Token({ ...req.body, tokenNumber, date: today });
        await token.save();
        await token.populate('patient', 'name patientId age gender phone');
        await token.populate('doctor', 'name specialization department');

        emitToModule('opd', 'opd:queue', { action: 'new-token', data: token });
        res.status(201).json({ success: true, data: token });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/tokens/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const update = { status };
        if (status === 'in-consultation') update.consultationStartTime = new Date();
        if (status === 'completed') update.consultationEndTime = new Date();

        const token = await Token.findByIdAndUpdate(req.params.id, update, { new: true })
            .populate('patient', 'name patientId').populate('doctor', 'name');
        if (!token) return res.status(404).json({ success: false, message: 'Token not found' });

        emitToModule('opd', 'opd:queue', { action: 'status-update', data: token });
        res.json({ success: true, data: token });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== APPOINTMENTS =====
router.get('/appointments', async (req, res) => {
    try {
        const { date, doctor, status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (date) { const d = new Date(date); filter.date = { $gte: d, $lt: new Date(d.getTime() + 86400000) }; }
        if (doctor) filter.doctor = doctor;
        if (status) filter.status = status;

        const appointments = await Appointment.find(filter)
            .populate('patient', 'name patientId phone')
            .populate('doctor', 'name specialization department')
            .skip((page - 1) * limit).limit(parseInt(limit)).sort({ date: 1 });
        const total = await Appointment.countDocuments(filter);
        res.json({ success: true, data: appointments, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/appointments', [
    body('patient').notEmpty(),
    body('doctor').notEmpty(),
    body('department').notEmpty(),
    body('date').isISO8601(),
    validate,
], async (req, res) => {
    try {
        const appointment = new Appointment(req.body);
        await appointment.save();
        await appointment.populate('patient', 'name patientId phone');
        await appointment.populate('doctor', 'name specialization');
        res.status(201).json({ success: true, data: appointment });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/appointments/:id', async (req, res) => {
    try {
        const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('patient', 'name patientId').populate('doctor', 'name specialization');
        if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
        res.json({ success: true, data: appointment });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== DOCTORS AVAILABILITY =====
router.get('/doctors', async (req, res) => {
    try {
        const { department, search } = req.query;
        const filter = { role: 'doctor', isActive: true };
        if (department) filter.department = department;
        if (search) filter.name = new RegExp(search, 'i');
        const doctors = await User.find(filter).select('name department specialization phone email');
        res.json({ success: true, data: doctors });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== DASHBOARD STATS =====
router.get('/dashboard', async (req, res) => {
    try {
        const today = new Date(new Date().setHours(0, 0, 0, 0));
        const [totalToday, waiting, inConsultation, completed, totalPatients] = await Promise.all([
            Token.countDocuments({ date: today }),
            Token.countDocuments({ date: today, status: 'waiting' }),
            Token.countDocuments({ date: today, status: 'in-consultation' }),
            Token.countDocuments({ date: today, status: 'completed' }),
            Patient.countDocuments(),
        ]);
        res.json({
            success: true,
            data: { tokensToday: totalToday, waiting, inConsultation, completed, totalPatients, avgWaitTime: waiting * 12 },
        });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
