const express = require('express');
const router = express.Router();
const { Linen, SanitationTask } = require('../models/Laundry');
const { auth } = require('../middleware/auth');
const { authorizeModule } = require('../middleware/rbac');
const { auditAction } = require('../middleware/audit');

router.use(auth);
router.use(authorizeModule('laundry'));
router.use(auditAction('laundry'));

// ===== LINEN =====
router.get('/linen', async (req, res) => {
    try {
        const { type, status, ward, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (type) filter.type = type;
        if (status) filter.status = status;
        if (ward) filter.ward = ward;
        const items = await Linen.find(filter).skip((page - 1) * limit).limit(parseInt(limit)).sort({ createdAt: -1 });
        const total = await Linen.countDocuments(filter);
        res.json({ success: true, data: items, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/linen', async (req, res) => {
    try { const item = new Linen(req.body); await item.save(); res.status(201).json({ success: true, data: item }); }
    catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/linen/:id', async (req, res) => {
    try {
        const update = { ...req.body };
        if (update.status === 'clean') update.lastWashed = new Date();
        const item = await Linen.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!item) return res.status(404).json({ success: false, message: 'Linen not found' });
        res.json({ success: true, data: item });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== SANITATION TASKS =====
router.get('/tasks', async (req, res) => {
    try {
        const { status, priority, floor, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (floor) filter.floor = parseInt(floor);
        const tasks = await SanitationTask.find(filter).populate('assignedTo', 'name').populate('verifiedBy', 'name')
            .skip((page - 1) * limit).limit(parseInt(limit)).sort({ scheduledTime: 1 });
        const total = await SanitationTask.countDocuments(filter);
        res.json({ success: true, data: tasks, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/tasks', async (req, res) => {
    try { const task = new SanitationTask(req.body); await task.save(); res.status(201).json({ success: true, data: task }); }
    catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/tasks/:id', async (req, res) => {
    try {
        const update = { ...req.body };
        if (update.status === 'completed') update.completedTime = new Date();
        if (update.status === 'verified') update.verifiedBy = req.userId;
        const task = await SanitationTask.findByIdAndUpdate(req.params.id, update, { new: true }).populate('assignedTo', 'name');
        if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
        res.json({ success: true, data: task });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/dashboard', async (req, res) => {
    try {
        const [totalLinen, clean, soiled, washing, pendingTasks, completedToday] = await Promise.all([
            Linen.countDocuments(),
            Linen.countDocuments({ status: 'clean' }),
            Linen.countDocuments({ status: 'soiled' }),
            Linen.countDocuments({ status: 'washing' }),
            SanitationTask.countDocuments({ status: { $in: ['pending', 'in-progress'] } }),
            SanitationTask.countDocuments({ status: 'completed', completedTime: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
        ]);
        res.json({ success: true, data: { totalLinen, clean, soiled, washing, pendingTasks, completedToday } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
