const express = require('express');
const router = express.Router();
const { Ambulance, Dispatch, DriverLog } = require('../models/Ambulance');
const { auth } = require('../middleware/auth');
const { authorizeModule } = require('../middleware/rbac');
const { auditAction } = require('../middleware/audit');
const { emitToModule } = require('../config/socket');

router.use(auth);
router.use(authorizeModule('ambulance'));
router.use(auditAction('ambulance'));

router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        const filter = { isActive: true };
        if (status) filter.status = status;
        const ambulances = await Ambulance.find(filter).populate('currentDriver', 'name phone');
        res.json({ success: true, data: ambulances });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/', async (req, res) => {
    try { const amb = new Ambulance(req.body); await amb.save(); res.status(201).json({ success: true, data: amb }); }
    catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.put('/:id', async (req, res) => {
    try {
        const amb = await Ambulance.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!amb) return res.status(404).json({ success: false, message: 'Ambulance not found' });
        emitToModule('ambulance', 'ambulance:location', { id: amb._id, location: amb.location, status: amb.status });
        res.json({ success: true, data: amb });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== DISPATCH =====
router.get('/dispatches', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        const dispatches = await Dispatch.find(filter)
            .populate('ambulance', 'vehicleNumber type').populate('driver', 'name phone').populate('patient', 'name patientId')
            .skip((page - 1) * limit).limit(parseInt(limit)).sort({ dispatchTime: -1 });
        const total = await Dispatch.countDocuments(filter);
        res.json({ success: true, data: dispatches, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/dispatch', async (req, res) => {
    try {
        const dispatch = new Dispatch(req.body);
        await dispatch.save();
        await Ambulance.findByIdAndUpdate(req.body.ambulance, { status: 'dispatched', currentDriver: req.body.driver });
        await dispatch.populate('ambulance', 'vehicleNumber type');
        await dispatch.populate('driver', 'name');
        emitToModule('ambulance', 'ambulance:dispatch', { action: 'dispatched', data: dispatch });
        res.status(201).json({ success: true, data: dispatch });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/dispatches/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const update = { status };
        if (status === 'at-scene') update.arrivalTime = new Date();
        if (status === 'completed') update.completionTime = new Date();
        const dispatch = await Dispatch.findByIdAndUpdate(req.params.id, update, { new: true }).populate('ambulance');
        if (!dispatch) return res.status(404).json({ success: false, message: 'Dispatch not found' });
        if (status === 'completed') {
            await Ambulance.findByIdAndUpdate(dispatch.ambulance._id, { status: 'available' });
        }
        emitToModule('ambulance', 'ambulance:dispatch', { action: 'status-update', data: dispatch });
        res.json({ success: true, data: dispatch });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== DRIVER LOGS =====
router.get('/driver-logs', async (req, res) => {
    try {
        const { driver, date } = req.query;
        const filter = {};
        if (driver) filter.driver = driver;
        if (date) filter.date = new Date(date);
        const logs = await DriverLog.find(filter).populate('driver', 'name').populate('ambulance', 'vehicleNumber').sort({ date: -1 });
        res.json({ success: true, data: logs });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/driver-logs', async (req, res) => {
    try { const log = new DriverLog(req.body); await log.save(); res.status(201).json({ success: true, data: log }); }
    catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/dashboard', async (req, res) => {
    try {
        const [total, available, dispatched, enRoute, activeDispatches] = await Promise.all([
            Ambulance.countDocuments({ isActive: true }),
            Ambulance.countDocuments({ status: 'available', isActive: true }),
            Ambulance.countDocuments({ status: 'dispatched', isActive: true }),
            Ambulance.countDocuments({ status: { $in: ['en-route', 'at-scene'] }, isActive: true }),
            Dispatch.countDocuments({ status: { $in: ['dispatched', 'en-route', 'at-scene', 'transporting'] } }),
        ]);
        res.json({ success: true, data: { total, available, dispatched, enRoute, activeDispatches } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
