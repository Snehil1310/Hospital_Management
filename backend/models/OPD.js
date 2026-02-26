const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    patientId: { type: String, unique: true, required: true },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    phone: { type: String, required: true },
    email: { type: String, trim: true },
    address: { street: String, city: String, state: String, zip: String },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    emergencyContact: { name: String, phone: String, relation: String },
    medicalHistory: [{ condition: String, diagnosedDate: Date, notes: String }],
    allergies: [String],
    insuranceInfo: { provider: String, policyNumber: String, validTill: Date },
    isActive: { type: Boolean, default: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

patientSchema.index({ name: 'text', patientId: 'text', phone: 'text' });

const tokenSchema = new mongoose.Schema({
    tokenNumber: { type: Number, required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, required: true },
    type: { type: String, enum: ['walk-in', 'appointment'], default: 'walk-in' },
    priority: { type: String, enum: ['normal', 'urgent', 'emergency'], default: 'normal' },
    status: { type: String, enum: ['waiting', 'in-consultation', 'completed', 'cancelled', 'no-show'], default: 'waiting' },
    estimatedWaitTime: { type: Number, default: 0 },
    checkInTime: { type: Date, default: Date.now },
    consultationStartTime: Date,
    consultationEndTime: Date,
    notes: String,
    date: { type: Date, default: () => new Date().setHours(0, 0, 0, 0) },
}, { timestamps: true });

tokenSchema.index({ date: 1, doctor: 1 });
tokenSchema.index({ status: 1 });

const appointmentSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, required: true },
    date: { type: Date, required: true },
    timeSlot: { start: String, end: String },
    type: { type: String, enum: ['online', 'walk-in'], default: 'online' },
    status: { type: String, enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'], default: 'scheduled' },
    reason: String,
    notes: String,
}, { timestamps: true });

appointmentSchema.index({ doctor: 1, date: 1 });

const Patient = mongoose.model('Patient', patientSchema);
const Token = mongoose.model('Token', tokenSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = { Patient, Token, Appointment };
