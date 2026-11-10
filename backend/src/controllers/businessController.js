const pool = require('../config/db');

const profileFields = `
  setting_id AS id,
  store_name AS business_name,
  phone AS phone_number,
  gst_number AS gstin,
  email,
  address AS business_address,
  currency
`;

exports.getProfile = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${profileFields}
       FROM store_settings
       ORDER BY setting_id
       LIMIT 1`
    );
    return res.json({
      success: true,
      data: rows[0] || {
        business_name: 'Electrical Store',
        phone_number: null,
        gstin: null,
        email: null,
        business_address: null,
        currency: 'INR'
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const {
      business_name,
      store_name,
      phone_number,
      gstin,
      email,
      business_address,
      address,
      currency
    } = req.body;
    const name = store_name || business_name;
    const storeAddress = address || business_address || null;

    await connection.beginTransaction();
    const [existing] = await connection.query(
      'SELECT setting_id FROM store_settings ORDER BY setting_id LIMIT 1 FOR UPDATE'
    );
    if (existing.length) {
      await connection.query(
        `UPDATE store_settings
         SET store_name = ?, phone = ?, gst_number = ?, email = ?, address = ?, currency = ?
         WHERE setting_id = ?`,
        [
          name || null,
          phone_number || null,
          gstin || null,
          email || null,
          storeAddress,
          currency || 'INR',
          existing[0].setting_id
        ]
      );
    } else {
      await connection.query(
        `INSERT INTO store_settings (store_name, phone, gst_number, email, address, currency)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          name || null,
          phone_number || null,
          gstin || null,
          email || null,
          storeAddress,
          currency || 'INR'
        ]
      );
    }

    await connection.commit();
    const [updated] = await pool.query(
      `SELECT ${profileFields}
       FROM store_settings
       ORDER BY setting_id
       LIMIT 1`
    );
    return res.json({
      success: true,
      message: 'Business profile updated successfully',
      data: updated[0]
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};
