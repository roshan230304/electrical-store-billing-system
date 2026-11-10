import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { formatDate } from '../utils/formatters';
import {
  BarChart2,
  Calendar,
  FileSpreadsheet,
  Printer,
  Search,
  ChevronRight,
  TrendingUp,
  Receipt,
  BookOpen,
  Users
} from 'lucide-react';

export default function Reports() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('sale'); // 'sale' | 'daybook' | 'transactions'
  const [salesReport, setSalesReport] = useState([]);
  const [daybookEntries, setDaybookEntries] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [daybookDate, setDaybookDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['sale', 'daybook', 'transactions'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    if (activeTab === 'sale') {
      api.getSaleReport().then(res => { if (res.success) setSalesReport(res.data); });
    } else if (activeTab === 'daybook') {
      api.getDaybookReport(daybookDate).then(res => { if (res.success) setDaybookEntries(res.data); });
    } else if (activeTab === 'transactions') {
      api.getAllTransactions().then(res => { if (res.success) setAllTransactions(res.data); });
    }
  }, [activeTab, daybookDate]);

  return (
    <div className="space-y-4 text-xs">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-800">Business Reports</h1>
          <p className="text-[11px] text-gray-500">Comprehensive accounting reports, daybook, and sales analytics</p>
        </div>

        <div className="flex items-center space-x-2">
          <button onClick={() => alert('Excel export')} className="border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded text-gray-700 font-medium flex items-center space-x-1">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button onClick={() => window.print()} className="border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded text-gray-700 font-medium flex items-center space-x-1">
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-1 flex space-x-1 text-xs">
        <button
          onClick={() => setActiveTab('sale')}
          className={`flex-1 py-2 px-3 rounded-md font-semibold transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'sale' ? 'bg-[#1e2238] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Sale Report</span>
        </button>

        <button
          onClick={() => setActiveTab('daybook')}
          className={`flex-1 py-2 px-3 rounded-md font-semibold transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'daybook' ? 'bg-[#1e2238] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Daybook Report</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-2 px-3 rounded-md font-semibold transition flex items-center justify-center space-x-1.5 ${
            activeTab === 'transactions' ? 'bg-[#1e2238] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>All Transactions</span>
        </button>
      </div>

      {/* Tab 1: Sale Report */}
      {activeTab === 'sale' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-200">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Invoice #</th>
                <th className="p-2.5">Customer Name</th>
                <th className="p-2.5">Payment Type</th>
                <th className="p-2.5 text-right">Taxable</th>
                <th className="p-2.5 text-right">GST</th>
                <th className="p-2.5 text-right">Grand Total</th>
                <th className="p-2.5 text-right">Balance Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {salesReport.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">No sale transactions available.</td>
                </tr>
              ) : (
                salesReport.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="p-2.5 text-gray-600">{formatDate(s.invoice_date)}</td>
                    <td className="p-2.5 font-bold text-gray-800">{s.invoice_number}</td>
                    <td className="p-2.5 font-medium text-gray-900">{s.customer_name}</td>
                    <td className="p-2.5 text-gray-600">{s.payment_type}</td>
                    <td className="p-2.5 text-right font-medium">₹{Number(s.subtotal).toFixed(2)}</td>
                    <td className="p-2.5 text-right text-gray-600">₹{Number(s.tax_total).toFixed(2)}</td>
                    <td className="p-2.5 text-right font-bold text-gray-900">₹{Number(s.grand_total).toFixed(2)}</td>
                    <td className="p-2.5 text-right font-bold text-red-600">₹{Number(s.balance_due).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Daybook Report */}
      {activeTab === 'daybook' && (
        <div className="space-y-3">
          <div className="bg-white rounded-lg p-3 border border-gray-200 flex items-center space-x-3">
            <span className="font-semibold text-gray-700">Select Date:</span>
            <input
              type="date"
              value={daybookDate}
              onChange={(e) => setDaybookDate(e.target.value)}
              className="px-2.5 py-1 border border-gray-300 rounded outline-none"
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="p-2.5">Txn Type</th>
                  <th className="p-2.5">Ref / Bill No</th>
                  <th className="p-2.5">Party Name</th>
                  <th className="p-2.5">Payment Mode</th>
                  <th className="p-2.5 text-right text-emerald-700 font-bold">Debit (Inflow)</th>
                  <th className="p-2.5 text-right text-rose-700 font-bold">Credit (Outflow)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {daybookEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No daybook records for {formatDate(daybookDate)}.
                    </td>
                  </tr>
                ) : (
                  daybookEntries.map((e, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2.5 font-semibold text-gray-800">{e.txn_type}</td>
                      <td className="p-2.5 font-mono">{e.ref_no}</td>
                      <td className="p-2.5 font-medium">{e.party_name}</td>
                      <td className="p-2.5 text-gray-600">{e.payment_type}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-600">
                        {Number(e.debit) > 0 ? `₹${Number(e.debit).toFixed(2)}` : '-'}
                      </td>
                      <td className="p-2.5 text-right font-bold text-rose-600">
                        {Number(e.credit) > 0 ? `₹${Number(e.credit).toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: All Transactions */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-200">
              <tr>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Number</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Party</th>
                <th className="p-2.5">Payment Type</th>
                <th className="p-2.5 text-right">Total</th>
                <th className="p-2.5 text-right">Balance</th>
                <th className="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allTransactions.map((tx, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="p-2.5 font-bold">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      tx.type === 'Sale' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="p-2.5 font-mono font-bold text-gray-700">{tx.number}</td>
                  <td className="p-2.5 text-gray-600">{formatDate(tx.date)}</td>
                  <td className="p-2.5 font-medium text-gray-900">{tx.party_name}</td>
                  <td className="p-2.5 text-gray-600">{tx.payment_type}</td>
                  <td className="p-2.5 text-right font-bold text-gray-900">
                    ₹ {Number(tx.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-2.5 text-right font-bold text-red-600">
                    ₹ {Number(tx.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-2.5 text-center">
                    <span className="text-emerald-700 font-semibold">{tx.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

