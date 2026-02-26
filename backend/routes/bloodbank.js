const express = require('express');
const router = express.Router();
const { BloodUnit, Donor, BloodRequest } = require('../models/BloodBank');
const { auth } = require('../middleware/auth');
const { authorizeModule } = require('../middleware/rbac');
const { auditAction } = require('../middleware/audit');

router.use(auth);
router.use(authorizeModule('bloodbank'));
router.use(auditAction('bloodbank'));

// ===== BLOOD UNITS =====
router.get('/units', async (req, res) => {
    try {
        const { bloodGroup, component, status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (bloodGroup) filter.bloodGroup = bloodGroup;
        if (component) filter.component = component;
        if (status) filter.status = status;
        else filter.status = { $ne: 'discarded' };
        const units = await BloodUnit.find(filter).populate('donor', 'name donorId').skip((page - 1) * limit).limit(parseInt(limit)).sort({ collectionDate: -1 });
        const total = await BloodUnit.countDocuments(filter);
        res.json({ success: true, data: units, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/units', async (req, res) => {
    try { const unit = new BloodUnit(req.body); await unit.save(); res.status(201).json({ success: true, data: unit }); }
    catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/units/:id', async (req, res) => {
    try {
        const unit = await BloodUnit.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!unit) return res.status(404).json({ success: false, message: 'Blood unit not found' });
        res.json({ success: true, data: unit });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== DONORS =====
router.get('/donors', async (req, res) => {
    try {
        const { bloodGroup, search, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (bloodGroup) filter.bloodGroup = bloodGroup;
        if (search) filter.name = new RegExp(search, 'i');
        const donors = await Donor.find(filter).skip((page - 1) * limit).limit(parseInt(limit)).sort({ name: 1 });
        const total = await Donor.countDocuments(filter);
        res.json({ success: true, data: donors, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/donors', async (req, res) => {
    try { const donor = new Donor(req.body); await donor.save(); res.status(201).json({ success: true, data: donor }); }
    catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== BLOOD REQUESTS =====
router.get('/requests', async (req, res) => {
    try {
        const { status, priority, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        const requests = await BloodRequest.find(filter).populate('patient', 'name patientId').populate('requestedBy', 'name')
            .populate('approvedBy', 'name').skip((page - 1) * limit).limit(parseInt(limit)).sort({ createdAt: -1 });
        const total = await BloodRequest.countDocuments(filter);
        res.json({ success: true, data: requests, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/requests', async (req, res) => {
    try {
        const request = new BloodRequest({ ...req.body, requestedBy: req.userId });
        await request.save();
        await request.populate('patient', 'name patientId');
        res.status(201).json({ success: true, data: request });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/requests/:id/fulfill', async (req, res) => {
    try {
        const { bloodUnitIds } = req.body;
        const request = await BloodRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

        for (const unitId of bloodUnitIds) {
            await BloodUnit.findByIdAndUpdate(unitId, { status: 'issued' });
        }
        request.bloodUnits.push(...bloodUnitIds);
        request.unitsIssued += bloodUnitIds.length;
        request.status = request.unitsIssued >= request.unitsRequired ? 'fulfilled' : 'partially-fulfilled';
        request.approvedBy = req.userId;
        await request.save();
        res.json({ success: true, data: request });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== INVENTORY DASHBOARD =====
router.get('/dashboard', async (req, res) => {
    try {
        const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
        const inventory = await Promise.all(groups.map(async (bg) => ({
            bloodGroup: bg,
            available: await BloodUnit.countDocuments({ bloodGroup: bg, status: 'available' }),
            reserved: await BloodUnit.countDocuments({ bloodGroup: bg, status: 'reserved' }),
        })));
        const [totalDonors, pendingRequests, expiringSoon] = await Promise.all([
            Donor.countDocuments(),
            BloodRequest.countDocuments({ status: 'pending' }),
            BloodUnit.countDocuments({ status: 'available', expiryDate: { $lte: new Date(Date.now() + 7 * 86400000) } }),
        ]);
        res.json({ success: true, data: { inventory, totalDonors, pendingRequests, expiringSoon } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
