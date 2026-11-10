const bcrypt = require('bcryptjs');
const pool = require('../config/db');

exports.getUsers = async (req, res, next) => {
  try {
    const [users] = await pool.query(
      `SELECT u.user_id AS id, u.user_id, u.full_name, u.email AS username, u.email,
              COALESCE(r.role_name, 'Admin') AS role,
              'All Transactions' AS view_access,
              u.is_active, u.created_at
       FROM users u
       LEFT JOIN roles r ON r.role_id = u.role_id
       ORDER BY u.user_id ASC`
    );
    const [roles] = await pool.query('SELECT role_id AS id, role_name AS name FROM roles');
    return res.json({ success: true, data: users, roles });
  } catch (err) {
    next(err);
  }
};

exports.getPermissionsMatrix = async (req, res, next) => {
  try {
    const { role } = req.query;
    let query = 'SELECT * FROM permissions';
    const params = [];
    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }
    const [rows] = await pool.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { full_name, phone_or_email, user_role, view_access, password } = req.body;

    if (!full_name || !user_role) {
      return res.status(400).json({ success: false, message: 'Full Name and User Role are required.' });
    }

    // Resolve role_id from role name
    const [roleRows] = await pool.query('SELECT role_id FROM roles WHERE role_name = ? LIMIT 1', [user_role]);
    if (!roleRows.length) {
      return res.status(400).json({ success: false, message: `Role "${user_role}" does not exist.` });
    }
    const roleId = roleRows[0].role_id;

    const isEmail = (phone_or_email || '').includes('@');
    const email = isEmail ? phone_or_email : (null);

    // Default password 'biller123' or provided
    const pass = password || 'biller123';
    const passwordHash = await bcrypt.hash(pass, 10);

    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, password, role_id, is_active)
       VALUES (?, ?, ?, ?, TRUE)`,
      [full_name.trim(), email, passwordHash, roleId]
    );

    const [newUser] = await pool.query(
      `SELECT u.user_id AS id, u.user_id, u.full_name, u.email AS username, u.email,
              COALESCE(r.role_name, 'Admin') AS role,
              'All Transactions' AS view_access,
              u.is_active, u.created_at
       FROM users u
       LEFT JOIN roles r ON r.role_id = u.role_id
       WHERE u.user_id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: `User ${full_name} added successfully with role ${user_role}.`,
      data: newUser[0]
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    }
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (parseInt(id, 10) === 1) {
      return res.status(400).json({ success: false, message: 'Cannot delete primary administrator account.' });
    }
    await pool.query('DELETE FROM users WHERE user_id = ?', [id]);
    return res.json({ success: true, message: 'User removed successfully.' });
  } catch (err) {
    next(err);
  }
};

