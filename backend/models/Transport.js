const mongoose = require('mongoose');

const transportRequestSchema = new mongoose.Schema({
    requestId: { type: String, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['wheelchair', 'stretcher', 'walking-assist', 'bed-transfer'], required: true },
    priority: { type: String, enum: ['normal', 'urgent', 'emergency'], default: 'normal' },
    fromLocation: { type: String, required: true },
    toLocation: { type: String, required: true },
    status: { type: String, enum: ['pending', 'assigned', 'in-transit', 'completed', 'cancelled'], default: 'pending' },
    requestedTime: { type: Date, default: Date.now },
    assignedTime: Date,
    startTime: Date,
    completionTime: Date,
    notes: String,
}, { timestamps: true });

transportRequestSchema.index({ status: 1 });
transportRequestSchema.pre('save', function (next) {
    if (!this.requestId) {
        this.requestId = `TR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }
    next();
});

module.exports = mongoose.model('TransportRequest', transportRequestSchema);
