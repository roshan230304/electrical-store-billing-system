const crypto = require('crypto');
const bwipjs = require('bwip-js');
const pool = require('../config/db');

const productFields = `
  p.product_id AS id,
  p.product_id,
  p.item_type,
  p.product_name AS name,
  p.brand,
  p.model_number,
  p.hsn_code,
  p.product_code,
  p.product_code AS item_code,
  p.barcode,
  p.category_id,
  c.category_name AS category_name,
  p.unit,
  p.purchase_price,
  p.selling_price AS sale_price,
  p.sale_price_tax_type,
  p.purchase_price_tax_type,
  p.discount_value,
  p.discount_type,
  CONCAT('GST@', COALESCE(p.gst_rate, 0), '%') AS tax_rate,
  p.gst_rate,
  p.stock_quantity AS current_stock,
  p.low_stock_limit AS min_stock_to_maintain,
  p.location,
  p.description,
  p.image_url,
  p.is_active
`;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

async function reserveProductCode(connection, productId) {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const pendingCode = `PENDING-${crypto.randomUUID()}`;
    const [reservation] = await connection.query(
      'INSERT INTO product_code_registry (code) VALUES (?)',
      [pendingCode]
    );
    const code = `ELEC-${String(reservation.insertId).padStart(6, '0')}`;

    const [existingProducts] = await connection.query(
      'SELECT product_id FROM products WHERE product_code = ? OR barcode = ? LIMIT 1',
      [code, code]
    );
    const [existingCodes] = await connection.query(
      'SELECT registry_id FROM product_code_registry WHERE code = ? AND registry_id <> ? LIMIT 1',
      [code, reservation.insertId]
    );
    if (existingProducts.length || existingCodes.length) continue;

    try {
      await connection.query(
        'UPDATE product_code_registry SET code = ?, product_id = ? WHERE registry_id = ?',
        [code, productId, reservation.insertId]
      );
      await connection.query(
        'UPDATE products SET product_code = ?, barcode = ? WHERE product_id = ?',
        [code, code, productId]
      );
      return code;
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;
    }
  }

  throw new Error('Could not reserve a unique product code after multiple attempts.');
}

exports.getItems = async (req, res, next) => {
  try {
    const { search, category, type } = req.query;
    let query = `
      SELECT ${productFields}
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.is_active = TRUE
    `;
    const params = [];

    if (search) {
      query += ` AND (
        p.product_name LIKE ? OR p.product_code LIKE ? OR p.barcode LIKE ?
        OR p.brand LIKE ? OR p.model_number LIKE ?
      )`;
      const term = `%${search}%`;
      params.push(term, term, term, term, term);
    }

    if (category) {
      query += ' AND p.category_id = ?';
      params.push(category);
    }
    if (type) {
      query += ' AND p.item_type = ?';
      params.push(type);
    }

    query += ' ORDER BY p.product_name ASC';
    const [rows] = await pool.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.getItemById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${productFields}
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.category_id
       WHERE p.product_id = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const [movements] = await pool.query(
      `SELECT movement_id AS id, movement_type, quantity,
              previous_stock AS stock_before, new_stock AS stock_after,
              reference_id, description AS notes, movement_date AS created_at
       FROM stock_movements
       WHERE product_id = ?
       ORDER BY movement_id DESC
       LIMIT 50`,
      [req.params.id]
    );
    return res.json({ success: true, data: { ...rows[0], movements } });
  } catch (err) {
    next(err);
  }
};

