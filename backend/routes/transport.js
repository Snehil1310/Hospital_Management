const express = require('express');
const router = express.Router();
const TransportRequest = require('../models/Transport');
const { auth } = require('../middleware/auth');
const { authorizeModule } = require('../middleware/rbac');
const { auditAction } = require('../middleware/audit');
const { emitToModule } = require('../config/socket');

router.use(auth);
router.use(authorizeModule('transport'));
router.use(auditAction('transport'));

router.get('/', async (req, res) => {
    try {
        const { status, priority, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        const requests = await TransportRequest.find(filter)
            .populate('patient', 'name patientId').populate('requestedBy', 'name role').populate('assignedTo', 'name')
            .skip((page - 1) * limit).limit(parseInt(limit)).sort({ createdAt: -1 });
        const total = await TransportRequest.countDocuments(filter);
        res.json({ success: true, data: requests, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/', async (req, res) => {
    try {
        const request = new TransportRequest({ ...req.body, requestedBy: req.userId });
        await request.save();
        await request.populate('patient', 'name patientId');
        emitToModule('transport', 'transport:status', { action: 'new', data: request });
        res.status(201).json({ success: true, data: request });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/:id/assign', async (req, res) => {
    try {
        const request = await TransportRequest.findByIdAndUpdate(req.params.id,
            { assignedTo: req.body.assignedTo, status: 'assigned', assignedTime: new Date() }, { new: true })
            .populate('patient', 'name patientId').populate('assignedTo', 'name');
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
        emitToModule('transport', 'transport:status', { action: 'assigned', data: request });
        res.json({ success: true, data: request });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const update = { status };
        if (status === 'in-transit') update.startTime = new Date();
        if (status === 'completed') update.completionTime = new Date();
        const request = await TransportRequest.findByIdAndUpdate(req.params.id, update, { new: true })
            .populate('patient', 'name patientId').populate('assignedTo', 'name');
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
        emitToModule('transport', 'transport:status', { action: 'status-update', data: request });
        res.json({ success: true, data: request });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/stats', async (req, res) => {
    try {
        const today = new Date(new Date().setHours(0, 0, 0, 0));
        const [pending, inTransit, completed, total] = await Promise.all([
            TransportRequest.countDocuments({ status: 'pending' }),
            TransportRequest.countDocuments({ status: 'in-transit' }),
            TransportRequest.countDocuments({ status: 'completed', createdAt: { $gte: today } }),
            TransportRequest.countDocuments({ createdAt: { $gte: today } }),
        ]);
        res.json({ success: true, data: { pending, inTransit, completedToday: completed, totalToday: total } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
