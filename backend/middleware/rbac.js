const ROLES = {
    ADMIN: 'admin',
    DOCTOR: 'doctor',
    NURSE: 'nurse',
    RECEPTIONIST: 'receptionist',
    LAB_TECHNICIAN: 'lab_technician',
    PHARMACIST: 'pharmacist',
    MAINTENANCE_STAFF: 'maintenance_staff',
    AMBULANCE_DRIVER: 'ambulance_driver',
    PATIENT: 'patient',
};

// Module access permissions per role
const PERMISSIONS = {
    [ROLES.ADMIN]: ['*'], // Full access
    [ROLES.DOCTOR]: ['opd', 'icu', 'ot', 'emergency', 'lab', 'pharmacy', 'transport', 'bloodbank', 'analytics', 'notifications', 'hr', 'nursing'],
    [ROLES.NURSE]: ['opd', 'icu', 'nursing', 'transport', 'emergency', 'bloodbank', 'lab', 'analytics', 'notifications'],
    [ROLES.RECEPTIONIST]: ['opd', 'billing', 'transport', 'appointments', 'analytics', 'notifications'],
    [ROLES.LAB_TECHNICIAN]: ['lab', 'bloodbank', 'analytics', 'notifications'],
    [ROLES.PHARMACIST]: ['pharmacy', 'analytics', 'notifications'],
    [ROLES.MAINTENANCE_STAFF]: ['equipment', 'laundry', 'analytics', 'notifications'],
    [ROLES.AMBULANCE_DRIVER]: ['ambulance', 'emergency', 'analytics', 'notifications'],
    [ROLES.PATIENT]: ['patient-portal'],
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }
        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role(s): ${roles.join(', ')}`,
            });
        }
        next();
    };
};

const authorizeModule = (moduleName) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }
        const userPermissions = PERMISSIONS[req.user.role] || [];
        if (userPermissions.includes('*') || userPermissions.includes(moduleName)) {
            return next();
        }
        return res.status(403).json({
            success: false,
            message: `Access denied. You do not have access to the ${moduleName} module.`,
        });
    };
};

module.exports = { ROLES, PERMISSIONS, authorize, authorizeModule };
