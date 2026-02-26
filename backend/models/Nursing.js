const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
    nurse: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    shiftType: { type: String, enum: ['morning', 'afternoon', 'night'], required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    ward: { type: String, required: true },
    status: { type: String, enum: ['scheduled', 'active', 'completed', 'swapped', 'leave'], default: 'scheduled' },
    checkIn: Date,
    checkOut: Date,
    notes: String,
}, { timestamps: true });

shiftSchema.index({ nurse: 1, date: 1 });
shiftSchema.index({ ward: 1, date: 1 });

const leaveRequestSchema = new mongoose.Schema({
    nurse: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    type: { type: String, enum: ['sick', 'casual', 'earned', 'emergency'], required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    responseDate: Date,
    responseNotes: String,
}, { timestamps: true });

const shiftSwapSchema = new mongoose.Schema({
    requestingNurse: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetNurse: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestingShift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
    targetShift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
}, { timestamps: true });

const Shift = mongoose.model('Shift', shiftSchema);
const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
const ShiftSwap = mongoose.model('ShiftSwap', shiftSwapSchema);

module.exports = { Shift, LeaveRequest, ShiftSwap };
