import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  ArrowDownCircle, ArrowUpCircle, TrendingUp, TrendingDown,
  ShoppingCart, Package, AlertTriangle, AlertCircle, DollarSign,
  CreditCard, Wallet, Plus, Edit2, BarChart2, Users, Truck,
  RefreshCw, ChevronRight, Sparkles, RotateCcw
} from 'lucide-react';

const PIE_COLORS = ['#1976d2', '#e01a4f', '#10b981', '#f59e0b', '#8b5cf6'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { business } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      if (res.success && res.data) setStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-400 text-xs">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  const s = stats || {};
  const chartData = s.chartData || [];
  const bestSellers = s.bestSellers || [];
  const paymentStats = s.paymentStats || [];
  const recentSales = s.recentSales || [];
  const recentPurchases = s.recentPurchases || [];

  // KPI cards config
  const kpiCards = [
    { label: "Today's Sales", value: formatCurrency(s.totalSaleToday || 0), sub: `${s.todayBillsCount || 0} bills today`, icon: ShoppingCart, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Monthly Sales', value: formatCurrency(s.totalSaleMonth || 0), sub: `${s.totalBillsMonth || 0} invoices`, icon: TrendingUp, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'Gross Profit (Month)', value: formatCurrency(s.grossProfitMonth || 0), sub: 'Revenue minus COGS', icon: DollarSign, color: 'purple', bg: 'bg-purple-50', text: 'text-purple-600' },
    { label: "Cash in Hand", value: formatCurrency(s.cashInHand || 0), sub: 'Current cash balance', icon: Wallet, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-600' },
    { label: 'Total Receivable', value: formatCurrency(s.totalReceivable || 0), sub: 'Pending from customers', icon: ArrowDownCircle, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'Total Payable', value: formatCurrency(s.totalPayable || 0), sub: 'Dues to suppliers', icon: ArrowUpCircle, color: 'rose', bg: 'bg-rose-50', text: 'text-rose-500' },
    { label: "Today's Purchases", value: formatCurrency(s.totalPurchasesToday || 0), sub: 'Goods received today', icon: Truck, color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-600' },
    { label: "Today's Expenses", value: formatCurrency(s.totalExpensesToday || 0), sub: 'Operating costs today', icon: TrendingDown, color: 'red', bg: 'bg-red-50', text: 'text-red-600' },
    { label: 'Electrical Items', value: s.totalProducts || 0, sub: `${s.lowStockCount || 0} low stock`, icon: Package, color: 'purple', bg: 'bg-purple-50', text: 'text-purple-600' },
    { label: 'Total Customers', value: s.totalCustomers || 0, sub: 'Registered customers', icon: Users, color: 'cyan', bg: 'bg-cyan-50', text: 'text-cyan-600' },
    { label: 'Purchase Bills', value: s.totalPurchases || 0, sub: 'Recorded purchases', icon: Truck, color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-600' },
    { label: 'Total Expenses', value: formatCurrency(s.totalExpenses || 0), sub: 'All recorded expenses', icon: TrendingDown, color: 'rose', bg: 'bg-rose-50', text: 'text-rose-600' },
    { label: 'Loyalty Points Issued', value: s.loyaltyPointsIssued || 0, sub: 'Earned on completed bills', icon: Users, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-600' },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-[#E5E5DF] bg-[linear-gradient(135deg,#202D28_0%,#243831_100%)] p-4 text-white shadow-[0_18px_45px_rgba(32,45,40,0.12)] lg:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#C9D9C5]">NEXMART • Electrical Store</p>
            <h1
              onClick={() => navigate('/edit-profile')}
              className="mt-2 flex cursor-pointer items-center gap-2 text-xl font-black text-white lg:text-2xl"
            >
              {business?.business_name || 'Enter Business Name'}
              <Edit2 className="h-4 w-4 text-[#B7D96B]" />
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#EAF4EC]">
            <span className="rounded-full border border-[#3D5A51] bg-[#2B3F39] px-2.5 py-1 font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <span className="rounded-full border border-[#3D5A51] bg-[#2B3F39] px-2.5 py-1 font-medium">
              Welcome back
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/pos')}
            className="inline-flex items-center gap-2 rounded-full bg-[#B7D96B] px-3.5 py-2 text-xs font-bold text-[#202D28] shadow-[0_10px_25px_rgba(183,217,107,0.26)] transition hover:bg-[#A9CC54]"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>New POS Bill</span>
          </button>
          <button
            onClick={() => navigate('/add-item')}
            className="inline-flex items-center gap-2 rounded-full border border-[#3D5A51] bg-[#2B3F39] px-3.5 py-2 text-xs font-bold text-white transition hover:border-[#B7D96B] hover:text-[#B7D96B]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
          <button
            onClick={() => navigate('/customers')}
            className="inline-flex items-center gap-2 rounded-full border border-[#3D5A51] bg-[#2B3F39] px-3.5 py-2 text-xs font-bold text-white transition hover:border-[#B7D96B] hover:text-[#B7D96B]"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Add Customer</span>
          </button>
          <button
            onClick={loadDashboard}
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#3D5A51] bg-[#2B3F39] text-[#EAF4EC] transition hover:border-[#B7D96B] hover:text-[#B7D96B]"
            title="Refresh Dashboard"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stock Alert Banners */}
      {(s.outOfStockCount > 0 || s.lowStockCount > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {s.outOfStockCount > 0 && (
            <div
              onClick={() => navigate('/items')}
              className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-3 cursor-pointer hover:bg-red-100 transition"
            >
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <div className="font-bold text-red-800 text-xs">{s.outOfStockCount} Products Out of Stock!</div>
                <div className="text-red-600 text-[11px]">Immediate restock required. Click to view.</div>
              </div>
            </div>
          )}
          {s.lowStockCount > 0 && (
            <div
              onClick={() => navigate('/items')}
              className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center space-x-3 cursor-pointer hover:bg-amber-100 transition"
            >
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <div className="font-bold text-amber-800 text-xs">{s.lowStockCount} Products Running Low</div>
                <div className="text-amber-600 text-[11px]">Below minimum stock level. Click to reorder.</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((kpi, idx) => (
          <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm flex items-start justify-between">
            <div className="flex-1">
              <div className="text-[11px] text-gray-500 font-medium">{kpi.label}</div>
              <div className="text-lg font-black text-gray-900 mt-1">{kpi.value}</div>
              <div className="text-[10px] text-gray-400 mt-1">{kpi.sub}</div>
            </div>
            <div className={`w-9 h-9 rounded-full ${kpi.bg} ${kpi.text} flex items-center justify-center flex-shrink-0 ml-2`}>
              <kpi.icon className="w-5 h-5 stroke-[1.8]" />
            </div>
          </div>
        ))}
      </div>

      {/* Additional KPI: Products Inventory Overview */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm text-center">
          <Package className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <div className="text-xl font-black text-gray-900">{s.totalProducts || 0}</div>
          <div className="text-[11px] text-gray-500">Total Active Products</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm text-center">
          <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <div className="text-xl font-black text-amber-700">{s.lowStockCount || 0}</div>
          <div className="text-[11px] text-gray-500">Low Stock Items</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm text-center">
          <DollarSign className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
          <div className="text-xl font-black text-emerald-700">{formatCurrency(s.stockValuation || 0)}</div>
          <div className="text-[11px] text-gray-500">Stock Valuation (Cost)</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Trend AreaChart */}
        <div className="lg:col-span-2 bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-bold text-gray-800 text-sm">Sales Trend (Last 14 Days)</div>
              <div className="text-xs text-gray-500 mt-0.5">Revenue by date</div>
            </div>
            <button onClick={() => navigate('/reports')} className="text-xs text-blue-600 hover:underline font-medium">
              Full Report →
            </button>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1976d2" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date_label" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip
                  formatter={(v) => [`₹${v.toFixed(2)}`, 'Sales']}
                  contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #e2e8f0' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#1976d2" strokeWidth={2} fill="url(#salesGrad)" dot={{ r: 3, fill: '#1976d2' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-400 text-xs">
              <div className="text-center">
                <BarChart2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                No sales data yet. Start billing to see the trend!
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-bold text-gray-800 text-xs">Recent Purchases</span>
            <button onClick={() => navigate('/purchases')} className="text-xs text-blue-600 hover:underline font-medium">
              View All →
            </button>
          </div>
          {recentPurchases.length === 0 ? (
            <div className="p-5 text-center text-gray-400 text-xs">No purchases recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-semibold uppercase text-[10px]">
                    <th className="py-2 px-3">Bill</th>
                    <th className="py-2 px-3">Supplier</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentPurchases.map(purchase => (
                    <tr key={purchase.id}>
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">{purchase.bill_number}</td>
                      <td className="py-2 px-3">{purchase.supplier_name}</td>
                      <td className="py-2 px-3">{purchase.status}</td>
                      <td className="py-2 px-3 text-right font-semibold">{formatCurrency(purchase.grand_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment Methods PieChart */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="font-bold text-gray-800 text-sm mb-1">Payment Methods</div>
          <div className="text-xs text-gray-500 mb-3">Sales by payment mode</div>
          {paymentStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={paymentStats}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  innerRadius={35}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {paymentStats.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`₹${parseFloat(v).toFixed(2)}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-400 text-xs text-center">
              <div>
                <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                No payment data yet
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Recent Sales & Best Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-bold text-gray-800 text-xs">Recent Transactions</span>
            <button onClick={() => navigate('/sales')} className="text-xs text-blue-600 hover:underline font-medium">
              View All →
            </button>
          </div>
          {recentSales.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs">
              No sales yet. <span onClick={() => navigate('/pos')} className="text-blue-600 cursor-pointer underline">Start a POS bill</span>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-semibold uppercase text-[10px]">
                  <th className="py-2 px-3">Invoice</th>
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3">Payment</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition">
                    <td className="py-2 px-3 font-mono font-bold text-blue-700">#{sale.invoice_number}</td>
                    <td className="py-2 px-3 font-medium text-gray-800 max-w-[120px] truncate">{sale.customer_name}</td>
                    <td className="py-2 px-3">
                      <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">{sale.payment_type}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-gray-900">{formatCurrency(sale.grand_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Best Selling Products */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-bold text-gray-800 text-xs">Best Sellers</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </div>
          {bestSellers.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs">
              Sell products to see top performers here.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {bestSellers.map((p, idx) => (
                <div key={idx} className="p-3 flex items-center space-x-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                    idx === 0 ? 'bg-amber-400 text-white' :
                    idx === 1 ? 'bg-gray-400 text-white' :
                    idx === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 text-xs truncate">{p.item_name}</div>
                    <div className="text-[10px] text-gray-500">{parseFloat(p.total_sold).toFixed(0)} units sold</div>
                  </div>
                  <div className="text-xs font-bold text-blue-700 flex-shrink-0">
                    {formatCurrency(p.total_revenue)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Navigation Links */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="font-bold text-xs text-gray-800 mb-3">Quick Access</div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {[
            { label: 'POS Billing', path: '/pos', icon: ShoppingCart, color: 'text-red-600 bg-red-50' },
            { label: 'Sales Invoices', path: '/sales', icon: ShoppingCart, color: 'text-blue-600 bg-blue-50' },
            { label: 'Items', path: '/items', icon: Package, color: 'text-purple-600 bg-purple-50' },
            { label: 'Customers', path: '/customers', icon: Users, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Purchases', path: '/purchases', icon: Truck, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Sales Returns', path: '/returns', icon: RotateCcw, color: 'text-orange-600 bg-orange-50' },
            { label: 'Expenses', path: '/expenses', icon: DollarSign, color: 'text-amber-600 bg-amber-50' },
            { label: 'Reports', path: '/reports', icon: BarChart2, color: 'text-gray-600 bg-gray-100' },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center space-x-2 p-2.5 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer transition text-xs font-semibold text-gray-700 ${item.color.split(' ')[1]} hover:bg-white`}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${item.color.split(' ')[0]}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
