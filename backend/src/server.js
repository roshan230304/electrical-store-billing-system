const app = require('./app');
const dotenv = require('dotenv');
const pool = require('./config/db');
const ensureProductBarcodeSchema = require('./migrations/ensureProductBarcodeSchema');
const ensurePurchaseEditSchema = require('./migrations/ensurePurchaseEditSchema');
const ensureLoyaltyAndExpenseSchema = require('./migrations/ensureLoyaltyAndExpenseSchema');

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await pool.query('SELECT 1');
    console.log(`[DB] Connected successfully to MySQL database: ${process.env.DB_NAME || 'electrical_store_db'}`);
    await ensureProductBarcodeSchema(pool);
    await ensurePurchaseEditSchema(pool);
    await ensureLoyaltyAndExpenseSchema(pool);
  } catch (error) {
    console.error('[DB] Startup check or database migration failed:', error.message);
    process.exitCode = 1;
    return;
  }

  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` ApexBill Backend Server running on port ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` API Health Check: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

startServer();
