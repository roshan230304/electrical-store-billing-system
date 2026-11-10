import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatters';
import InvoicePreviewModal from '../components/invoice/InvoicePreviewModal';
import {
  Plus,
  Settings,
  Search,
  Printer,
  FileSpreadsheet,
  Share2,
  MoreVertical,
  ChevronDown,
  TrendingUp,
  Filter
} from 'lucide-react';

export default function SalesInvoices() {
  const navigate = useNavigate();
  const { business } = useAuth();

  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({ totalSales: 0, totalReceived: 0, totalBalance: 0 });
  const [search, setSearch] = useState('');
  const [previewSale, setPreviewSale] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSales();
  }, [search]);

  const loadSales = async () => {
    try {
      const res = await api.getSales({ search });
      if (res.success) {
        setSales(res.data);
        if (res.summary) setSummary(res.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPreview = async (saleId) => {
    try {
      const res = await api.getSaleById(saleId);
      if (res.success) {
        setPreviewSale(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-3">
      {/* Top Header matching frame_0610s_033.jpg: "Sale Invoices v" and "+ Add Sale !" */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-800 flex items-center cursor-pointer">
          <span>Sale Invoices</span>
          <ChevronDown className="w-4 h-4 ml-1 text-gray-400" />
        </h1>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/add-sale')}
            className="bg-[#e01a4f] hover:bg-[#c71342] text-white px-3.5 py-1.5 rounded text-xs font-bold flex items-center shadow-sm transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
            Add Sale !
          </button>
          <button className="p-1.5 hover:bg-gray-200 rounded text-gray-500">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter by bar matching frame_0610s_033.jpg */}
      <div className="flex flex-wrap items-center space-x-3 text-xs text-gray-700 bg-white p-2.5 rounded-lg border border-gray-200 shadow-xs">
        <span className="text-gray-500">Filter by :</span>
        <div className="border border-gray-200 rounded px-2.5 py-1 bg-gray-50 flex items-center cursor-pointer">
          <span>This Month</span>
          <ChevronDown className="w-3 h-3 ml-1 text-gray-400" />
        </div>
        <div className="border border-gray-200 rounded px-2.5 py-1 bg-gray-50 flex items-center space-x-1.5 text-gray-600">
          <span>📅</span>
          <span>01/10/2026 To 31/10/2026</span>
        </div>
        <div className="border border-gray-200 rounded px-2.5 py-1 bg-gray-50 flex items-center cursor-pointer">
          <span>All Firms</span>
          <ChevronDown className="w-3 h-3 ml-1 text-gray-400" />
        </div>
      </div>

      {/* Total Sales Metric Card matching frame_0610s_033.jpg */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm max-w-sm">
        <div className="text-xs text-gray-500 font-medium">Total Sales Amount</div>
        <div className="flex items-center space-x-3 mt-1">
          <div className="text-xl font-extrabold text-gray-900">
            ₹ {Number(summary.totalSales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center">
            <TrendingUp className="w-3 h-3 mr-0.5" /> 100% vs last month
          </span>
        </div>
        <div className="flex items-center space-x-4 text-xs text-gray-600 mt-2.5 pt-2 border-t border-gray-100">
          <div>Received: <span className="font-semibold text-emerald-700">₹ {Number(summary.totalReceived).toFixed(2)}</span></div>
          <div>Balance: <span className="font-semibold text-red-600">₹ {Number(summary.totalBalance).toFixed(2)}</span></div>
        </div>
      </div>

      {/* Transactions Table matching frame_0610s_033.jpg */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          <span className="font-bold text-xs text-gray-800">Transactions</span>

          <div className="flex items-center space-x-2 text-gray-500">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoices..."
                className="pl-7 pr-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-blue-500"
              />
            </div>
            <button onClick={() => alert('Excel export')} className="p-1 hover:bg-gray-100 rounded text-emerald-600">
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button onClick={() => window.print()} className="p-1 hover:bg-gray-100 rounded text-gray-600">
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-200">
            <tr>
              <th className="p-2.5">Date</th>
              <th className="p-2.5">Invoice no</th>
              <th className="p-2.5">Party Name</th>
              <th className="p-2.5">Transaction</th>
              <th className="p-2.5">Payment Type</th>
              <th className="p-2.5 text-right">Amount</th>
              <th className="p-2.5 text-right">Balance</th>
              <th className="p-2.5 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  No sales recorded yet. Click "+ Add Sale !" to generate an invoice.
                </td>
              </tr>
            ) : (
              sales.map(s => (
                <tr
                  key={s.id}
                  onClick={() => handleOpenPreview(s.id)}
                  className="hover:bg-blue-50/50 cursor-pointer transition"
                >
                  <td className="p-2.5 text-gray-600">{formatDate(s.invoice_date)}</td>
                  <td className="p-2.5 font-bold text-gray-800">{s.invoice_number}</td>
                  <td className="p-2.5 font-medium text-gray-900">{s.customer_name}</td>
                  <td className="p-2.5">
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                      Sale
                    </span>
                  </td>
                  <td className="p-2.5 text-gray-600">{s.payment_type}</td>
                  <td className="p-2.5 text-right font-bold text-gray-900">
                    ₹ {Number(s.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-2.5 text-right font-bold text-red-600">
                    ₹ {Number(s.balance_due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center space-x-2 text-gray-400">
                      <button onClick={() => handleOpenPreview(s.id)} className="hover:text-blue-600 p-0.5">
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => alert(`Share link for Invoice #${s.invoice_number}`)} className="hover:text-emerald-600 p-0.5">
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button className="hover:text-gray-700 p-0.5">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {previewSale && (
        <InvoicePreviewModal
          sale={previewSale}
          business={business}
          onClose={() => setPreviewSale(null)}
        />
      )}
    </div>
  );
}

