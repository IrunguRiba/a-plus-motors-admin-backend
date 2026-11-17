const ROLES = ['user', 'staff', 'salesperson', 'admin'];

const ADMIN = 'admin';
const STAFF = 'staff';
const SALESPERSON = 'salesperson';
const USER = 'user';

function isAdmin(user) {
    return !!user && user.role === ADMIN;
}

function hasRole(user, ...roles) {
    if (!user) return false;
    return roles.flat().includes(user.role);
}

function isSelf(user, targetId) {
    if (!user || !targetId) return false;
    return String(user._id) === String(targetId);
}

function normalizeRole(role, fallback = USER) {
    return ROLES.includes(role) ? role : fallback;
}

function requireAdmin(req, res, next) {
    if (isAdmin(req.user)) return next();
    return res.status(403).json({ success: false, message: 'Admin only' });
}

function requireRole(...roles) {
    const allowed = roles.flat();
    return (req, res, next) => {
        if (hasRole(req.user, allowed)) return next();
        return res.status(403).json({ success: false, message: 'Forbidden' });
    };
}

module.exports = {
    ROLES,
    ADMIN,
    STAFF,
    SALESPERSON,
    USER,
    isAdmin,
    hasRole,
    isSelf,
    normalizeRole,
    requireAdmin,
    requireRole,
};