const express = require('express');
const router = express.Router();
const { Surgery, OperatingTheatre } = require('../models/OT');
const { auth } = require('../middleware/auth');
const { authorizeModule } = require('../middleware/rbac');
const { auditAction } = require('../middleware/audit');

router.use(auth);
router.use(authorizeModule('ot'));
router.use(auditAction('ot'));

// ===== THEATRES =====
router.get('/theatres', async (req, res) => {
    try {
        const { status, type } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (type) filter.type = type;
        const theatres = await OperatingTheatre.find(filter).sort({ number: 1 });
        res.json({ success: true, data: theatres });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/theatres', async (req, res) => {
    try { const theatre = new OperatingTheatre(req.body); await theatre.save(); res.status(201).json({ success: true, data: theatre }); }
    catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.put('/theatres/:id', async (req, res) => {
    try {
        const theatre = await OperatingTheatre.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!theatre) return res.status(404).json({ success: false, message: 'Theatre not found' });
        res.json({ success: true, data: theatre });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== SURGERIES =====
router.get('/surgeries', async (req, res) => {
    try {
        const { date, theatre, surgeon, status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (date) { const d = new Date(date); filter.scheduledDate = { $gte: d, $lt: new Date(d.getTime() + 86400000) }; }
        if (theatre) filter.theatre = theatre;
        if (surgeon) filter.leadSurgeon = surgeon;
        if (status) filter.status = status;
        const surgeries = await Surgery.find(filter)
            .populate('patient', 'name patientId age gender')
            .populate('leadSurgeon', 'name specialization')
            .populate('anesthetist', 'name')
            .populate('theatre', 'name number type')
            .skip((page - 1) * limit).limit(parseInt(limit)).sort({ scheduledDate: 1, startTime: 1 });
        const total = await Surgery.countDocuments(filter);
        res.json({ success: true, data: surgeries, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/surgeries', async (req, res) => {
    try {
        // Check for conflicts
        if (!req.body.isEmergencyOverride) {
            const conflict = await Surgery.findOne({
                theatre: req.body.theatre, scheduledDate: new Date(req.body.scheduledDate),
                status: { $nin: ['cancelled', 'completed'] },
                $or: [{ startTime: { $lt: req.body.endTime }, endTime: { $gt: req.body.startTime } }],
            });
            if (conflict) return res.status(409).json({ success: false, message: 'Schedule conflict detected', conflict });
        }
        const surgery = new Surgery(req.body);
        await surgery.save();
        await surgery.populate('patient', 'name patientId');
        await surgery.populate('leadSurgeon', 'name');
        await surgery.populate('theatre', 'name number');
        res.status(201).json({ success: true, data: surgery });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/surgeries/:id', async (req, res) => {
    try {
        const surgery = await Surgery.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('patient', 'name patientId').populate('leadSurgeon', 'name').populate('theatre', 'name number');
        if (!surgery) return res.status(404).json({ success: false, message: 'Surgery not found' });
        // Update theatre status
        if (req.body.status === 'in-progress') await OperatingTheatre.findByIdAndUpdate(surgery.theatre, { status: 'in-use' });
        if (req.body.status === 'completed') await OperatingTheatre.findByIdAndUpdate(surgery.theatre, { status: 'cleaning' });
        res.json({ success: true, data: surgery });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/surgeries/:id/emergency-override', async (req, res) => {
    try {
        const surgery = new Surgery({ ...req.body, isEmergencyOverride: true, procedureType: 'emergency' });
        await surgery.save();
        // Cancel or postpone conflicting surgeries
        await Surgery.updateMany(
            { theatre: surgery.theatre, scheduledDate: surgery.scheduledDate, _id: { $ne: surgery._id }, status: 'scheduled' },
            { status: 'postponed' }
        );
        res.status(201).json({ success: true, data: surgery });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
