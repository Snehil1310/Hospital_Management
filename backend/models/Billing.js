const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    billNumber: { type: String, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{
        description: String,
        category: { type: String, enum: ['consultation', 'procedure', 'medicine', 'lab', 'bed', 'surgery', 'other'] },
        quantity: { type: Number, default: 1 },
        unitPrice: Number,
        total: Number,
    }],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'generated', 'sent', 'partially-paid', 'paid', 'overdue', 'cancelled'], default: 'draft' },
    paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'insurance', 'cheque', 'online'] },
    dueDate: Date,
    paidDate: Date,
    notes: String,
}, { timestamps: true });

billSchema.pre('save', function (next) {
    if (!this.billNumber) {
        this.billNumber = `BILL-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }
    this.dueAmount = this.totalAmount - this.paidAmount;
    next();
});

const insuranceClaimSchema = new mongoose.Schema({
    claimId: { type: String, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    bill: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill', required: true },
    insuranceProvider: { type: String, required: true },
    policyNumber: { type: String, required: true },
    claimAmount: { type: Number, required: true },
    approvedAmount: Number,
    status: { type: String, enum: ['submitted', 'under-review', 'approved', 'partially-approved', 'rejected', 'settled'], default: 'submitted' },
    submissionDate: { type: Date, default: Date.now },
    responseDate: Date,
    documents: [String],
    remarks: String,
}, { timestamps: true });

insuranceClaimSchema.pre('save', function (next) {
    if (!this.claimId) {
        this.claimId = `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }
    next();
});

const Bill = mongoose.model('Bill', billSchema);
const InsuranceClaim = mongoose.model('InsuranceClaim', insuranceClaimSchema);

module.exports = { Bill, InsuranceClaim };
