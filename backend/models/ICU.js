const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema({
    bedNumber: { type: String, required: true, unique: true },
    ward: { type: String, required: true, enum: ['ICU', 'General', 'Pediatric', 'Maternity', 'Surgical', 'Emergency', 'Private'] },
    floor: { type: Number, required: true },
    type: { type: String, enum: ['standard', 'electric', 'ICU', 'bariatric', 'pediatric'], default: 'standard' },
    status: { type: String, enum: ['available', 'occupied', 'maintenance', 'reserved'], default: 'available' },
    currentPatient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    equipment: [String],
    dailyRate: { type: Number, default: 0 },
}, { timestamps: true });

bedSchema.index({ ward: 1, status: 1 });

const bedAllocationSchema = new mongoose.Schema({
    bed: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed', required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    admittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    admissionDate: { type: Date, default: Date.now },
    dischargeDate: Date,
    severity: { type: String, enum: ['critical', 'serious', 'stable', 'recovering'], required: true },
    diagnosis: String,
    notes: String,
    status: { type: String, enum: ['active', 'discharged', 'transferred'], default: 'active' },
    transferHistory: [{
        fromBed: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed' },
        toBed: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed' },
        reason: String,
        transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        date: { type: Date, default: Date.now },
    }],
}, { timestamps: true });

bedAllocationSchema.index({ status: 1 });

const Bed = mongoose.model('Bed', bedSchema);
const BedAllocation = mongoose.model('BedAllocation', bedAllocationSchema);

module.exports = { Bed, BedAllocation };
