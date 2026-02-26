const express = require('express');
const router = express.Router();
const { Staff, Attendance, Payroll } = require('../models/HR');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { authorizeModule, authorize, ROLES } = require('../middleware/rbac');
const { auditAction } = require('../middleware/audit');

router.use(auth);
router.use(auditAction('hr'));

// ===== STAFF =====
router.get('/staff', async (req, res) => {
    try {
        const { department, search, page = 1, limit = 20 } = req.query;
        const filter = { isActive: true };
        if (department) filter.department = department;
        if (search) filter.$or = [{ employeeId: new RegExp(search, 'i') }, { designation: new RegExp(search, 'i') }];
        const staff = await Staff.find(filter).populate('user', 'name email phone role').skip((page - 1) * limit).limit(parseInt(limit)).sort({ createdAt: -1 });
        const total = await Staff.countDocuments(filter);
        res.json({ success: true, data: staff, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/staff', authorize(ROLES.ADMIN), async (req, res) => {
    try { const staff = new Staff(req.body); await staff.save(); await staff.populate('user', 'name email role'); res.status(201).json({ success: true, data: staff }); }
    catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.put('/staff/:id', authorize(ROLES.ADMIN), async (req, res) => {
    try {
        const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('user', 'name email role');
        if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
        res.json({ success: true, data: staff });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== ATTENDANCE =====
router.get('/attendance', async (req, res) => {
    try {
        const { staff, date, month, year, page = 1, limit = 50 } = req.query;
        const filter = {};
        if (staff) filter.staff = staff;
        if (date) filter.date = new Date(date);
        if (month && year) {
            const start = new Date(year, month - 1, 1);
            const end = new Date(year, month, 0);
            filter.date = { $gte: start, $lte: end };
        }
        const records = await Attendance.find(filter).populate('user', 'name role').populate('staff', 'employeeId department')
            .skip((page - 1) * limit).limit(parseInt(limit)).sort({ date: -1 });
        const total = await Attendance.countDocuments(filter);
        res.json({ success: true, data: records, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/attendance/checkin', async (req, res) => {
    try {
        const { staffId } = req.body;
        const today = new Date(new Date().setHours(0, 0, 0, 0));
        let record = await Attendance.findOne({ staff: staffId, date: today });
        if (record) return res.status(400).json({ success: false, message: 'Already checked in today' });
        const staff = await Staff.findById(staffId);
        record = new Attendance({ staff: staffId, user: staff.user, date: today, checkIn: new Date(), status: 'present', biometricId: `BIO-${Date.now()}` });
        await record.save();
        res.status(201).json({ success: true, data: record });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/attendance/checkout', async (req, res) => {
    try {
        const { staffId } = req.body;
        const today = new Date(new Date().setHours(0, 0, 0, 0));
        const record = await Attendance.findOne({ staff: staffId, date: today });
        if (!record) return res.status(404).json({ success: false, message: 'No check-in found for today' });
        record.checkOut = new Date();
        record.workHours = Math.round((record.checkOut - record.checkIn) / 3600000 * 10) / 10;
        record.overtime = Math.max(0, record.workHours - 8);
        await record.save();
        res.json({ success: true, data: record });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== PAYROLL =====
router.get('/payroll', authorize(ROLES.ADMIN), async (req, res) => {
    try {
        const { month, year, status } = req.query;
        const filter = {};
        if (month) filter.month = parseInt(month);
        if (year) filter.year = parseInt(year);
        if (status) filter.status = status;
        const payroll = await Payroll.find(filter).populate({ path: 'staff', populate: { path: 'user', select: 'name email role' } }).sort({ createdAt: -1 });
        res.json({ success: true, data: payroll });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/payroll/generate', authorize(ROLES.ADMIN), async (req, res) => {
    try {
        const { month, year } = req.body;
        const allStaff = await Staff.find({ isActive: true });
        const payrolls = [];
        for (const s of allStaff) {
            const existing = await Payroll.findOne({ staff: s._id, month, year });
            if (existing) continue;
            const start = new Date(year, month - 1, 1);
            const end = new Date(year, month, 0);
            const attendanceCount = await Attendance.countDocuments({ staff: s._id, date: { $gte: start, $lte: end }, status: 'present' });
            const overtimeHours = await Attendance.aggregate([
                { $match: { staff: s._id, date: { $gte: start, $lte: end } } },
                { $group: { _id: null, total: { $sum: '$overtime' } } },
            ]);
            const netSalary = (s.salary?.net || 50000) * (attendanceCount / 22);
            const payroll = new Payroll({
                staff: s._id, month, year, workingDays: 22, presentDays: attendanceCount,
                basicSalary: s.salary?.basic || 30000, overtime: overtimeHours[0]?.total || 0,
                deductions: s.salary?.deductions || 5000, netSalary: Math.round(netSalary),
            });
            payrolls.push(payroll);
        }
        await Payroll.insertMany(payrolls);
        res.status(201).json({ success: true, data: payrolls, message: `${payrolls.length} payroll records generated` });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/dashboard', async (req, res) => {
    try {
        const [totalStaff, departments, presentToday] = await Promise.all([
            Staff.countDocuments({ isActive: true }),
            Staff.distinct('department'),
            Attendance.countDocuments({ date: new Date(new Date().setHours(0, 0, 0, 0)), status: 'present' }),
        ]);
        res.json({ success: true, data: { totalStaff, departments: departments.length, presentToday, attendanceRate: totalStaff ? Math.round((presentToday / totalStaff) * 100) : 0 } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
