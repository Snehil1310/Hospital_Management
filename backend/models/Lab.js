const mongoose = require('mongoose');

const labSampleSchema = new mongoose.Schema({
    sampleId: { type: String, unique: true },
    barcode: { type: String, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    testType: { type: String, required: true },
    category: { type: String, enum: ['blood', 'urine', 'stool', 'tissue', 'swab', 'other'], required: true },
    priority: { type: String, enum: ['routine', 'urgent', 'stat'], default: 'routine' },
    status: {
        type: String,
        enum: ['ordered', 'collected', 'in-transit', 'processing', 'completed', 'report-ready', 'delivered'],
        default: 'ordered',
    },
    collectionDate: Date,
    processingDate: Date,
    completionDate: Date,
    result: { type: String },
    resultValues: mongoose.Schema.Types.Mixed,
    normalRange: String,
    notes: String,
    reportUrl: String,
}, { timestamps: true });

labSampleSchema.pre('save', function (next) {
    if (!this.sampleId) {
        this.sampleId = `LAB-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }
    if (!this.barcode) {
        this.barcode = `BC${Date.now()}${Math.floor(Math.random() * 1000)}`;
    }
    next();
});

labSampleSchema.index({ status: 1 });
labSampleSchema.index({ patient: 1 });
labSampleSchema.index({ barcode: 1 });

module.exports = mongoose.model('LabSample', labSampleSchema);
