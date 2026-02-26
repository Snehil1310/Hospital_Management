const mongoose = require('mongoose');

const triageCaseSchema = new mongoose.Schema({
    caseId: { type: String, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    triageNurse: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['critical', 'urgent', 'semi-urgent', 'normal'], required: true },
    chiefComplaint: { type: String, required: true },
    vitals: {
        bloodPressure: String,
        heartRate: Number,
        temperature: Number,
        oxygenSaturation: Number,
        respiratoryRate: Number,
    },
    symptoms: [String],
    arrivalMode: { type: String, enum: ['walk-in', 'ambulance', 'referral', 'police'], default: 'walk-in' },
    status: { type: String, enum: ['waiting', 'in-treatment', 'admitted', 'discharged', 'transferred', 'deceased'], default: 'waiting' },
    arrivalTime: { type: Date, default: Date.now },
    treatmentStartTime: Date,
    dispositionTime: Date,
    disposition: { type: String, enum: ['admit', 'discharge', 'transfer', 'observation', 'surgery'] },
    notes: String,
    alerts: [{
        message: String,
        sentTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        sentAt: { type: Date, default: Date.now },
        acknowledged: { type: Boolean, default: false },
    }],
}, { timestamps: true });

triageCaseSchema.pre('save', function (next) {
    if (!this.caseId) {
        this.caseId = `ER-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }
    next();
});

triageCaseSchema.index({ priority: 1, status: 1 });

module.exports = mongoose.model('TriageCase', triageCaseSchema);
