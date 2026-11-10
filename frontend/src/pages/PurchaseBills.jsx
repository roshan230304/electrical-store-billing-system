import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { formatDate } from '../utils/formatters';
import {
  Plus, Search, Printer, FileSpreadsheet, Eye,
  Pencil, Trash2, ChevronDown, Upload, X, AlertTriangle, History
} from 'lucide-react';

/* ─── Print helper ─────────────────────────────────────────────── */
function printPurchaseBill(purchase) {
  if (!purchase) return;
  const itemsHtml = (purchase.items || []).map((it, i) => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:6px 8px">${i + 1}</td>
      <td style="padding:6px 8px">${it.item_name}</td>
      <td style="padding:6px 8px;text-align:center">${Number(it.quantity)}</td>
      <td style="padding:6px 8px;text-align:center">${it.unit || ''}</td>
      <td style="padding:6px 8px;text-align:right">₹${Number(it.price_per_unit).toFixed(2)}</td>
      <td style="padding:6px 8px;text-align:right">₹${Number(it.total_amount).toFixed(2)}</td>
    </tr>`).join('');

  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>Purchase Bill ${purchase.bill_number}</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px}table{width:100%;border-collapse:collapse}
    th{background:#f3f4f6;padding:7px 8px;text-align:left;border-bottom:2px solid #d1d5db}
    @media print{button{display:none}}</style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div><h2 style="margin:0;font-size:18px">PURCHASE BILL</h2>
        <p style="margin:4px 0;color:#6b7280">Bill #: <strong>${purchase.bill_number}</strong></p>
        <p style="margin:4px 0;color:#6b7280">Date: ${formatDate(purchase.bill_date)}</p>
      </div>
      <div style="text-align:right">
        <p style="margin:4px 0;font-weight:bold">${purchase.supplier_name}</p>
        ${purchase.phone_number ? `<p style="margin:4px 0;color:#6b7280">${purchase.phone_number}</p>` : ''}
      </div>
    </div>
    <table><thead><tr>
      <th>#</th><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:center">Unit</th>
      <th style="text-align:right">Price</th><th style="text-align:right">Total</th>
    </tr></thead><tbody>${itemsHtml}</tbody></table>
    <div style="margin-top:16px;text-align:right">
      <p>Subtotal: ₹${Number(purchase.subtotal).toFixed(2)}</p>
      <p>GST: ₹${Number(purchase.tax_total).toFixed(2)}</p>
      <p style="font-size:15px;font-weight:bold">Grand Total: ₹${Number(purchase.grand_total).toFixed(2)}</p>
      <p style="color:${Number(purchase.balance_due) > 0 ? '#dc2626' : '#16a34a'}">
        Balance Due: ₹${Number(purchase.balance_due).toFixed(2)}</p>
    </div>
    <p style="margin-top:20px;text-align:center"><button onclick="window.print()">🖨️ Print</button></p>
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 400);
}

/* ─── View Modal ────────────────────────────────────────────────── */
function ViewModal({ purchase, onClose, onPrint }) {
  if (!purchase) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-bold text-gray-900">Purchase Bill</h2>
            <p className="text-xs text-gray-500 mt-0.5">#{purchase.bill_number} · {formatDate(purchase.bill_date)}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={onPrint}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition">
              <Printer className="w-3.5 h-3.5" /><span>Print</span>
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-600" /></button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Supplier */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 font-medium mb-1">Supplier</p>
              <p className="font-bold text-gray-900">{purchase.supplier_name}</p>
              {purchase.phone_number && <p className="text-gray-600">{purchase.phone_number}</p>}
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-500 font-medium mb-1">Payment</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                purchase.status === 'Paid' ? 'bg-green-100 text-green-800' :
                purchase.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                {purchase.status}
              </span>
              <p className="text-gray-600 mt-1">Paid: ₹{Number(purchase.paid_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <p className="text-red-600 font-bold">Due: ₹{Number(purchase.balance_due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Items table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Item', 'Qty', 'Unit', 'Price/Unit', 'GST%', 'Total'].map(h => (
                    <th key={h} className="p-2.5 text-left text-[10px] font-bold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(purchase.items || []).map((it, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="p-2.5 text-gray-500">{i + 1}</td>
                    <td className="p-2.5 font-medium text-gray-900">{it.item_name}</td>
                    <td className="p-2.5 text-gray-700">{Number(it.quantity)}</td>
                    <td className="p-2.5 text-gray-600">{it.unit}</td>
                    <td className="p-2.5 text-gray-700">₹{Number(it.price_per_unit).toFixed(2)}</td>
                    <td className="p-2.5 text-gray-600">{Number(it.gst_rate || 0)}%</td>
                    <td className="p-2.5 font-bold text-gray-900">₹{Number(it.total_amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-56 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span className="font-medium">₹{Number(purchase.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">GST</span><span className="font-medium">₹{Number(purchase.tax_total).toFixed(2)}</span></div>
              {Number(purchase.discount_total) > 0 && (
                <div className="flex justify-between text-green-700"><span>Discount</span><span>-₹{Number(purchase.discount_total).toFixed(2)}</span></div>
              )}
              <div className="flex justify-between border-t pt-1.5 text-sm font-bold">
                <span>Grand Total</span>
                <span>₹{Number(purchase.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Edit history */}
          {(purchase.history || []).length > 0 && (
            <div className="border-t pt-3">
              <p className="text-xs font-bold text-gray-700 flex items-center space-x-1 mb-2">
                <History className="w-3.5 h-3.5" /><span>Edit History</span>
              </p>
              <div className="space-y-1.5">
                {purchase.history.map(h => (
                  <div key={h.history_id} className="bg-amber-50 border border-amber-200 rounded p-2 text-[11px]">
                    <span className="text-gray-500">{new Date(h.modified_at).toLocaleString('en-IN')}</span>
                    <span className="mx-1 text-gray-400">·</span>
                    <span className="text-gray-700">{h.modification_reason}</span>
                    <span className="mx-1 text-gray-400">·</span>
                    <span className="text-gray-600">
                      ₹{Number(h.previous_grand_total).toFixed(2)} → ₹{Number(h.new_grand_total).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Delete Confirm Modal ──────────────────────────────────────── */
function DeleteModal({ purchase, onClose, onConfirm, deleting }) {
  if (!purchase) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start space-x-3 mb-4">
          <div className="bg-red-100 p-2 rounded-full"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Delete Purchase Bill</h3>
            <p className="text-xs text-gray-500 mt-1">
              Delete <strong>{purchase.bill_number}</strong> from <strong>{purchase.supplier_name}</strong>?
              This will reverse all stock changes and cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex space-x-2 justify-end">
          <button onClick={onClose} disabled={deleting}
            className="px-4 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="px-4 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function PurchaseBills() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [summary, setSummary] = useState({ paid: 0, unpaid: 0, total: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [viewPurchase, setViewPurchase] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [deletePurchase, setDeletePurchase] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadPurchases = useCallback(async () => {
    try {
      const res = await api.getPurchases({ search });
      if (res.success) {
        setPurchases(res.data);
        if (res.summary) setSummary(res.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { loadPurchases(); }, [loadPurchases]);

  const handleView = async (p) => {
    setViewLoading(true);
    try {
      const res = await api.getPurchaseById(p.id);
      if (res.success) setViewPurchase(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setViewLoading(false);
    }
  };

  const handleEdit = (p) => navigate(`/add-purchase?id=${p.id}`);

  const handleDeleteConfirm = async () => {
    if (!deletePurchase) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await api.deletePurchase(deletePurchase.id);
      if (res.success) {
        setDeletePurchase(null);
        loadPurchases();
      } else {
        setDeleteError(res.message || 'Failed to delete purchase bill.');
      }
    } catch (err) {
      setDeleteError('Server error while deleting.');
    } finally {
      setDeleting(false);
    }
  };

  const fmt = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-800">Purchase Bills</h1>
        <div className="flex items-center space-x-2">
          <button onClick={() => navigate('/add-purchase')}
            className="border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-xs font-semibold flex items-center transition">
            <Upload className="w-3.5 h-3.5 mr-1 text-gray-500" />
            <span>Upload Purchase Bills</span>
            <ChevronDown className="w-3.5 h-3.5 ml-1 text-gray-400" />
          </button>
          <button onClick={() => navigate('/add-purchase')}
            className="bg-[#e01a4f] hover:bg-[#c71342] text-white px-3.5 py-1.5 rounded text-xs font-bold flex items-center shadow-sm transition active:scale-95">
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
            Add Purchase
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between text-xs text-gray-700 bg-white p-2.5 rounded-lg border border-gray-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="border border-gray-200 rounded px-2.5 py-1 bg-gray-50 flex items-center cursor-pointer">
            <span>This Month</span><ChevronDown className="w-3 h-3 ml-1 text-gray-400" />
          </div>
          <span className="text-gray-500 text-[11px]">Between</span>
          <div className="border border-gray-200 rounded px-2.5 py-1 bg-gray-50 text-gray-700 font-medium">
            01/10/2026 To 31/10/2026
          </div>
          <div className="border border-gray-200 rounded px-2.5 py-1 bg-gray-50 flex items-center cursor-pointer">
            <span>ALL FIRMS</span><ChevronDown className="w-3 h-3 ml-1 text-gray-400" />
          </div>
        </div>
        <div className="flex items-center space-x-2 text-gray-500">
          <button onClick={() => alert('Excel export')} className="p-1 hover:bg-gray-100 rounded text-emerald-600 flex items-center space-x-1">
            <FileSpreadsheet className="w-3.5 h-3.5" /><span className="text-[10px]">Excel Report</span>
          </button>
          <button onClick={() => window.print()} className="p-1 hover:bg-gray-100 rounded text-gray-600 flex items-center space-x-1">
            <Printer className="w-3.5 h-3.5" /><span className="text-[10px]">Print</span>
          </button>
        </div>
      </div>

      {/* KPI cards: Paid + Unpaid = Total */}
      <div className="flex items-center space-x-3 text-xs">
        <div className="bg-[#d1fae5] border border-emerald-200 rounded-lg px-4 py-2.5 min-w-[130px]">
          <div className="text-[11px] text-emerald-800 font-medium">Paid</div>
          <div className="text-base font-bold text-emerald-900 mt-0.5">₹ {fmt(summary.paid)}</div>
        </div>
        <span className="text-gray-400 font-bold text-lg">+</span>
        <div className="bg-[#dbeafe] border border-blue-200 rounded-lg px-4 py-2.5 min-w-[130px]">
          <div className="text-[11px] text-blue-800 font-medium">Unpaid</div>
          <div className="text-base font-bold text-blue-900 mt-0.5">₹ {fmt(summary.unpaid)}</div>
        </div>
        <span className="text-gray-400 font-bold text-lg">=</span>
        <div className="bg-[#ffedd5] border border-amber-200 rounded-lg px-4 py-2.5 min-w-[130px]">
          <div className="text-[11px] text-amber-800 font-medium">Total</div>
          <div className="text-base font-bold text-amber-900 mt-0.5">₹ {fmt(summary.total)}</div>
        </div>
      </div>

      {/* Delete error banner */}
      {deleteError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError('')}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Transactions table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wide text-gray-700">TRANSACTIONS</span>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search purchases..."
              className="pl-7 pr-2 py-1 text-xs border border-gray-200 rounded outline-none"
            />
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-200">
            <tr>
              <th className="p-2.5">DATE</th>
              <th className="p-2.5">INVOICE NO.</th>
              <th className="p-2.5">PARTY NAME</th>
              <th className="p-2.5">PAYMENT TYPE</th>
              <th className="p-2.5 text-right">AMOUNT</th>
              <th className="p-2.5 text-right">BALANCE DUE</th>
              <th className="p-2.5 text-center w-28">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">Loading...</td></tr>
            ) : purchases.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-400">
                No purchase bills recorded. Click "+ Add Purchase" to record new supplier inventory.
              </td></tr>
            ) : (
              purchases.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="p-2.5 text-gray-600">{formatDate(p.bill_date)}</td>
                  <td className="p-2.5 font-bold text-gray-800">{p.bill_number}</td>
                  <td className="p-2.5 font-medium text-gray-900">{p.supplier_name}</td>
                  <td className="p-2.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      p.status === 'Paid' ? 'bg-green-100 text-green-800' :
                      p.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-700'
                    }`}>{p.status}</span>
                  </td>
                  <td className="p-2.5 text-right font-bold text-gray-900">₹ {fmt(p.grand_total)}</td>
                  <td className="p-2.5 text-right font-bold text-red-600">₹ {fmt(p.balance_due)}</td>
                  <td className="p-2.5 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      {/* View */}
                      <button
                        onClick={() => handleView(p)}
                        disabled={viewLoading}
                        title="View bill details"
                        className="p-1 hover:bg-blue-50 hover:text-blue-600 rounded text-gray-400 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => handleEdit(p)}
                        title="Edit bill"
                        className="p-1 hover:bg-amber-50 hover:text-amber-600 rounded text-gray-400 transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {/* Print */}
                      <button
                        onClick={async () => {
                          const res = await api.getPurchaseById(p.id);
                          if (res.success) printPurchaseBill(res.data);
                        }}
                        title="Print bill"
                        className="p-1 hover:bg-gray-100 hover:text-gray-700 rounded text-gray-400 transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => { setDeleteError(''); setDeletePurchase(p); }}
                        title="Delete bill"
                        className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-gray-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* View Modal */}
      {viewPurchase && (
        <ViewModal
          purchase={viewPurchase}
          onClose={() => setViewPurchase(null)}
          onPrint={() => printPurchaseBill(viewPurchase)}
        />
      )}

      {/* Delete Confirm Modal */}
      {deletePurchase && (
        <DeleteModal
          purchase={deletePurchase}
          onClose={() => { setDeletePurchase(null); setDeleteError(''); }}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
        />
      )}
    </div>
  );
}
