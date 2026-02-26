const express = require('express');
const router = express.Router();
const { Equipment, MaintenanceTicket } = require('../models/Equipment');
const { auth } = require('../middleware/auth');
const { authorizeModule } = require('../middleware/rbac');
const { auditAction } = require('../middleware/audit');

router.use(auth);
router.use(authorizeModule('equipment'));
router.use(auditAction('equipment'));

router.get('/', async (req, res) => {
    try {
        const { status, category, search, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;
        if (search) filter.name = new RegExp(search, 'i');
        const items = await Equipment.find(filter).skip((page - 1) * limit).limit(parseInt(limit)).sort({ name: 1 });
        const total = await Equipment.countDocuments(filter);
        res.json({ success: true, data: items, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/', async (req, res) => {
    try { const eq = new Equipment(req.body); await eq.save(); res.status(201).json({ success: true, data: eq }); }
    catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.put('/:id', async (req, res) => {
    try {
        const eq = await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!eq) return res.status(404).json({ success: false, message: 'Equipment not found' });
        res.json({ success: true, data: eq });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== MAINTENANCE TICKETS =====
router.get('/tickets', async (req, res) => {
    try {
        const { status, priority, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        const tickets = await MaintenanceTicket.find(filter)
            .populate('equipment', 'name equipmentId').populate('reportedBy', 'name').populate('assignedTo', 'name')
            .skip((page - 1) * limit).limit(parseInt(limit)).sort({ createdAt: -1 });
        const total = await MaintenanceTicket.countDocuments(filter);
        res.json({ success: true, data: tickets, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/tickets', async (req, res) => {
    try {
        const ticket = new MaintenanceTicket({ ...req.body, reportedBy: req.userId });
        await ticket.save();
        await Equipment.findByIdAndUpdate(req.body.equipment, { status: 'maintenance' });
        res.status(201).json({ success: true, data: ticket });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/tickets/:id', async (req, res) => {
    try {
        const update = { ...req.body };
        if (update.status === 'resolved') { update.resolvedDate = new Date(); }
        const ticket = await MaintenanceTicket.findByIdAndUpdate(req.params.id, update, { new: true }).populate('equipment', 'name equipmentId');
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
        if (ticket.status === 'resolved' || ticket.status === 'closed') {
            await Equipment.findByIdAndUpdate(ticket.equipment, { status: 'operational', lastMaintenanceDate: new Date() });
        }
        res.json({ success: true, data: ticket });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/dashboard', async (req, res) => {
    try {
        const [total, operational, maintenance, faulty, openTickets, overdueMainten] = await Promise.all([
            Equipment.countDocuments(),
            Equipment.countDocuments({ status: 'operational' }),
            Equipment.countDocuments({ status: 'maintenance' }),
            Equipment.countDocuments({ status: 'faulty' }),
            MaintenanceTicket.countDocuments({ status: { $in: ['open', 'in-progress'] } }),
            Equipment.countDocuments({ nextMaintenanceDate: { $lt: new Date() }, status: 'operational' }),
        ]);
        res.json({ success: true, data: { total, operational, maintenance, faulty, openTickets, overdueMainten } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
