const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const userFields = `
  u.user_id AS id,
  u.full_name,
  u.email AS username,
  u.email,
  u.password AS password_hash,
  u.is_active,
  r.role_name AS role
`;
const initialAdminLockName = 'electrical_store_initial_admin_setup';

async function getBusinessProfile() {
  const [rows] = await pool.query(
    `SELECT store_name AS business_name, phone AS phone_number,
            gst_number AS gstin, email, address AS business_address, currency
     FROM store_settings
     ORDER BY setting_id
     LIMIT 1`
  );
  return rows[0] || { business_name: 'Electrical Store' };
}

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Email/username and password are required.' });
    }

    const [users] = await pool.query(
      `SELECT ${userFields}
       FROM users u
       LEFT JOIN roles r ON r.role_id = u.role_id
       WHERE u.email = ? OR u.full_name = ?
       LIMIT 1`,
      [username.trim(), username.trim()]
    );
    if (!users.length) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact administrator.' });
    }
    if (!await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'supermarket_billing_jwt_secret_key_2026_super_secure_9876543210',
      { expiresIn: '7d' }
    );
    const business = await getBusinessProfile();

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        role: user.role,
        viewAccess: 'All Transactions',
        permissions: [],
        business
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getSetupStatus = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT EXISTS(SELECT 1 FROM users LIMIT 1) AS has_users');
    return res.json({ success: true, setupRequired: !Boolean(rows[0].has_users) });
  } catch (err) {
    next(err);
  }
};

exports.createInitialAdmin = async (req, res, next) => {
  const { full_name, email, password } = req.body;
  const normalizedName = typeof full_name === 'string' ? full_name.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedName || normalizedName.length > 150) {
    return res.status(400).json({ success: false, message: 'Enter an administrator name (up to 150 characters).' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 150) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    return res.status(400).json({ success: false, message: 'Choose a password between 12 and 128 characters.' });
  }

  const connection = await pool.getConnection();
  let lockAcquired = false;
  try {
    const [locks] = await connection.query('SELECT GET_LOCK(?, 10) AS acquired', [initialAdminLockName]);
    lockAcquired = Number(locks[0].acquired) === 1;
    if (!lockAcquired) {
      return res.status(503).json({ success: false, message: 'Administrator setup is busy. Please try again.' });
    }

    const [users] = await connection.query('SELECT COUNT(*) AS user_count FROM users');
    if (Number(users[0].user_count) > 0) {
      return res.status(409).json({ success: false, message: 'Initial setup is already complete. Sign in instead.' });
    }

    const [roles] = await connection.query('SELECT role_id FROM roles WHERE role_name = ? LIMIT 1', ['Admin']);
    if (!roles.length) {
      throw new Error('Cannot create the initial administrator because the Admin role is missing.');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await connection.query(
      `INSERT INTO users (full_name, email, password, role_id, is_active)
       VALUES (?, ?, ?, ?, TRUE)`,
      [normalizedName, normalizedEmail, passwordHash, roles[0].role_id]
    );

    return res.status(201).json({
      success: true,
      message: 'Administrator account created. Sign in with your new credentials.'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'An account with that email already exists.' });
    }
    return next(err);
  } finally {
    if (lockAcquired) {
      try {
        await connection.query('SELECT RELEASE_LOCK(?)', [initialAdminLockName]);
      } catch (err) {
        console.error('[AUTH] Could not release initial administrator setup lock:', err.message);
      }
    }
    connection.release();
  }
};

exports.getMe = async (req, res, next) => {
  try {
    return res.json({
      success: true,
      user: {
        id: req.user.id,
        fullName: req.user.full_name,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        viewAccess: 'All Transactions',
        permissions: [],
        business: await getBusinessProfile()
      }
    });
  } catch (err) {
    next(err);
  }
};
