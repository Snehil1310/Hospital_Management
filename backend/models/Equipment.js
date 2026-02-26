const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
    equipmentId: { type: String, unique: true },
    name: { type: String, required: true },
    category: { type: String, enum: ['diagnostic', 'therapeutic', 'monitoring', 'surgical', 'lab', 'support', 'imaging'], required: true },
    manufacturer: String,
    model: String,
    serialNumber: { type: String, unique: true },
    location: { department: String, room: String, floor: Number },
    purchaseDate: Date,
    warrantyExpiry: Date,
    status: { type: String, enum: ['operational', 'maintenance', 'faulty', 'decommissioned'], default: 'operational' },
    lastMaintenanceDate: Date,
    nextMaintenanceDate: Date,
    maintenanceCycle: { type: Number, default: 90 }, // days
    cost: Number,
}, { timestamps: true });

equipmentSchema.pre('save', function (next) {
    if (!this.equipmentId) {
        this.equipmentId = `EQ-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }
    next();
});

const maintenanceTicketSchema = new mongoose.Schema({
    ticketId: { type: String, unique: true },
    equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['preventive', 'corrective', 'emergency', 'calibration'], required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    description: { type: String, required: true },
    status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed', 'escalated'], default: 'open' },
    resolution: String,
    cost: Number,
    reportedDate: { type: Date, default: Date.now },
    resolvedDate: Date,
}, { timestamps: true });

maintenanceTicketSchema.pre('save', function (next) {
    if (!this.ticketId) {
        this.ticketId = `MT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }
    next();
});

const Equipment = mongoose.model('Equipment', equipmentSchema);
const MaintenanceTicket = mongoose.model('MaintenanceTicket', maintenanceTicketSchema);

module.exports = { Equipment, MaintenanceTicket };
