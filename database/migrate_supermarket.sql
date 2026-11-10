-- Migration: Supermarket Enterprise Features
USE supermarket_billing_db;

-- 1. Expense Categories Table
CREATE TABLE IF NOT EXISTS expense_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Prepopulate Standard Supermarket Expense Categories
INSERT IGNORE INTO expense_categories (id, name, description) VALUES
(1, 'Rent & Premises', 'Shop and warehouse monthly rental'),
(2, 'Electricity & Utilities', 'Electricity, power backup, and water bills'),
(3, 'Staff Salaries', 'Cashier, helper, and floor staff wages'),
(4, 'Packaging & Bags', 'Carry bags, barcode rolls, packaging material'),
(5, 'Transportation & Freight', 'Goods delivery and transport charges'),
(6, 'Maintenance & Repairs', 'Equipment, racks, and POS machine repair'),
(7, 'Tea & Refreshments', 'Daily pantry and staff refreshments'),
(8, 'Miscellaneous Expenses', 'Other sundry daily store expenses');

-- 2. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expense_number VARCHAR(50) NOT NULL UNIQUE,
  category_id INT NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  expense_date DATE NOT NULL,
  payment_mode ENUM('Cash', 'Bank', 'UPI', 'Cheque') NOT NULL DEFAULT 'Cash',
  bank_account_id INT DEFAULT NULL,
  reference_no VARCHAR(100) DEFAULT NULL,
  description TEXT,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES expense_categories(id),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 3. Sales Returns Table
CREATE TABLE IF NOT EXISTS sales_returns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_number VARCHAR(50) NOT NULL UNIQUE,
  return_date DATE NOT NULL,
  sale_id INT NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  party_id INT DEFAULT NULL,
  customer_name VARCHAR(150) NOT NULL,
  total_refund_amount DECIMAL(12, 2) NOT NULL,
  refund_mode ENUM('Cash', 'Bank', 'Store Credit') NOT NULL DEFAULT 'Cash',
  return_reason VARCHAR(255) DEFAULT 'Customer Return',
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. Sales Return Items Table
CREATE TABLE IF NOT EXISTS sales_return_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_id INT NOT NULL,
  product_id INT NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  quantity DECIMAL(10, 3) NOT NULL,
  unit VARCHAR(20) DEFAULT 'PCS',
  price_per_unit DECIMAL(12, 2) NOT NULL,
  tax_rate VARCHAR(20) DEFAULT 'GST@0%',
  refund_amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (return_id) REFERENCES sales_returns(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Held Bills Table (for POS bill parking / hold & resume)
CREATE TABLE IF NOT EXISTS held_bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hold_reference VARCHAR(50) NOT NULL UNIQUE,
  customer_name VARCHAR(150) DEFAULT 'Walk-in Customer',
  customer_phone VARCHAR(20) DEFAULT NULL,
  cart_data JSON NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  tax_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  item_count INT NOT NULL DEFAULT 0,
  notes VARCHAR(255) DEFAULT NULL,
  held_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 6. Modify cash_ledger entry_type to support Expense and Refund if not already present
ALTER TABLE cash_ledger MODIFY COLUMN entry_type VARCHAR(50) NOT NULL;

