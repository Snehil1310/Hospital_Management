const express = require('express');
const router = express.Router();
const { Patient, Token, Appointment } = require('../models/OPD');
const { Bill } = require('../models/Billing');
const LabSample = require('../models/Lab');
const { Prescription } = require('../models/Pharmacy');
const { auth } = require('../middleware/auth');
const { authorizeModule } = require('../middleware/rbac');

router.use(auth);
router.use(authorizeModule('patient-portal'));

// Helper: get this patient's Patient record via linked user
const getMyPatient = async (userId) => {
    return Patient.findOne({ user: userId });
};

// GET /patient-portal/profile — get my patient profile
router.get('/profile', async (req, res) => {
    try {
        const patient = await getMyPatient(req.userId);
        if (!patient) return res.status(404).json({ success: false, message: 'No patient record linked to your account. Contact the receptionist.' });
        res.json({ success: true, data: patient });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// GET /patient-portal/appointments
router.get('/appointments', async (req, res) => {
    try {
        const patient = await getMyPatient(req.userId);
        if (!patient) return res.json({ success: true, data: [] });
        const appointments = await Appointment.find({ patient: patient._id })
            .populate('doctor', 'name department specialization')
            .sort({ date: -1 })
            .limit(50);
        res.json({ success: true, data: appointments });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// GET /patient-portal/lab-results
router.get('/lab-results', async (req, res) => {
    try {
        const patient = await getMyPatient(req.userId);
        if (!patient) return res.json({ success: true, data: [] });
        const samples = await LabSample.find({ patient: patient._id })
            .populate('orderedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ success: true, data: samples });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// GET /patient-portal/bills
router.get('/bills', async (req, res) => {
    try {
        const patient = await getMyPatient(req.userId);
        if (!patient) return res.json({ success: true, data: [] });
        const bills = await Bill.find({ patient: patient._id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ success: true, data: bills });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// GET /patient-portal/prescriptions
router.get('/prescriptions', async (req, res) => {
    try {
        const patient = await getMyPatient(req.userId);
        if (!patient) return res.json({ success: true, data: [] });
        const prescriptions = await Prescription.find({ patient: patient._id })
            .populate('doctor', 'name department specialization')
            .populate('medicines.medicine', 'name genericName')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ success: true, data: prescriptions });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// GET /patient-portal/dashboard — summary stats
router.get('/dashboard', async (req, res) => {
    try {
        const patient = await getMyPatient(req.userId);
        if (!patient) return res.json({ success: true, data: { linked: false } });

        const [appointments, labs, bills, prescriptions] = await Promise.all([
            Appointment.countDocuments({ patient: patient._id }),
            LabSample.countDocuments({ patient: patient._id }),
            Bill.find({ patient: patient._id }).select('totalAmount paidAmount status'),
            Prescription.countDocuments({ patient: patient._id }),
        ]);

        const totalBillAmount = bills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const totalPaid = bills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
        const pendingBills = bills.filter(b => b.status !== 'paid' && b.status !== 'cancelled').length;

        res.json({
            success: true,
            data: {
                linked: true,
                patientId: patient.patientId,
                name: patient.name,
                appointments,
                labResults: labs,
                totalBills: bills.length,
                pendingBills,
                totalBillAmount,
                totalPaid,
                dueAmount: totalBillAmount - totalPaid,
                prescriptions,
            }
        });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
