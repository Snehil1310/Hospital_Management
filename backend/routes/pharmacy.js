const express = require('express');
const router = express.Router();
const { Medicine, Supplier, Prescription } = require('../models/Pharmacy');
const { auth } = require('../middleware/auth');
const { authorizeModule } = require('../middleware/rbac');
const { auditAction } = require('../middleware/audit');

router.use(auth);
router.use(authorizeModule('pharmacy'));
router.use(auditAction('pharmacy'));

// ===== MEDICINES =====
router.get('/medicines', async (req, res) => {
    try {
        const { search, category, lowStock, expiringSoon, page = 1, limit = 20 } = req.query;
        const filter = { isActive: true };
        if (search) filter.$text = { $search: search };
        if (category) filter.category = category;
        if (lowStock === 'true') filter.$expr = { $lte: ['$quantity', '$minStockLevel'] };
        if (expiringSoon === 'true') { const in30Days = new Date(); in30Days.setDate(in30Days.getDate() + 30); filter.expiryDate = { $lte: in30Days }; }
        const medicines = await Medicine.find(filter).populate('supplier', 'name').skip((page - 1) * limit).limit(parseInt(limit)).sort({ name: 1 });
        const total = await Medicine.countDocuments(filter);
        res.json({ success: true, data: medicines, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/medicines', async (req, res) => {
    try { const med = new Medicine(req.body); await med.save(); res.status(201).json({ success: true, data: med }); }
    catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.put('/medicines/:id', async (req, res) => {
    try {
        const med = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!med) return res.status(404).json({ success: false, message: 'Medicine not found' });
        res.json({ success: true, data: med });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/medicines/:id/restock', async (req, res) => {
    try {
        const { quantity } = req.body;
        const med = await Medicine.findByIdAndUpdate(req.params.id, { $inc: { quantity } }, { new: true });
        if (!med) return res.status(404).json({ success: false, message: 'Medicine not found' });
        res.json({ success: true, data: med });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== SUPPLIERS =====
router.get('/suppliers', async (req, res) => {
    try {
        const suppliers = await Supplier.find({ isActive: true }).sort({ name: 1 });
        res.json({ success: true, data: suppliers });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/suppliers', async (req, res) => {
    try { const supplier = new Supplier(req.body); await supplier.save(); res.status(201).json({ success: true, data: supplier }); }
    catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== PRESCRIPTIONS =====
router.get('/prescriptions', async (req, res) => {
    try {
        const { patient, status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (patient) filter.patient = patient;
        if (status) filter.status = status;
        const prescriptions = await Prescription.find(filter)
            .populate('patient', 'name patientId').populate('doctor', 'name').populate('medicines.medicine', 'name category')
            .populate('dispensedBy', 'name').skip((page - 1) * limit).limit(parseInt(limit)).sort({ createdAt: -1 });
        const total = await Prescription.countDocuments(filter);
        res.json({ success: true, data: prescriptions, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/prescriptions', async (req, res) => {
    try {
        const prescription = new Prescription({ ...req.body, doctor: req.body.doctor || req.userId });
        await prescription.save();
        await prescription.populate('patient', 'name patientId');
        res.status(201).json({ success: true, data: prescription });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.patch('/prescriptions/:id/dispense', async (req, res) => {
    try {
        const prescription = await Prescription.findById(req.params.id);
        if (!prescription) return res.status(404).json({ success: false, message: 'Prescription not found' });

        for (const item of prescription.medicines) {
            if (!item.dispensed && item.medicine) {
                await Medicine.findByIdAndUpdate(item.medicine, { $inc: { quantity: -(item.quantity || 1) } });
                item.dispensed = true;
            }
        }
        prescription.status = 'dispensed';
        prescription.dispensedBy = req.userId;
        prescription.dispensedDate = new Date();
        await prescription.save();
        res.json({ success: true, data: prescription });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ===== DASHBOARD =====
router.get('/dashboard', async (req, res) => {
    try {
        const in30Days = new Date(); in30Days.setDate(in30Days.getDate() + 30);
        const [totalMedicines, lowStock, expiringSoon, pendingPrescriptions, totalSuppliers] = await Promise.all([
            Medicine.countDocuments({ isActive: true }),
            Medicine.countDocuments({ isActive: true, $expr: { $lte: ['$quantity', '$minStockLevel'] } }),
            Medicine.countDocuments({ isActive: true, expiryDate: { $lte: in30Days } }),
            Prescription.countDocuments({ status: 'pending' }),
            Supplier.countDocuments({ isActive: true }),
        ]);
        res.json({ success: true, data: { totalMedicines, lowStock, expiringSoon, pendingPrescriptions, totalSuppliers } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
