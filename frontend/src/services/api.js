const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('apexbill_token') || localStorage.getItem('vyapar_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  // Auth
  login: async (username, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },
  getAuthSetupStatus: async () => {
    const res = await fetch(`${API_BASE}/auth/setup-status`);
    return res.json();
  },
  createInitialAdmin: async (data) => {
    const res = await fetch(`${API_BASE}/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    return res.json();
  },

  // Business Profile
  getBusinessProfile: async () => {
    const res = await fetch(`${API_BASE}/business/profile`);
    return res.json();
  },
  updateBusinessProfile: async (data) => {
    const res = await fetch(`${API_BASE}/business/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Parties
  getParties: async (search = '', type = '') => {
    const res = await fetch(`${API_BASE}/parties?search=${encodeURIComponent(search)}&type=${encodeURIComponent(type)}`);
    return res.json();
  },
  getCustomerByPhone: async (phone) => {
    const res = await fetch(`${API_BASE}/parties/customer-by-phone/${encodeURIComponent(phone)}`, {
      headers: getHeaders()
    });
    return res.json();
  },
  getPartyById: async (id, type = 'Customer') => {
    const res = await fetch(`${API_BASE}/parties/${id}?type=${encodeURIComponent(type)}`);
    return res.json();
  },
  getLoyaltyHistory: async (id) => {
    const res = await fetch(`${API_BASE}/parties/${id}/loyalty-history`, {
      headers: getHeaders()
    });
    return res.json();
  },
  createParty: async (data) => {
    const res = await fetch(`${API_BASE}/parties`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updateParty: async (id, data, type = 'Customer') => {
    const res = await fetch(`${API_BASE}/parties/${id}?type=${encodeURIComponent(type)}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },
  deleteParty: async (id, type = 'Customer') => {
    const res = await fetch(`${API_BASE}/parties/${id}?type=${encodeURIComponent(type)}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },
  addPaymentIn: async (data) => {
    const res = await fetch(`${API_BASE}/parties/payment-in`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Items / Products
  getItems: async (search = '', category = '', type = '') => {
    const res = await fetch(`${API_BASE}/items?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&type=${encodeURIComponent(type)}`);
    return res.json();
  },
  getItemById: async (id) => {
    const res = await fetch(`${API_BASE}/items/${id}`);
    return res.json();
  },
  createItem: async (data) => {
    const res = await fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updateItem: async (id, data) => {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },
  deleteItem: async (id) => {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },
  getCategories: async () => {
    const res = await fetch(`${API_BASE}/items/categories`);
    return res.json();
  },
  getNextProductCode: async () => {
    const res = await fetch(`${API_BASE}/items/next-code`);
    return res.json();
  },
  getProductByBarcode: async (barcode) => {
    const res = await fetch(`${API_BASE}/items/by-barcode/${encodeURIComponent(barcode)}`);
    return res.json();
  },
  getUnits: async () => {
    const res = await fetch(`${API_BASE}/items/units`);
    return res.json();
  },
  getBarcodeSvg: async (id) => {
    const res = await fetch(`${API_BASE}/items/barcode/${id}.svg`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Barcode image could not be generated.');
    }
    return res.text();
  },

  // Sales
  getNextInvoiceNumber: async () => {
    const res = await fetch(`${API_BASE}/sales/next-number`);
    return res.json();
  },
  getSales: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/sales?${q}`);
    return res.json();
  },
  getSaleById: async (id) => {
    const res = await fetch(`${API_BASE}/sales/${id}`);
    return res.json();
  },
  createSale: async (data) => {
    const res = await fetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Purchases
  getPurchases: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/purchases?${q}`);
    return res.json();
  },
  createPurchase: async (data) => {
    const res = await fetch(`${API_BASE}/purchases`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },
  getPurchaseById: async (id) => {
    const res = await fetch(`${API_BASE}/purchases/${id}`);
    return res.json();
  },
  updatePurchase: async (id, data) => {
    const res = await fetch(`${API_BASE}/purchases/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },
  deletePurchase: async (id) => {
    const res = await fetch(`${API_BASE}/purchases/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },
  getPurchaseHistory: async (id) => {
    const res = await fetch(`${API_BASE}/purchases/${id}/history`);
    return res.json();
  },

  // Bank & Cash
  getBankAccounts: async () => {
    const res = await fetch(`${API_BASE}/bank/accounts`);
    return res.json();
  },
  addBankAccount: async (data) => {
    const res = await fetch(`${API_BASE}/bank/accounts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },
  getCashInHand: async () => {
    const res = await fetch(`${API_BASE}/bank/cash-in-hand`);
    return res.json();
  },
  adjustCash: async (data) => {
    const res = await fetch(`${API_BASE}/bank/cash-adjust`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Users & Permissions
  getUsers: async () => {
    const res = await fetch(`${API_BASE}/users`, { headers: getHeaders() });
    return res.json();
  },
  getPermissions: async (role = '') => {
    const res = await fetch(`${API_BASE}/users/permissions?role=${encodeURIComponent(role)}`, { headers: getHeaders() });
    return res.json();
  },
  createUser: async (data) => {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },
  deleteUser: async (id) => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  // Reports & Dashboard
  getDashboardStats: async () => {
    const res = await fetch(`${API_BASE}/reports/dashboard-stats`);
    return res.json();
  },
  getSaleReport: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/reports/sales?${q}`);
    return res.json();
  },
  getDaybookReport: async (date = '') => {
    const res = await fetch(`${API_BASE}/reports/daybook?date=${encodeURIComponent(date)}`);
    return res.json();
  },
  getAllTransactions: async () => {
    const res = await fetch(`${API_BASE}/reports/all-transactions`);
    return res.json();
  },

  // Expenses
  getExpenses: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/expenses?${q}`);
    return res.json();
  },
  getExpenseCategories: async () => {
    const res = await fetch(`${API_BASE}/expenses/categories`);
    return res.json();
  },
  createExpense: async (data) => {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updateExpense: async (id, data) => {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },
  deleteExpense: async (id) => {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  },

  // Sales Returns
  getReturns: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/returns?${q}`);
    return res.json();
  },
  createReturn: async (data) => {
    const res = await fetch(`${API_BASE}/returns`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // POS Billing
  getHeldBills: async () => {
    const res = await fetch(`${API_BASE}/pos/held-bills`);
    return res.json();
  },
  holdBill: async (data) => {
    const res = await fetch(`${API_BASE}/pos/hold`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },
  resumeBill: async (id) => {
    const res = await fetch(`${API_BASE}/pos/resume/${id}`, {
      method: 'POST',
      headers: getHeaders()
    });
    return res.json();
  },
  deleteHeldBill: async (id) => {
    const res = await fetch(`${API_BASE}/pos/held-bills/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return res.json();
  }
};
