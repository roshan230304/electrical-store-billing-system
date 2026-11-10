const pool = require('../config/db');

const round2 = num => Math.round((Number(num) + Number.EPSILON) * 100) / 100;
const receivedBySale = `
  SELECT sale_id, SUM(amount) AS received
  FROM payments
  WHERE sale_id IS NOT NULL
  GROUP BY sale_id
`;
const paidByPurchase = `
  SELECT purchase_id, SUM(amount) AS paid
  FROM payments
  WHERE purchase_id IS NOT NULL
  GROUP BY purchase_id
`;

exports.getDashboardStats = async (req, res, next) => {
  try {
    const [salesToday] = await pool.query(
      `SELECT COALESCE(SUM(grand_total), 0) AS total, COUNT(*) AS bill_count
       FROM sales
       WHERE DATE(sale_date) = CURRENT_DATE()`
    );
    const [salesMonth] = await pool.query(
      `SELECT COALESCE(SUM(grand_total), 0) AS total_sales_month, COUNT(*) AS total_bills
       FROM sales
       WHERE MONTH(sale_date) = MONTH(CURRENT_DATE())
         AND YEAR(sale_date) = YEAR(CURRENT_DATE())`
    );
    const [receivable] = await pool.query(
      `SELECT COALESCE(SUM(GREATEST(0, s.grand_total - COALESCE(p.received, 0))), 0) AS total
       FROM sales s
       LEFT JOIN (${receivedBySale}) p ON p.sale_id = s.sale_id`
    );
    const [payable] = await pool.query(
      `SELECT COALESCE(SUM(GREATEST(0, p.grand_total - COALESCE(payments.paid, 0))), 0) AS total
       FROM purchases p
       LEFT JOIN (${paidByPurchase}) payments ON payments.purchase_id = p.purchase_id`
    );
    const [products] = await pool.query(
      `SELECT COUNT(*) AS total_products,
              COALESCE(SUM(CASE WHEN stock_quantity <= 0 THEN 1 ELSE 0 END), 0) AS out_of_stock,
              COALESCE(SUM(CASE WHEN stock_quantity > 0 AND stock_quantity <= low_stock_limit THEN 1 ELSE 0 END), 0) AS low_stock,
              COALESCE(SUM(stock_quantity * purchase_price), 0) AS stock_valuation
       FROM products
       WHERE is_active = TRUE AND item_type = 'Product'`
    );
    const [purchasesToday] = await pool.query(
      'SELECT COALESCE(SUM(grand_total), 0) AS total FROM purchases WHERE DATE(purchase_date) = CURRENT_DATE()'
    );
    const [expensesToday] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE expense_date = CURRENT_DATE()'
    );
    const [businessTotals] = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM customers) AS total_customers,
         (SELECT COUNT(*) FROM purchases) AS total_purchases,
         (SELECT COALESCE(SUM(amount), 0) FROM expenses) AS total_expenses,
         (SELECT COALESCE(SUM(points), 0) FROM loyalty_points_transactions
          WHERE transaction_type = 'Earned') AS loyalty_points_issued`
    );
    // Cash in Hand: single source of truth from cash_ledger
    const [cashLedgerTotals] = await pool.query(
      'SELECT COALESCE(SUM(inflow - outflow), 0) AS balance FROM cash_ledger'
    );
    const [cogs] = await pool.query(
      `SELECT COALESCE(SUM(si.quantity * p.purchase_price), 0) AS total_cogs
       FROM sale_items si
       JOIN products p ON p.product_id = si.product_id
       JOIN sales s ON s.sale_id = si.sale_id
       WHERE MONTH(s.sale_date) = MONTH(CURRENT_DATE())
         AND YEAR(s.sale_date) = YEAR(CURRENT_DATE())`
    );
    const [chartRows] = await pool.query(
      `SELECT DATE(sale_date) AS date_label,
              COALESCE(SUM(grand_total), 0) AS amount
       FROM sales
       WHERE sale_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
       GROUP BY DATE(sale_date)
       ORDER BY DATE(sale_date)`
    );
    const [bestSellers] = await pool.query(
      `SELECT p.product_name AS item_name, SUM(si.quantity) AS total_sold,
              SUM(si.total) AS total_revenue
       FROM sale_items si
       JOIN products p ON p.product_id = si.product_id
       GROUP BY si.product_id, p.product_name
       ORDER BY total_sold DESC
       LIMIT 5`
    );
    const [paymentStats] = await pool.query(
      `SELECT payment_method AS name, COUNT(*) AS count,
              COALESCE(SUM(amount), 0) AS value
       FROM payments
       GROUP BY payment_method`
    );
    const [recentSales] = await pool.query(
      `SELECT s.sale_id AS id, s.invoice_number, s.sale_date AS invoice_date,
              COALESCE(c.customer_name, 'Walk-in Customer') AS customer_name,
              COALESCE((
                SELECT SUBSTRING_INDEX(GROUP_CONCAT(p.payment_method ORDER BY p.payment_id DESC), ',', 1)
                FROM payments p
                WHERE p.sale_id = s.sale_id
              ), 'Unpaid') AS payment_type,
              s.grand_total, s.payment_status AS status
       FROM sales s
       LEFT JOIN customers c ON c.customer_id = s.customer_id
       ORDER BY s.sale_id DESC
       LIMIT 8`
    );
    const [recentPurchases] = await pool.query(
       `SELECT pu.purchase_id AS id, pu.purchase_number AS bill_number,
               pu.purchase_date AS bill_date,
               COALESCE(s.supplier_name, 'Supplier') AS supplier_name,
               pu.grand_total, pu.payment_status AS status
        FROM purchases pu
        LEFT JOIN suppliers s ON s.supplier_id = pu.supplier_id
        ORDER BY pu.purchase_id DESC
        LIMIT 8`
    );

    return res.json({
      success: true,
      data: {
        totalSaleToday: round2(salesToday[0].total),
        todayBillsCount: salesToday[0].bill_count,
        totalSaleMonth: round2(salesMonth[0].total_sales_month),
        totalBillsMonth: salesMonth[0].total_bills,
        grossProfitMonth: round2(Math.max(0, Number(salesMonth[0].total_sales_month) - Number(cogs[0].total_cogs))),
        totalReceivable: round2(receivable[0].total),
        totalPayable: round2(payable[0].total),
        totalProducts: products[0].total_products,
        outOfStockCount: products[0].out_of_stock,
        lowStockCount: products[0].low_stock,
        stockValuation: round2(products[0].stock_valuation),
        totalPurchasesToday: round2(purchasesToday[0].total),
        totalExpensesToday: round2(expensesToday[0].total),
        totalCustomers: businessTotals[0].total_customers,
        totalPurchases: businessTotals[0].total_purchases,
        totalExpenses: round2(businessTotals[0].total_expenses),
        loyaltyPointsIssued: businessTotals[0].loyalty_points_issued,
        cashInHand: round2(cashLedgerTotals[0].balance),
        totalBankBalance: 0,
        chartData: chartRows,
        bestSellers,
        paymentStats,
        recentSales,
        recentPurchases
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getSaleReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT s.sale_id AS id, s.invoice_number, s.sale_date AS invoice_date,
             COALESCE(c.customer_name, 'Walk-in Customer') AS customer_name,
             COALESCE(p.payment_type, 'Cash') AS payment_type,
             s.subtotal, s.discount AS discount_total, s.gst_amount AS tax_total,
             s.grand_total,
             COALESCE(p.received, 0) AS received_amount,
             GREATEST(0, s.grand_total - COALESCE(p.received, 0)) AS balance_due
      FROM sales s
      LEFT JOIN customers c ON c.customer_id = s.customer_id
      LEFT JOIN (
        SELECT sale_id, SUM(amount) AS received,
               SUBSTRING_INDEX(GROUP_CONCAT(payment_method ORDER BY payment_id DESC), ',', 1) AS payment_type
        FROM payments WHERE sale_id IS NOT NULL GROUP BY sale_id
      ) p ON p.sale_id = s.sale_id
      WHERE 1 = 1
    `;
    const params = [];
    if (startDate && endDate) {
      query += ' AND s.sale_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }
    query += ' ORDER BY s.sale_date DESC, s.sale_id DESC';
    const [rows] = await pool.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.getDaybookReport = async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const [sales] = await pool.query(
      `SELECT 'Sale' AS txn_type, s.invoice_number AS ref_no,
              COALESCE(c.customer_name, 'Walk-in Customer') AS party_name,
              s.grand_total AS debit, 0.00 AS credit,
              COALESCE(p.payment_method, 'Cash') AS payment_type
       FROM sales s
       LEFT JOIN customers c ON c.customer_id = s.customer_id
       LEFT JOIN payments p ON p.sale_id = s.sale_id
       WHERE DATE(s.sale_date) = ?`,
      [date]
    );
    const [purchases] = await pool.query(
      `SELECT 'Purchase' AS txn_type, p.purchase_number AS ref_no,
              COALESCE(s.supplier_name, 'Supplier') AS party_name,
              0.00 AS debit, p.grand_total AS credit,
              COALESCE(pay.payment_method, 'Cash') AS payment_type
       FROM purchases p
       LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
       LEFT JOIN payments pay ON pay.purchase_id = p.purchase_id
       WHERE DATE(p.purchase_date) = ?`,
      [date]
    );
    const [expenses] = await pool.query(
      `SELECT 'Expense' AS txn_type, CAST(expense_id AS CHAR) AS ref_no,
              expense_title AS party_name, 0.00 AS debit, amount AS credit,
              'Cash' AS payment_type
       FROM expenses
       WHERE expense_date = ?`,
      [date]
    );
    const transactions = [...sales, ...purchases, ...expenses]
      .sort((a, b) => new Date(b.date || date) - new Date(a.date || date));
    return res.json({ success: true, date, data: transactions });
  } catch (err) {
    next(err);
  }
};

