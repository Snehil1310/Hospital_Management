const mongoose = require('mongoose');

const surgerySchema = new mongoose.Schema({
    surgeryId: { type: String, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    leadSurgeon: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assistingSurgeons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    anesthetist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'OperatingTheatre', required: true },
    procedureName: { type: String, required: true },
    procedureType: { type: String, enum: ['elective', 'emergency', 'day-case'], required: true },
    scheduledDate: { type: Date, required: true },
    startTime: String,
    endTime: String,
    estimatedDuration: { type: Number, required: true }, // minutes
    actualDuration: Number,
    status: { type: String, enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'postponed'], default: 'scheduled' },
    equipmentNeeded: [String],
    preOpNotes: String,
    postOpNotes: String,
    complications: String,
    isEmergencyOverride: { type: Boolean, default: false },
}, { timestamps: true });

surgerySchema.pre('save', function (next) {
    if (!this.surgeryId) {
        this.surgeryId = `SUR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }
    next();
});

surgerySchema.index({ scheduledDate: 1, theatre: 1 });

const operatingTheatreSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    number: { type: Number, required: true },
    floor: { type: Number, required: true },
    type: { type: String, enum: ['general', 'cardiac', 'neuro', 'ortho', 'ophthalmic', 'emergency'], required: true },
    status: { type: String, enum: ['available', 'in-use', 'maintenance', 'cleaning'], default: 'available' },
    equipment: [String],
    capacity: String,
}, { timestamps: true });

const Surgery = mongoose.model('Surgery', surgerySchema);
const OperatingTheatre = mongoose.model('OperatingTheatre', operatingTheatreSchema);

module.exports = { Surgery, OperatingTheatre };
