const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
        type: String,
        enum: ['alert', 'info', 'warning', 'success', 'task', 'system'],
        default: 'info',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    module: String,
    resourceType: String,
    resourceId: mongoose.Schema.Types.ObjectId,
    isRead: { type: Boolean, default: false },
    readAt: Date,
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
