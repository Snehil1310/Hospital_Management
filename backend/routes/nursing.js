const express = require('express');
const router = express.Router();
const { Shift, LeaveRequest, ShiftSwap } = require('../models/Nursing');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { authorizeModule } = require('../middleware/rbac');
const { auditAction } = require('../middleware/audit');

router.use(auth);
router.use(authorizeModule('nursing'));
router.use(auditAction('nursing'));

// ===== SHIFTS =====
router.get('/shifts', async (req, res) => {
    try {
        const { date, ward, nurse, page = 1, limit = 50 } = req.query;
        const filter = {};
        if (date) filter.date = new Date(date);
        if (ward) filter.ward = ward;
        if (nurse) filter.nurse = nurse;
        const shifts = await Shift.find(filter).populate('nurse', 'name email phone').skip((page - 1) * limit).limit(parseInt(limit)).sort({ date: 1, shiftType: 1 });
        const total = await Shift.countDocuments(filter);
        res.json({ success: true, data: shifts, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/shifts', async (req, res) => {
    try { const shift = new Shift(req.body); await shift.save(); await shift.populate('nurse', 'name'); res.status(201).json({ success: true, data: shift }); }
    catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/shifts/auto-schedule', async (req, res) => {
    try {
        const { startDate, endDate, ward } = req.body;
        const nurses = await User.find({ role: 'nurse', isActive: true });
        const shifts = [];
        const shiftTypes = [
            { type: 'morning', start: '06:00', end: '14:00' },
            { type: 'afternoon', start: '14:00', end: '22:00' },
            { type: 'night', start: '22:00', end: '06:00' },
        ];
        let nurseIndex = 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            for (const st of shiftTypes) {
                const shift = new Shift({ nurse: nurses[nurseIndex % nurses.length]._id, date: new Date(d), shiftType: st.type, startTime: st.start, endTime: st.end, ward: ward || 'General' });
                shifts.push(shift);
                nurseIndex++;
            }
        }
        await Shift.insertMany(shifts);
        res.status(201).json({ success: true, data: shifts, message: `${shifts.length} shifts auto-scheduled` });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/shifts/:id/checkin', async (req, res) => {
    try {
        const shift = await Shift.findByIdAndUpdate(req.params.id, { checkIn: new Date(), status: 'active' }, { new: true }).populate('nurse', 'name');
        if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });
        res.json({ success: true, data: shift });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/shifts/:id/checkout', async (req, res) => {
    try {
        const shift = await Shift.findByIdAndUpdate(req.params.id, { checkOut: new Date(), status: 'completed' }, { new: true }).populate('nurse', 'name');
        if (!shift) return res.status(404).json({ success: false, message: 'Shift not found' });
        res.json({ success: true, data: shift });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== LEAVE REQUESTS =====
router.get('/leaves', async (req, res) => {
    try {
        const { status, nurse } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (nurse) filter.nurse = nurse;
        const leaves = await LeaveRequest.find(filter).populate('nurse', 'name email').populate('approvedBy', 'name').sort({ createdAt: -1 });
        res.json({ success: true, data: leaves });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/leaves', async (req, res) => {
    try { const leave = new LeaveRequest({ ...req.body, nurse: req.body.nurse || req.userId }); await leave.save(); await leave.populate('nurse', 'name'); res.status(201).json({ success: true, data: leave }); }
    catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/leaves/:id', async (req, res) => {
    try {
        const { status, responseNotes } = req.body;
        const leave = await LeaveRequest.findByIdAndUpdate(req.params.id, { status, responseNotes, approvedBy: req.userId, responseDate: new Date() }, { new: true }).populate('nurse', 'name');
        if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
        res.json({ success: true, data: leave });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== SHIFT SWAPS =====
router.post('/swaps', async (req, res) => {
    try { const swap = new ShiftSwap({ ...req.body, requestingNurse: req.userId }); await swap.save(); res.status(201).json({ success: true, data: swap }); }
    catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/swaps/:id', async (req, res) => {
    try {
        const swap = await ShiftSwap.findByIdAndUpdate(req.params.id, { status: req.body.status, approvedBy: req.userId }, { new: true });
        if (!swap) return res.status(404).json({ success: false, message: 'Swap not found' });
        if (swap.status === 'approved') {
            const [shift1, shift2] = await Promise.all([Shift.findById(swap.requestingShift), Shift.findById(swap.targetShift)]);
            if (shift1 && shift2) { const tmpNurse = shift1.nurse; shift1.nurse = shift2.nurse; shift2.nurse = tmpNurse; shift1.status = 'swapped'; shift2.status = 'swapped'; await Promise.all([shift1.save(), shift2.save()]); }
        }
        res.json({ success: true, data: swap });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