exports.getAllTransactions = async (req, res, next) => {
  try {
    const [transactions] = await pool.query(`
      SELECT 'Sale' AS type, s.invoice_number AS doc_no, s.sale_date AS date,
             COALESCE(c.customer_name, 'Walk-in Customer') AS party_name,
             s.grand_total AS amount, COALESCE(p.payment_method, 'Cash') AS mode
      FROM sales s
      LEFT JOIN customers c ON c.customer_id = s.customer_id
      LEFT JOIN payments p ON p.sale_id = s.sale_id
      UNION ALL
      SELECT 'Purchase' AS type, pu.purchase_number AS doc_no, pu.purchase_date AS date,
             COALESCE(s.supplier_name, 'Supplier') AS party_name,
             pu.grand_total AS amount, COALESCE(p.payment_method, 'Cash') AS mode
      FROM purchases pu
      LEFT JOIN suppliers s ON s.supplier_id = pu.supplier_id
      LEFT JOIN payments p ON p.purchase_id = pu.purchase_id
      UNION ALL
      SELECT 'Expense' AS type, CAST(expense_id AS CHAR) AS doc_no,
             expense_date AS date, expense_title AS party_name,
             amount, 'Cash' AS mode
      FROM expenses
      ORDER BY date DESC
      LIMIT 100
    `);
    return res.json({ success: true, data: transactions });
  } catch (err) {
    next(err);
  }
};
