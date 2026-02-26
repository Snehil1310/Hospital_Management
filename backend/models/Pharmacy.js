const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    genericName: { type: String, trim: true },
    category: { type: String, enum: ['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'inhaler', 'other'], required: true },
    manufacturer: String,
    batchNumber: String,
    barcode: String,
    quantity: { type: Number, required: true, default: 0 },
    minStockLevel: { type: Number, default: 10 },
    unitPrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    expiryDate: { type: Date, required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    location: { shelf: String, rack: String },
    requiresPrescription: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

medicineSchema.index({ name: 'text', genericName: 'text' });
medicineSchema.index({ expiryDate: 1 });

const supplierSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    contactPerson: String,
    email: { type: String, trim: true },
    phone: { type: String, required: true },
    address: String,
    gstNumber: String,
    medicines: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' }],
    rating: { type: Number, min: 1, max: 5, default: 3 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

const prescriptionSchema = new mongoose.Schema({
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    medicines: [{
        medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
        medicineName: String,
        dosage: String,
        frequency: String,
        duration: String,
        quantity: Number,
        dispensed: { type: Boolean, default: false },
    }],
    status: { type: String, enum: ['pending', 'partially-dispensed', 'dispensed', 'cancelled'], default: 'pending' },
    dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dispensedDate: Date,
    notes: String,
}, { timestamps: true });

const Medicine = mongoose.model('Medicine', medicineSchema);
const Supplier = mongoose.model('Supplier', supplierSchema);
const Prescription = mongoose.model('Prescription', prescriptionSchema);

module.exports = { Medicine, Supplier, Prescription };
