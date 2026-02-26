const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { Bed, BedAllocation } = require('../models/ICU');
const { auth } = require('../middleware/auth');
const { authorizeModule } = require('../middleware/rbac');
const { auditAction } = require('../middleware/audit');
const { validate } = require('../middleware/validate');
const { emitToModule } = require('../config/socket');

router.use(auth);
router.use(authorizeModule('icu'));
router.use(auditAction('icu'));

// ===== BEDS =====
router.get('/beds', async (req, res) => {
    try {
        const { ward, status, floor } = req.query;
        const filter = {};
        if (ward) filter.ward = ward;
        if (status) filter.status = status;
        if (floor) filter.floor = parseInt(floor);
        const beds = await Bed.find(filter).populate('currentPatient', 'name patientId').sort({ ward: 1, bedNumber: 1 });
        res.json({ success: true, data: beds });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/beds', [body('bedNumber').notEmpty(), body('ward').notEmpty(), body('floor').isInt(), validate], async (req, res) => {
    try {
        const bed = new Bed(req.body);
        await bed.save();
        res.status(201).json({ success: true, data: bed });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.put('/beds/:id', async (req, res) => {
    try {
        const bed = await Bed.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });
        emitToModule('icu', 'bed:update', { action: 'updated', data: bed });
        res.json({ success: true, data: bed });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== BED ALLOCATION =====
router.get('/allocations', async (req, res) => {
    try {
        const { status = 'active', ward, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        const allocations = await BedAllocation.find(filter)
            .populate('bed').populate('patient', 'name patientId age gender')
            .populate('admittedBy', 'name role')
            .skip((page - 1) * limit).limit(parseInt(limit)).sort({ admissionDate: -1 });
        const total = await BedAllocation.countDocuments(filter);
        res.json({ success: true, data: allocations, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/allocate', [
    body('bed').notEmpty(), body('patient').notEmpty(), body('severity').isIn(['critical', 'serious', 'stable', 'recovering']), validate,
], async (req, res) => {
    try {
        const bed = await Bed.findById(req.body.bed);
        if (!bed) return res.status(404).json({ success: false, message: 'Bed not found' });
        if (bed.status !== 'available') return res.status(400).json({ success: false, message: 'Bed is not available' });

        bed.status = 'occupied';
        bed.currentPatient = req.body.patient;
        await bed.save();

        const allocation = new BedAllocation({ ...req.body, admittedBy: req.userId });
        await allocation.save();
        await allocation.populate('bed');
        await allocation.populate('patient', 'name patientId');

        emitToModule('icu', 'bed:update', { action: 'allocated', data: { bed, allocation } });

        // Check occupancy threshold
        const totalBeds = await Bed.countDocuments({ ward: bed.ward });
        const occupiedBeds = await Bed.countDocuments({ ward: bed.ward, status: 'occupied' });
        if (occupiedBeds / totalBeds > 0.85) {
            emitToModule('icu', 'bed:alert', { ward: bed.ward, occupancy: Math.round((occupiedBeds / totalBeds) * 100), message: `${bed.ward} ward is at ${Math.round((occupiedBeds / totalBeds) * 100)}% capacity` });
        }

        res.status(201).json({ success: true, data: allocation });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/transfer', [body('allocationId').notEmpty(), body('toBed').notEmpty(), body('reason').notEmpty(), validate], async (req, res) => {
    try {
        const { allocationId, toBed, reason } = req.body;
        const allocation = await BedAllocation.findById(allocationId);
        if (!allocation) return res.status(404).json({ success: false, message: 'Allocation not found' });

        const newBed = await Bed.findById(toBed);
        if (!newBed || newBed.status !== 'available') return res.status(400).json({ success: false, message: 'Target bed is not available' });

        // Free old bed
        await Bed.findByIdAndUpdate(allocation.bed, { status: 'available', currentPatient: null });

        // Assign new bed
        newBed.status = 'occupied';
        newBed.currentPatient = allocation.patient;
        await newBed.save();

        allocation.transferHistory.push({ fromBed: allocation.bed, toBed: newBed._id, reason, transferredBy: req.userId });
        allocation.bed = newBed._id;
        await allocation.save();

        emitToModule('icu', 'bed:update', { action: 'transfer', data: allocation });
        res.json({ success: true, data: allocation });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/discharge/:id', async (req, res) => {
    try {
        const allocation = await BedAllocation.findById(req.params.id);
        if (!allocation) return res.status(404).json({ success: false, message: 'Allocation not found' });

        allocation.status = 'discharged';
        allocation.dischargeDate = new Date();
        await allocation.save();

        await Bed.findByIdAndUpdate(allocation.bed, { status: 'available', currentPatient: null });
        emitToModule('icu', 'bed:update', { action: 'discharged', data: allocation });

        res.json({ success: true, data: allocation });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== DASHBOARD =====
router.get('/dashboard', async (req, res) => {
    try {
        const wards = ['ICU', 'General', 'Pediatric', 'Maternity', 'Surgical', 'Emergency', 'Private'];
        const stats = await Promise.all(wards.map(async (ward) => {
            const total = await Bed.countDocuments({ ward });
            const occupied = await Bed.countDocuments({ ward, status: 'occupied' });
            const available = await Bed.countDocuments({ ward, status: 'available' });
            const maintenance = await Bed.countDocuments({ ward, status: 'maintenance' });
            return { ward, total, occupied, available, maintenance, occupancy: total ? Math.round((occupied / total) * 100) : 0 };
        }));
        const totalBeds = stats.reduce((a, s) => a + s.total, 0);
        const totalOccupied = stats.reduce((a, s) => a + s.occupied, 0);
        res.json({ success: true, data: { wards: stats, totalBeds, totalOccupied, totalAvailable: totalBeds - totalOccupied, overallOccupancy: totalBeds ? Math.round((totalOccupied / totalBeds) * 100) : 0 } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
