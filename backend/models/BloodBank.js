const mongoose = require('mongoose');

const bloodUnitSchema = new mongoose.Schema({
    unitId: { type: String, unique: true },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
    component: { type: String, enum: ['whole-blood', 'rbc', 'plasma', 'platelets', 'cryoprecipitate'], default: 'whole-blood' },
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
    collectionDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    status: { type: String, enum: ['available', 'reserved', 'issued', 'expired', 'discarded', 'testing'], default: 'testing' },
    testResults: { hiv: Boolean, hepatitisB: Boolean, hepatitisC: Boolean, syphilis: Boolean, malaria: Boolean, allClear: Boolean },
    volume: { type: Number, default: 450 }, // ml
    storageLocation: String,
}, { timestamps: true });

bloodUnitSchema.pre('save', function (next) {
    if (!this.unitId) this.unitId = `BU-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    next();
});

bloodUnitSchema.index({ bloodGroup: 1, status: 1 });

const donorSchema = new mongoose.Schema({
    donorId: { type: String, unique: true },
    name: { type: String, required: true },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
    age: Number,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    phone: { type: String, required: true },
    email: String,
    address: String,
    lastDonationDate: Date,
    totalDonations: { type: Number, default: 0 },
    isEligible: { type: Boolean, default: true },
    medicalHistory: String,
}, { timestamps: true });

donorSchema.pre('save', function (next) {
    if (!this.donorId) this.donorId = `DN-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    next();
});

const bloodRequestSchema = new mongoose.Schema({
    requestId: { type: String, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], required: true },
    component: { type: String, enum: ['whole-blood', 'rbc', 'plasma', 'platelets', 'cryoprecipitate'], default: 'whole-blood' },
    unitsRequired: { type: Number, required: true },
    unitsIssued: { type: Number, default: 0 },
    priority: { type: String, enum: ['routine', 'urgent', 'emergency'], default: 'routine' },
    status: { type: String, enum: ['pending', 'approved', 'partially-fulfilled', 'fulfilled', 'rejected', 'cancelled'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    bloodUnits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BloodUnit' }],
}, { timestamps: true });

bloodRequestSchema.pre('save', function (next) {
    if (!this.requestId) this.requestId = `BR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    next();
});

const BloodUnit = mongoose.model('BloodUnit', bloodUnitSchema);
const Donor = mongoose.model('Donor', donorSchema);
const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema);

module.exports = { BloodUnit, Donor, BloodRequest };
