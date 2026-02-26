const express = require('express');
const router = express.Router();
const { Bill, InsuranceClaim } = require('../models/Billing');
const { auth } = require('../middleware/auth');
const { authorizeModule } = require('../middleware/rbac');
const { auditAction } = require('../middleware/audit');

router.use(auth);
router.use(authorizeModule('billing'));
router.use(auditAction('billing'));

// ===== BILLS =====
router.get('/bills', async (req, res) => {
    try {
        const { patient, status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (patient) filter.patient = patient;
        if (status) filter.status = status;
        const bills = await Bill.find(filter).populate('patient', 'name patientId phone').populate('generatedBy', 'name')
            .skip((page - 1) * limit).limit(parseInt(limit)).sort({ createdAt: -1 });
        const total = await Bill.countDocuments(filter);
        res.json({ success: true, data: bills, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/bills', async (req, res) => {
    try {
        const items = req.body.items || [];
        const subtotal = items.reduce((sum, item) => sum + (item.total || item.unitPrice * (item.quantity || 1)), 0);
        const tax = req.body.tax || subtotal * 0.05;
        const discount = req.body.discount || 0;
        const totalAmount = subtotal + tax - discount;

        const bill = new Bill({ ...req.body, subtotal, tax, discount, totalAmount, generatedBy: req.userId, status: 'generated' });
        await bill.save();
        await bill.populate('patient', 'name patientId');
        res.status(201).json({ success: true, data: bill });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/bills/:id', async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id).populate('patient', 'name patientId phone email address insuranceInfo').populate('generatedBy', 'name');
        if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
        res.json({ success: true, data: bill });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/bills/:id/pay', async (req, res) => {
    try {
        const { amount, paymentMethod } = req.body;
        const bill = await Bill.findById(req.params.id);
        if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });
        bill.paidAmount += amount;
        bill.paymentMethod = paymentMethod;
        bill.status = bill.paidAmount >= bill.totalAmount ? 'paid' : 'partially-paid';
        if (bill.status === 'paid') bill.paidDate = new Date();
        await bill.save();
        res.json({ success: true, data: bill, message: `Payment of ₹${amount} recorded` });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== INSURANCE CLAIMS =====
router.get('/claims', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        const claims = await InsuranceClaim.find(filter).populate('patient', 'name patientId').populate('bill', 'billNumber totalAmount')
            .skip((page - 1) * limit).limit(parseInt(limit)).sort({ createdAt: -1 });
        const total = await InsuranceClaim.countDocuments(filter);
        res.json({ success: true, data: claims, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/claims', async (req, res) => {
    try { const claim = new InsuranceClaim(req.body); await claim.save(); await claim.populate('patient', 'name patientId'); res.status(201).json({ success: true, data: claim }); }
    catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/claims/:id', async (req, res) => {
    try {
        const update = { ...req.body };
        if (update.status === 'approved' || update.status === 'rejected') update.responseDate = new Date();
        const claim = await InsuranceClaim.findByIdAndUpdate(req.params.id, update, { new: true }).populate('patient', 'name patientId');
        if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' });
        res.json({ success: true, data: claim });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/dashboard', async (req, res) => {
    try {
        const today = new Date(new Date().setHours(0, 0, 0, 0));
        const month = new Date(today.getFullYear(), today.getMonth(), 1);
        const [totalBills, paid, pending, overdue, monthlyRevenue, pendingClaims] = await Promise.all([
            Bill.countDocuments(),
            Bill.countDocuments({ status: 'paid' }),
            Bill.countDocuments({ status: { $in: ['generated', 'sent'] } }),
            Bill.countDocuments({ status: 'overdue' }),
            Bill.aggregate([{ $match: { status: 'paid', paidDate: { $gte: month } } }, { $group: { _id: null, total: { $sum: '$paidAmount' } } }]),
            InsuranceClaim.countDocuments({ status: { $in: ['submitted', 'under-review'] } }),
        ]);
        res.json({ success: true, data: { totalBills, paid, pending, overdue, monthlyRevenue: monthlyRevenue[0]?.total || 0, pendingClaims } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
