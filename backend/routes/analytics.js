const express = require('express');
const router = express.Router();
const { Patient, Token } = require('../models/OPD');
const { Bed } = require('../models/ICU');
const { Bill } = require('../models/Billing');
const LabSample = require('../models/Lab');
const { Medicine } = require('../models/Pharmacy');
const TriageCase = require('../models/Emergency');
const { Staff, Attendance } = require('../models/HR');
const { Ambulance } = require('../models/Ambulance');
const { auth } = require('../middleware/auth');
const { authorize, ROLES } = require('../middleware/rbac');

router.use(auth);

router.get('/overview', async (req, res) => {
    try {
        const today = new Date(new Date().setHours(0, 0, 0, 0));
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const [totalPatients, todayTokens, totalBeds, occupiedBeds, activeEmergencies,
            pendingLabSamples, lowStockMeds, monthlyRevenue, totalStaff, presentToday,
            activeAmbulances, newPatientsToday] = await Promise.all([
                Patient.countDocuments(),
                Token.countDocuments({ date: today }),
                Bed.countDocuments(),
                Bed.countDocuments({ status: 'occupied' }),
                TriageCase.countDocuments({ status: { $nin: ['discharged', 'deceased'] } }),
                LabSample.countDocuments({ status: { $in: ['ordered', 'collected', 'processing'] } }),
                Medicine.countDocuments({ isActive: true, $expr: { $lte: ['$quantity', '$minStockLevel'] } }),
                Bill.aggregate([{ $match: { status: 'paid', paidDate: { $gte: thisMonth } } }, { $group: { _id: null, total: { $sum: '$paidAmount' } } }]),
                Staff.countDocuments({ isActive: true }),
                Attendance.countDocuments({ date: today, status: 'present' }),
                Ambulance.countDocuments({ status: 'available', isActive: true }),
                Patient.countDocuments({ createdAt: { $gte: today } }),
            ]);

        res.json({
            success: true,
            data: {
                totalPatients, todayTokens, newPatientsToday,
                bedOccupancy: { total: totalBeds, occupied: occupiedBeds, available: totalBeds - occupiedBeds, rate: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0 },
                activeEmergencies, pendingLabSamples, lowStockMeds,
                revenue: { monthly: monthlyRevenue[0]?.total || 0 },
                staffing: { total: totalStaff, presentToday, attendanceRate: totalStaff ? Math.round((presentToday / totalStaff) * 100) : 0 },
                ambulancesAvailable: activeAmbulances,
            },
        });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/patient-flow', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            const count = await Token.countDocuments({ date: { $gte: date, $lt: nextDay } });
            const newPatients = await Patient.countDocuments({ createdAt: { $gte: date, $lt: nextDay } });
            result.push({ date: date.toISOString().split('T')[0], tokens: count, newPatients });
        }
        res.json({ success: true, data: result });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/revenue-chart', async (req, res) => {
    try {
        const months = parseInt(req.query.months) || 6;
        const result = [];
        for (let i = months - 1; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const start = new Date(date.getFullYear(), date.getMonth(), 1);
            const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            const revenue = await Bill.aggregate([{ $match: { status: 'paid', paidDate: { $gte: start, $lte: end } } }, { $group: { _id: null, total: { $sum: '$paidAmount' } } }]);
            result.push({ month: start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), revenue: revenue[0]?.total || 0 });
        }
        res.json({ success: true, data: result });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/department-stats', async (req, res) => {
    try {
        const departments = await Token.aggregate([
            { $match: { date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } } },
            { $group: { _id: '$department', count: { $sum: 1 }, waiting: { $sum: { $cond: [{ $eq: ['$status', 'waiting'] }, 1, 0] } } } },
            { $sort: { count: -1 } },
        ]);
        res.json({ success: true, data: departments });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/predictions', async (req, res) => {
    try {
        const dayOfWeek = new Date().getDay();
        const last4Weeks = [];
        for (let i = 1; i <= 4; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i * 7);
            d.setHours(0, 0, 0, 0);
            const next = new Date(d); next.setDate(next.getDate() + 1);
            const count = await Token.countDocuments({ date: { $gte: d, $lt: next } });
            last4Weeks.push(count);
        }
        const avgLoad = Math.round(last4Weeks.reduce((a, b) => a + b, 0) / last4Weeks.length);
        const trend = last4Weeks[0] > last4Weeks[3] ? 'increasing' : last4Weeks[0] < last4Weeks[3] ? 'decreasing' : 'stable';

        res.json({
            success: true,
            data: {
                predictedPatientLoad: avgLoad,
                trend,
                recommendations: [
                    avgLoad > 50 ? 'Consider adding extra OPD consultants tomorrow' : 'Normal staffing levels should be sufficient',
                    trend === 'increasing' ? 'Patient load is trending up - prepare additional resources' : 'Patient load is stable',
                    'Ensure all critical care beds are available for emergency cases',
                ],
            },
        });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
