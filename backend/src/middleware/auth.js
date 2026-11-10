const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supermarket_billing_jwt_secret_key_2026_super_secure_9876543210');

    const [rows] = await pool.query(
      `SELECT u.user_id AS id, u.full_name, u.email AS username,
              u.email, r.role_name AS role, u.is_active
       FROM users u
       LEFT JOIN roles r ON r.role_id = u.role_id
       WHERE u.user_id = ?`,
      [decoded.id]
    );
    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'User account is invalid or inactive.' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
};

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (allowedRoles.includes(req.user.role) || req.user.role === 'Admin') {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Access denied: insufficient permissions.' });
  };
};

module.exports = { verifyToken, checkRole };
