const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: String, unique: true, required: true },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    joiningDate: { type: Date, required: true },
    salary: { basic: Number, hra: Number, allowances: Number, deductions: Number, net: Number },
    bankDetails: { accountNumber: String, ifscCode: String, bankName: String },
    documents: [{ type: String, url: String }],
    emergencyContact: { name: String, phone: String, relation: String },
    address: { street: String, city: String, state: String, zip: String },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const attendanceSchema = new mongoose.Schema({
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    checkIn: Date,
    checkOut: Date,
    status: { type: String, enum: ['present', 'absent', 'half-day', 'late', 'on-leave', 'holiday'], default: 'present' },
    workHours: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    biometricId: String,
    notes: String,
}, { timestamps: true });

attendanceSchema.index({ staff: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

const payrollSchema = new mongoose.Schema({
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    workingDays: Number,
    presentDays: Number,
    basicSalary: Number,
    overtime: Number,
    deductions: Number,
    netSalary: Number,
    status: { type: String, enum: ['pending', 'processed', 'paid'], default: 'pending' },
    paidDate: Date,
}, { timestamps: true });

payrollSchema.index({ staff: 1, month: 1, year: 1 }, { unique: true });

const Staff = mongoose.model('Staff', staffSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Payroll = mongoose.model('Payroll', payrollSchema);

module.exports = { Staff, Attendance, Payroll };
