const express = require('express');
const router = express.Router();
const TriageCase = require('../models/Emergency');
const { auth } = require('../middleware/auth');
const { authorizeModule } = require('../middleware/rbac');
const { auditAction } = require('../middleware/audit');
const { emitToModule, emitToRole } = require('../config/socket');

router.use(auth);
router.use(authorizeModule('emergency'));
router.use(auditAction('emergency'));

router.get('/cases', async (req, res) => {
    try {
        const { priority, status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (priority) filter.priority = priority;
        if (status) filter.status = status;
        else filter.status = { $nin: ['discharged', 'deceased'] };
        const cases = await TriageCase.find(filter)
            .populate('patient', 'name patientId age gender bloodGroup')
            .populate('triageNurse', 'name').populate('assignedDoctor', 'name specialization')
            .skip((page - 1) * limit).limit(parseInt(limit)).sort({ priority: 1, arrivalTime: 1 });
        const total = await TriageCase.countDocuments(filter);
        res.json({ success: true, data: cases, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/cases', async (req, res) => {
    try {
        const triageCase = new TriageCase({ ...req.body, triageNurse: req.userId });
        await triageCase.save();
        await triageCase.populate('patient', 'name patientId age gender');

        if (triageCase.priority === 'critical' || triageCase.priority === 'urgent') {
            emitToRole('doctor', 'triage:alert', { priority: triageCase.priority, patient: triageCase.patient, complaint: triageCase.chiefComplaint, caseId: triageCase.caseId });
        }
        emitToModule('emergency', 'triage:update', { action: 'new', data: triageCase });
        res.status(201).json({ success: true, data: triageCase });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/cases/:id', async (req, res) => {
    try {
        const { status, assignedDoctor, disposition, notes } = req.body;
        const update = {};
        if (status) { update.status = status; if (status === 'in-treatment') update.treatmentStartTime = new Date(); if (status === 'discharged' || status === 'admitted') update.dispositionTime = new Date(); }
        if (assignedDoctor) update.assignedDoctor = assignedDoctor;
        if (disposition) update.disposition = disposition;
        if (notes) update.notes = notes;

        const triageCase = await TriageCase.findByIdAndUpdate(req.params.id, update, { new: true })
            .populate('patient', 'name patientId').populate('assignedDoctor', 'name');
        if (!triageCase) return res.status(404).json({ success: false, message: 'Case not found' });
        emitToModule('emergency', 'triage:update', { action: 'updated', data: triageCase });
        res.json({ success: true, data: triageCase });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/dashboard', async (req, res) => {
    try {
        const [critical, urgent, semiUrgent, normal, inTreatment, waiting] = await Promise.all([
            TriageCase.countDocuments({ priority: 'critical', status: { $nin: ['discharged', 'deceased'] } }),
            TriageCase.countDocuments({ priority: 'urgent', status: { $nin: ['discharged', 'deceased'] } }),
            TriageCase.countDocuments({ priority: 'semi-urgent', status: { $nin: ['discharged', 'deceased'] } }),
            TriageCase.countDocuments({ priority: 'normal', status: { $nin: ['discharged', 'deceased'] } }),
            TriageCase.countDocuments({ status: 'in-treatment' }),
            TriageCase.countDocuments({ status: 'waiting' }),
        ]);
        res.json({ success: true, data: { critical, urgent, semiUrgent, normal, inTreatment, waiting, total: critical + urgent + semiUrgent + normal } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
