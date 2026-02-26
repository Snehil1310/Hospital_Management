const mongoose = require('mongoose');

const linenSchema = new mongoose.Schema({
    linenId: { type: String, unique: true },
    type: { type: String, enum: ['bedsheet', 'pillow-cover', 'blanket', 'towel', 'gown', 'curtain', 'other'], required: true },
    ward: String,
    status: { type: String, enum: ['clean', 'in-use', 'soiled', 'washing', 'damaged', 'discarded'], default: 'clean' },
    lastWashed: Date,
    assignedTo: String,
    condition: { type: String, enum: ['good', 'fair', 'poor'], default: 'good' },
}, { timestamps: true });

linenSchema.pre('save', function (next) {
    if (!this.linenId) this.linenId = `LN-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    next();
});

const sanitationTaskSchema = new mongoose.Schema({
    taskId: { type: String, unique: true },
    area: { type: String, required: true },
    floor: Number,
    type: { type: String, enum: ['routine', 'deep-clean', 'emergency', 'terminal'], required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scheduledTime: Date,
    completedTime: Date,
    status: { type: String, enum: ['pending', 'in-progress', 'completed', 'verified', 'overdue'], default: 'pending' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    notes: String,
    checklist: [{ item: String, completed: { type: Boolean, default: false } }],
}, { timestamps: true });

sanitationTaskSchema.pre('save', function (next) {
    if (!this.taskId) this.taskId = `SAN-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    next();
});

const Linen = mongoose.model('Linen', linenSchema);
const SanitationTask = mongoose.model('SanitationTask', sanitationTaskSchema);

module.exports = { Linen, SanitationTask };
