const express = require('express');
const router = express.Router();
const LabSample = require('../models/Lab');
const { auth } = require('../middleware/auth');
const { authorizeModule } = require('../middleware/rbac');
const { auditAction } = require('../middleware/audit');
const { emitToModule } = require('../config/socket');

router.use(auth);
router.use(authorizeModule('lab'));
router.use(auditAction('lab'));

router.get('/samples', async (req, res) => {
    try {
        const { status, category, priority, patient, search, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;
        if (priority) filter.priority = priority;
        if (patient) filter.patient = patient;
        if (search) filter.$or = [{ sampleId: new RegExp(search, 'i') }, { barcode: new RegExp(search, 'i') }, { testType: new RegExp(search, 'i') }];
        const samples = await LabSample.find(filter)
            .populate('patient', 'name patientId').populate('orderedBy', 'name').populate('collectedBy', 'name').populate('processedBy', 'name')
            .skip((page - 1) * limit).limit(parseInt(limit)).sort({ createdAt: -1 });
        const total = await LabSample.countDocuments(filter);
        res.json({ success: true, data: samples, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/samples', async (req, res) => {
    try {
        const sample = new LabSample({ ...req.body, orderedBy: req.userId });
        await sample.save();
        await sample.populate('patient', 'name patientId');
        emitToModule('lab', 'lab:statusChange', { action: 'new', data: sample });
        res.status(201).json({ success: true, data: sample });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/samples/:id', async (req, res) => {
    try {
        const sample = await LabSample.findById(req.params.id)
            .populate('patient', 'name patientId age gender').populate('orderedBy', 'name').populate('collectedBy', 'name').populate('processedBy', 'name');
        if (!sample) return res.status(404).json({ success: false, message: 'Sample not found' });
        res.json({ success: true, data: sample });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/barcode/:barcode', async (req, res) => {
    try {
        const sample = await LabSample.findOne({ barcode: req.params.barcode }).populate('patient', 'name patientId');
        if (!sample) return res.status(404).json({ success: false, message: 'Sample not found' });
        res.json({ success: true, data: sample });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/samples/:id/status', async (req, res) => {
    try {
        const { status, result, resultValues, notes } = req.body;
        const update = { status };
        if (status === 'collected') { update.collectedBy = req.userId; update.collectionDate = new Date(); }
        if (status === 'processing') { update.processedBy = req.userId; update.processingDate = new Date(); }
        if (status === 'completed' || status === 'report-ready') { update.completionDate = new Date(); if (result) update.result = result; if (resultValues) update.resultValues = resultValues; }
        if (notes) update.notes = notes;

        const sample = await LabSample.findByIdAndUpdate(req.params.id, update, { new: true }).populate('patient', 'name patientId');
        if (!sample) return res.status(404).json({ success: false, message: 'Sample not found' });
        emitToModule('lab', 'lab:statusChange', { action: 'status-update', data: sample });
        res.json({ success: true, data: sample });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/dashboard', async (req, res) => {
    try {
        const today = new Date(new Date().setHours(0, 0, 0, 0));
        const [ordered, collected, processing, completed, totalToday] = await Promise.all([
            LabSample.countDocuments({ status: 'ordered' }),
            LabSample.countDocuments({ status: 'collected' }),
            LabSample.countDocuments({ status: 'processing' }),
            LabSample.countDocuments({ status: { $in: ['completed', 'report-ready'] }, createdAt: { $gte: today } }),
            LabSample.countDocuments({ createdAt: { $gte: today } }),
        ]);
        res.json({ success: true, data: { ordered, collected, processing, completedToday: completed, totalToday } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
