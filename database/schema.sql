-- Supermarket & Business Billing Database Schema
-- Database: supermarket_billing_db
-- Compatible with MySQL 8.0+

CREATE DATABASE IF NOT EXISTS supermarket_billing_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE supermarket_billing_db;

-- 1. Business Settings / Profile
CREATE TABLE IF NOT EXISTS business_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_name VARCHAR(150) NOT NULL DEFAULT 'HiTech',
  phone_number VARCHAR(20) DEFAULT '9742762826',
  gstin VARCHAR(25) DEFAULT NULL,
  email VARCHAR(100) DEFAULT 'contact@hitech.local',
  business_type VARCHAR(50) DEFAULT 'Retail & Wholesale',
  business_category VARCHAR(100) DEFAULT 'Electrical & Electronics Equipments',
  state VARCHAR(50) DEFAULT 'Karnataka',
  pincode VARCHAR(10) DEFAULT '560100',
  business_address TEXT,
  signature_url TEXT,
  logo_url TEXT,
  account_books_beginning_date DATE DEFAULT (CURRENT_DATE),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Roles
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255)
) ENGINE=InnoDB;

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  email VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'Salesman/Biller',
  view_access ENUM('All Transactions', 'Self-Created Transactions') DEFAULT 'All Transactions',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. Role Permissions
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  module VARCHAR(50) NOT NULL,
  can_view BOOLEAN DEFAULT TRUE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_share BOOLEAN DEFAULT TRUE,
  can_cancel BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  UNIQUE KEY uq_role_module (role, module)
) ENGINE=InnoDB;

-- 5. Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 6. Units of Measurement
CREATE TABLE IF NOT EXISTS units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  short_name VARCHAR(20) NOT NULL UNIQUE,
  full_name VARCHAR(50)
) ENGINE=InnoDB;

-- 7. Products / Items
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  item_type ENUM('Product', 'Service') DEFAULT 'Product',
  hsn_code VARCHAR(20) DEFAULT NULL,
  unit VARCHAR(20) DEFAULT 'NONE',
  category_id INT DEFAULT NULL,
  item_code VARCHAR(50) UNIQUE,
  sale_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  sale_price_tax_type ENUM('Without Tax', 'With Tax') DEFAULT 'With Tax',
  discount_value DECIMAL(10, 2) DEFAULT 0.00,
  discount_type ENUM('Percentage', 'Amount') DEFAULT 'Percentage',
  purchase_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  purchase_price_tax_type ENUM('Without Tax', 'With Tax') DEFAULT 'With Tax',
  tax_rate VARCHAR(20) DEFAULT 'GST@18%',
  current_stock DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  opening_stock DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  min_stock_to_maintain DECIMAL(12, 2) DEFAULT 0.00,
  location VARCHAR(100) DEFAULT NULL,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL,
  INDEX idx_item_code (item_code),
  INDEX idx_product_name (name)
) ENGINE=InnoDB;

-- 8. Parties (Customers & Suppliers)
CREATE TABLE IF NOT EXISTS parties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  gstin VARCHAR(25) DEFAULT NULL,
  phone_number VARCHAR(20) DEFAULT NULL,
  gst_type ENUM('Unregistered/Consumer', 'Registered Regular', 'Registered Composition') DEFAULT 'Unregistered/Consumer',
  state VARCHAR(50) DEFAULT 'Karnataka',
  email VARCHAR(100) DEFAULT NULL,
  billing_address TEXT,
  shipping_address TEXT,
  opening_balance DECIMAL(12, 2) DEFAULT 0.00,
  current_balance DECIMAL(12, 2) DEFAULT 0.00,
  party_type ENUM('Customer', 'Supplier', 'Both') DEFAULT 'Customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_party_name (name),
  INDEX idx_party_phone (phone_number)
) ENGINE=InnoDB;

