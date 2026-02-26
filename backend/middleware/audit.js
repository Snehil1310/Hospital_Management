const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userRole: String,
    action: { type: String, required: true },
    module: { type: String, required: true },
    resourceType: String,
    resourceId: mongoose.Schema.Types.ObjectId,
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    timestamp: { type: Date, default: Date.now },
});

auditLogSchema.index({ module: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

const auditAction = (module) => {
    return (req, res, next) => {
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 300 && req.method !== 'GET') {
                AuditLog.create({
                    userId: req.user?._id,
                    userRole: req.user?.role,
                    action: `${req.method} ${req.originalUrl}`,
                    module,
                    resourceType: req.baseUrl?.split('/').pop(),
                    resourceId: req.params?.id || body?.data?._id,
                    details: { method: req.method, statusCode: res.statusCode },
                    ipAddress: req.ip,
                }).catch((err) => console.error('Audit log error:', err));
            }
            return originalJson(body);
        };
        next();
    };
};

module.exports = { auditAction, AuditLog };
