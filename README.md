# ApexBill — Smart Billing & Business Management System

A high-performance full-stack business billing, point-of-sale (POS), and inventory management system designed for modern retail and wholesale businesses.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ (tested on v24)
- **MySQL** Server running on localhost:3306
- MySQL credentials for the existing electrical store database

---

### 1. Database Setup

Use the existing `electrical_store_db` database. Do not run `database/schema.sql`,
`database/reset_fresh.sql`, or `database/seed.sql` against it; those files describe
the legacy sample application schema and data.

Set the real MySQL password locally in `backend/.env`. The backend applies only
additive, idempotent barcode-related changes at startup; it does not drop tables
or create or replace the database.

---

### 2. Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev      # starts on http://localhost:5000 after the DB check/migration
```

Set `DB_PASSWORD` in `backend/.env` to the password for your MySQL `root` user.
Keep `.env` private; database credentials are never used by the React client.

**Verify backend is healthy:**
```
GET http://localhost:5000/api/health
```

---

### 3. Frontend

```bash
cd frontend
npm install
npm run dev      # starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## 🔐 Login

On the first visit, create the administrator account using the one-time setup
form. Choose a strong password of at least 12 characters. Setup is disabled
after the first account is created. Later users must be added by an
administrator; no demo user or customer is created automatically.

---

## 📁 Project Structure

```
billing/
├── database/
│   ├── schema.sql          # All 18 table definitions
│   └── seed.sql            # Demo data (parties, items, sales, etc.)
│
├── backend/
│   ├── src/
│   │   ├── config/db.js           # MySQL connection pool
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT authentication
│   │   │   └── errorHandler.js    # Central error handler
│   │   ├── controllers/           # Business logic
│   │   │   ├── authController.js
│   │   │   ├── businessController.js
│   │   │   ├── partyController.js
│   │   │   ├── itemController.js
│   │   │   ├── saleController.js
│   │   │   ├── purchaseController.js
│   │   │   ├── bankController.js
│   │   │   ├── userController.js
│   │   │   └── reportController.js
│   │   ├── routes/                # API route definitions
│   │   ├── app.js                 # Express app setup
│   │   └── server.js              # HTTP server entry point
│   ├── tests/
│   │   └── billing.test.js        # Automated billing calculation tests
│   ├── .env                       # Environment variables
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── AppLayout.jsx       # Main layout wrapper
    │   │   │   ├── Sidebar.jsx         # Dark navy sidebar navigation
    │   │   │   └── TopHeader.jsx       # Top menu bar
    │   │   ├── invoice/
    │   │   │   ├── InvoicePreviewModal.jsx  # 3-column invoice preview
    │   │   │   ├── TallyTheme.jsx           # Classic tax invoice theme
    │   │   │   ├── DoubleDivineTheme.jsx    # Modern red-wave theme
    │   │   │   └── ThermalReceipt.jsx       # 80mm thermal receipt
    │   │   └── modals/
    │   │       ├── AddPartyModal.jsx
    │   │       ├── PaymentInModal.jsx
    │   │       ├── AdjustCashModal.jsx
    │   │       ├── AddUserModal.jsx
    │   │       └── QuickSearchModal.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx      # JWT auth state
    │   ├── pages/                   # All page components
    │   ├── services/
    │   │   └── api.js               # Full API client
    │   ├── utils/
    │   │   └── formatters.js        # Currency, date, number-to-words
    │   ├── App.jsx                  # Routes
    │   └── main.jsx                 # Entry point
    └── package.json
```

---

## 🗄️ Database

- **Database:** `electrical_store_db`
- **Host:** localhost:3306
- **User:** root (password configured only in `backend/.env`)

### Key Tables
| Table | Description |
|-------|-------------|
| `store_settings` | Store profile |
| `users`, `roles` | Existing user accounts and roles |
| `customers`, `suppliers` | Customer and supplier records |
| `categories`, `products` | Product inventory and categories |
| `sales`, `sale_items` | Invoices and line items |
| `purchases`, `purchase_items` | Purchase bills and line items |
| `payments` | Sale and purchase payments |
| `stock_movements` | Inventory change history |
| `expenses` | Store expenses |

New product codes use `ELEC-` followed by a unique sequence and are stored
identically in `products.product_code` and `products.barcode`. A persistent
registry prevents deleted codes from being reused.

---

## 🔌 API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login → JWT token |
| GET | `/api/auth/me` | Current user profile |

### Business
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/business/profile` | Get business info |
| PUT | `/api/business/profile` | Update business info |

### Parties (Customers/Suppliers)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/parties` | List all parties |
| POST | `/api/parties` | Create party |
| PUT | `/api/parties/:id` | Update party |
| DELETE | `/api/parties/:id` | Delete party |
| POST | `/api/parties/payment-in` | Record payment |

### Items (Products)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/items` | List items (with search/filter) |
| POST | `/api/items` | Create item with backend-generated product code and barcode |
| PUT | `/api/items/:id` | Update item details without changing its code/barcode |
| DELETE | `/api/items/:id` | Deactivate item while retaining history |
| GET | `/api/items/categories` | All categories |
| GET | `/api/items/units` | All units |
| GET | `/api/items/barcode/:id.svg` | Code 128 barcode SVG for printing/downloading |
| GET | `/api/pos/scan?code=...` | Exact active-product barcode lookup |

### Sales
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sales` | List invoices |
| GET | `/api/sales/:id` | Invoice detail |
| POST | `/api/sales` | Create sale (transactional) |
| GET | `/api/sales/next-number` | Next invoice number |

### Purchases
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/purchases` | List bills |
| POST | `/api/purchases` | Create purchase |

### Bank & Cash
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bank/accounts` | List bank accounts |
| POST | `/api/bank/accounts` | Add bank account |
| GET | `/api/bank/cash-in-hand` | Cash balance + ledger |
| POST | `/api/bank/cash-adjust` | Adjust cash |

### Reports & Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports/dashboard-stats` | Dashboard KPIs + chart |
| GET | `/api/reports/sales` | Sales report |
| GET | `/api/reports/daybook` | Day book |
| GET | `/api/reports/all-transactions` | All transactions |

---

## 🧪 Tests

```bash
cd backend
node tests/billing.test.js
```

Tests cover:
- ✅ Decimal precision and invoice calculations
- ✅ MySQL connection and additive product barcode schema
- ✅ Code 128 barcode generation

---

## 🎨 UI Design

Modern, high-contrast dark navy sidebar with intuitive action controls:

| Token | Value | Usage |
|-------|-------|-------|
| Sidebar bg | `#1e2238` | Dark navy left panel |
| Accent red | `#e01a4f` | Primary action buttons |
| Accent blue | `#1976d2` | Secondary actions |
| Active item | `#2d3254` | Selected sidebar item |
| Content bg | `#f5f6fa` | Page background |

---

## 📄 Invoice Themes

Three print-ready themes accessible from any sale invoice:

1. **Tally Theme** — Classic tabular GST invoice with CGST/SGST breakdown, QR code, bank details
2. **Double Divine** — Modern red-wave header, clean columns
3. **Thermal Receipt** — 80mm POS receipt format

All themes support:
- UPI QR code generation
- Print / Save as PDF
- WhatsApp / Email share placeholders
- Round-off display

---

## 🔧 Environment Variables

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=electrical_store_db
JWT_SECRET=choose_a_private_random_secret
JWT_EXPIRES_IN=7d
```