exports.createItem = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const {
      name,
      item_type,
      brand,
      model_number,
      hsn_code,
      unit,
      category_id,
      sale_price,
      sale_price_tax_type,
      discount_value,
      discount_type,
      purchase_price,
      purchase_price_tax_type,
      tax_rate,
      gst_rate,
      opening_quantity,
      min_stock_to_maintain,
      location,
      description,
      image_url
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Product Name is required.' });
    }

    const openingStock = toNumber(opening_quantity);
    const gst = gst_rate === undefined
      ? toNumber(String(tax_rate || '').replace(/[^0-9.]/g, ''))
      : toNumber(gst_rate);

    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO products (
        product_name, brand, model_number, hsn_code, category_id, unit,
        purchase_price, purchase_price_tax_type, selling_price,
        sale_price_tax_type, discount_value, discount_type, gst_rate,
        stock_quantity, low_stock_limit, location, description, image_url, is_active, item_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)` ,
      [
        name.trim(),
        brand?.trim() || null,
        model_number?.trim() || null,
        hsn_code || null,
        category_id || null,
        unit || 'Piece',
        toNumber(purchase_price),
        purchase_price_tax_type || 'With Tax',
        toNumber(sale_price),
        sale_price_tax_type || 'With Tax',
        toNumber(discount_value),
        discount_type || 'Percentage',
        gst,
        openingStock,
        toNumber(min_stock_to_maintain, 5),
        location || null,
        description || null,
        image_url || null,
        item_type === 'Service' ? 'Service' : 'Product'
      ]
    );

    const productId = result.insertId;
    await reserveProductCode(connection, productId);

    if (openingStock !== 0) {
      await connection.query(
        `INSERT INTO stock_movements (
          product_id, movement_type, quantity, previous_stock, new_stock, description
        ) VALUES (?, 'Adjustment', ?, 0, ?, 'Opening stock')`,
        [productId, openingStock, openingStock]
      );
    }

    await connection.commit();
    const [newItem] = await pool.query(
      `SELECT ${productFields}
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.category_id
       WHERE p.product_id = ?`,
      [productId]
    );
    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: newItem[0]
    });
  } catch (err) {
    if (connection) await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    const {
      name,
      item_type,
      brand,
      model_number,
      hsn_code,
      unit,
      category_id,
      sale_price,
      sale_price_tax_type,
      discount_value,
      discount_type,
      purchase_price,
      purchase_price_tax_type,
      tax_rate,
      gst_rate,
      min_stock_to_maintain,
      location,
      description,
      image_url
    } = req.body;
    const gst = gst_rate === undefined
      ? toNumber(String(tax_rate || '').replace(/[^0-9.]/g, ''))
      : toNumber(gst_rate);

    const [result] = await pool.query(
      `UPDATE products SET
        product_name = ?, brand = ?, model_number = ?, hsn_code = ?, unit = ?,
        category_id = ?, selling_price = ?, sale_price_tax_type = ?, discount_value = ?,
        discount_type = ?, purchase_price = ?, purchase_price_tax_type = ?,
        gst_rate = ?, low_stock_limit = ?, location = ?, description = ?, image_url = ?, item_type = ?
       WHERE product_id = ?`,
      [
        name?.trim(),
        brand?.trim() || null,
        model_number?.trim() || null,
        hsn_code || null,
        unit || 'Piece',
        category_id || null,
        toNumber(sale_price),
        sale_price_tax_type || 'With Tax',
        toNumber(discount_value),
        discount_type || 'Percentage',
        toNumber(purchase_price),
        purchase_price_tax_type || 'With Tax',
        gst,
        toNumber(min_stock_to_maintain, 5),
        location || null,
        description || null,
        image_url || null,
        item_type === 'Service' ? 'Service' : 'Product',
        req.params.id
      ]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const [updated] = await pool.query(
      `SELECT ${productFields}
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.category_id
       WHERE p.product_id = ?`,
      [req.params.id]
    );
    return res.json({ success: true, message: 'Item updated successfully', data: updated[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteItem = async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'UPDATE products SET is_active = FALSE WHERE product_id = ? AND is_active = TRUE',
      [req.params.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Active product not found.' });
    }
    return res.json({ success: true, message: 'Product deactivated successfully.' });
  } catch (err) {
    next(err);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT category_id AS id, category_name AS name, description FROM categories ORDER BY category_name ASC'
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category Name is required.' });
    }
    const [result] = await pool.query(
      'INSERT INTO categories (category_name, description) VALUES (?, ?)',
      [name.trim(), description || null]
    );
    const [newCategory] = await pool.query(
      'SELECT category_id AS id, category_name AS name, description FROM categories WHERE category_id = ?',
      [result.insertId]
    );
    return res.status(201).json({ success: true, data: newCategory[0] });
  } catch (err) {
    next(err);
  }
};

exports.getUnits = async (req, res) => {
  return res.json({
    success: true,
    data: [
      { short_name: 'Piece', full_name: 'Piece' },
      { short_name: 'Meter', full_name: 'Meter' },
      { short_name: 'Roll', full_name: 'Roll' },
      { short_name: 'Box', full_name: 'Box' },
      { short_name: 'Bundle', full_name: 'Bundle' },
      { short_name: 'Set', full_name: 'Set' }
    ]
  });
};

exports.getBarcodeSvg = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT product_code, barcode
       FROM products
       WHERE product_id = ?`,
      [req.params.id]
    );
    if (!rows.length || !rows[0].product_code || !rows[0].barcode) {
      return res.status(404).json({ success: false, message: 'Product barcode not found.' });
    }

    const svg = bwipjs.toSVG({
      bcid: 'code128',
      text: rows[0].barcode,
      scale: 2,
      height: 12,
      includetext: true,
      textxalign: 'center',
      paddingwidth: 4,
      paddingheight: 3
    });
    res.type('image/svg+xml').set('Cache-Control', 'no-store').send(svg);
  } catch (err) {
    next(err);
  }
};

exports.getProductByBarcode = async (req, res, next) => {
  try {
    const barcode = (req.params.barcode || req.query.barcode || '').trim();
    if (!barcode) {
      return res.status(400).json({ success: false, message: 'Barcode/Product code is required.' });
    }

    const [rows] = await pool.query(
      `SELECT ${productFields}
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.category_id
       WHERE (p.barcode = ? OR p.product_code = ?) AND p.is_active = TRUE
       LIMIT 1`,
      [barcode, barcode]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: `Product not found for barcode '${barcode}'.` });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.getNextProductCode = async (req, res, next) => {
  try {
    const [maxRow] = await pool.query(
      'SELECT COALESCE(MAX(registry_id), 0) + 1 AS next_id FROM product_code_registry'
    );
    const nextId = maxRow[0].next_id;
    const nextCode = 'ELEC-' + String(nextId).padStart(6, '0');
    return res.json({ success: true, next_code: nextCode });
  } catch (err) {
    next(err);
  }
};