-- 9. Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  account_display_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  ifsc_code VARCHAR(20) NOT NULL,
  bank_name VARCHAR(150) NOT NULL,
  account_holder_name VARCHAR(150),
  upi_id VARCHAR(100),
  opening_balance DECIMAL(12, 2) DEFAULT 0.00,
  current_balance DECIMAL(12, 2) DEFAULT 0.00,
  print_qr_on_invoice BOOLEAN DEFAULT TRUE,
  print_bank_details BOOLEAN DEFAULT TRUE,
  accept_payments_online BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 10. Sales Invoices
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number INT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  is_cash_sale BOOLEAN DEFAULT FALSE,
  party_id INT DEFAULT NULL,
  customer_name VARCHAR(150) NOT NULL,
  phone_number VARCHAR(20),
  billing_address TEXT,
  state_of_supply VARCHAR(50) DEFAULT 'Karnataka',
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  discount_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  tax_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  round_off DECIMAL(10, 2) DEFAULT 0.00,
  grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  received_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  balance_due DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  payment_type VARCHAR(50) DEFAULT 'Cash',
  bank_account_id INT DEFAULT NULL,
  notes TEXT,
  theme_name VARCHAR(50) DEFAULT 'Tally Theme',
  created_by INT DEFAULT NULL,
  status ENUM('Completed', 'Cancelled', 'Draft') DEFAULT 'Completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_sales_date (invoice_date),
  INDEX idx_sales_party (party_id)
) ENGINE=InnoDB;

-- 11. Sale Items (Line items for sales)
CREATE TABLE IF NOT EXISTS sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  product_id INT DEFAULT NULL,
  item_name VARCHAR(150) NOT NULL,
  hsn_code VARCHAR(20) DEFAULT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
  unit VARCHAR(20) DEFAULT 'NONE',
  price_per_unit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  price_tax_type ENUM('Without Tax', 'With Tax') DEFAULT 'Without Tax',
  discount_percent DECIMAL(5, 2) DEFAULT 0.00,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  tax_rate VARCHAR(20) DEFAULT 'GST@18%',
  tax_amount DECIMAL(10, 2) DEFAULT 0.00,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 12. Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_number VARCHAR(50) NOT NULL,
  bill_date DATE NOT NULL,
  party_id INT DEFAULT NULL,
  supplier_name VARCHAR(150) NOT NULL,
  phone_number VARCHAR(20),
  state_of_supply VARCHAR(50) DEFAULT 'Karnataka',
  payment_type VARCHAR(50) DEFAULT 'Cash',
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  discount_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  tax_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  balance_due DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  bill_image_url TEXT,
  created_by INT DEFAULT NULL,
  status ENUM('Completed', 'Cancelled', 'Draft') DEFAULT 'Completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_purchases_date (bill_date)
) ENGINE=InnoDB;

-- 13. Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT NOT NULL,
  product_id INT DEFAULT NULL,
  item_name VARCHAR(150) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
  unit VARCHAR(20) DEFAULT 'NONE',
  price_per_unit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  discount_percent DECIMAL(5, 2) DEFAULT 0.00,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  tax_rate VARCHAR(20) DEFAULT 'GST@18%',
  tax_amount DECIMAL(10, 2) DEFAULT 0.00,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 14. Payments (Payment-In / Payment-Out)
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  receipt_no INT NOT NULL,
  payment_type ENUM('Payment-In', 'Payment-Out') NOT NULL,
  party_id INT NOT NULL,
  date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_mode VARCHAR(50) DEFAULT 'Cash',
  bank_account_id INT DEFAULT NULL,
  reference_no VARCHAR(100) DEFAULT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 15. Payment Allocations (Linking payments to specific invoices)
CREATE TABLE IF NOT EXISTS payment_allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NOT NULL,
  sale_id INT DEFAULT NULL,
  purchase_id INT DEFAULT NULL,
  allocated_amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 16. Cash in Hand Ledger & Adjustments
CREATE TABLE IF NOT EXISTS cash_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_type ENUM('Sale', 'Purchase', 'Payment-In', 'Payment-Out', 'Adjustment') NOT NULL,
  reference_id INT DEFAULT NULL,
  party_name VARCHAR(150),
  date DATE NOT NULL,
  inflow DECIMAL(12, 2) DEFAULT 0.00,
  outflow DECIMAL(12, 2) DEFAULT 0.00,
  balance_after DECIMAL(12, 2) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 17. Inventory Movement Audit Trail
CREATE TABLE IF NOT EXISTS inventory_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  movement_type ENUM('Opening', 'Sale', 'Purchase', 'Return', 'Adjustment') NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  reference_id INT DEFAULT NULL,
  reference_type VARCHAR(50) DEFAULT NULL,
  stock_before DECIMAL(12, 2) NOT NULL,
  stock_after DECIMAL(12, 2) NOT NULL,
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 18. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50),
  details JSON,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

