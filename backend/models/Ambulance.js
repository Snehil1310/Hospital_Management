const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
    vehicleNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: ['basic', 'advanced', 'cardiac', 'neonatal'], required: true },
    status: { type: String, enum: ['available', 'dispatched', 'en-route', 'at-scene', 'returning', 'maintenance'], default: 'available' },
    currentDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    equipment: [String],
    lastServiceDate: Date,
    nextServiceDate: Date,
    fuelLevel: { type: Number, min: 0, max: 100, default: 100 },
    location: {
        lat: { type: Number, default: 28.6139 },
        lng: { type: Number, default: 77.2090 },
    },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const dispatchSchema = new mongoose.Schema({
    dispatchId: { type: String, unique: true },
    ambulance: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    callerName: String,
    callerPhone: { type: String, required: true },
    pickupLocation: { address: String, lat: Number, lng: Number },
    dropLocation: { address: String, lat: Number, lng: Number },
    priority: { type: String, enum: ['normal', 'urgent', 'critical'], default: 'urgent' },
    status: { type: String, enum: ['dispatched', 'en-route', 'at-scene', 'transporting', 'completed', 'cancelled'], default: 'dispatched' },
    dispatchTime: { type: Date, default: Date.now },
    arrivalTime: Date,
    completionTime: Date,
    notes: String,
    distance: Number,
}, { timestamps: true });

dispatchSchema.pre('save', function (next) {
    if (!this.dispatchId) {
        this.dispatchId = `DSP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }
    next();
});

const driverLogSchema = new mongoose.Schema({
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ambulance: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance' },
    date: { type: Date, default: Date.now },
    shiftStart: Date,
    shiftEnd: Date,
    totalTrips: { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 },
    status: { type: String, enum: ['on-duty', 'off-duty', 'on-break'], default: 'on-duty' },
}, { timestamps: true });

const Ambulance = mongoose.model('Ambulance', ambulanceSchema);
const Dispatch = mongoose.model('Dispatch', dispatchSchema);
const DriverLog = mongoose.model('DriverLog', driverLogSchema);

module.exports = { Ambulance, Dispatch, DriverLog };
