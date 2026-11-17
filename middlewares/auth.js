const jwt = require('jsonwebtoken');
const Users = require('../src/models/user');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn('[auth] JWT_SECRET is not set — tokens will not verify.');
}

function signToken(user, expiresIn = '7d') {
  return jwt.sign(
    {
      _id: String(user._id),
      role: user.role,
      yard: user.yard,
      userName: user.userName,
    },
    JWT_SECRET,
    { expiresIn },
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.cookies?.token) return req.cookies.token;
  return null;
}

async function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ success: false, message });
  }
  try {
    const user = await Users.findById(payload._id).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }
    if (!user.active) {
      return res.status(401).json({ success: false, message: 'Account disabled' });
    }
    req.user = {
      _id: String(user._id),
      role: user.role,
      yard: user.yard,
      userName: user.userName,
    };
  } catch (err) {
    console.error('[requireAuth] DB check failed:', err);
    return res.status(401).json({ success: false, message: 'Auth check failed' });
  }

  return next();
}

function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    req.user = verifyToken(token);
  } catch {
    req.user = undefined;
  }
  return next();
}

module.exports = { signToken, verifyToken, requireAuth, optionalAuth };