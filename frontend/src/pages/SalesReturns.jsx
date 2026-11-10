import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  RotateCcw, Search, Plus, CheckCircle2, AlertTriangle, ArrowLeft,
  X, Filter, Calendar, FileText, ShoppingBag, DollarSign
} from 'lucide-react';

export default function SalesReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Modal State for New Return
  const [searchInvoiceNo, setSearchInvoiceNo] = useState('');
  const [foundSale, setFoundSale] = useState(null);
  const [searchingSale, setSearchingSale] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [refundMode, setRefundMode] = useState('Cash');
  const [returnReason, setReturnReason] = useState('Defective / Damaged');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReturns();
  }, [search]);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const res = await api.getReturns({ search });
      if (res.success) setReturns(res.data || []);
    } catch (err) {
      console.error('Failed to load returns:', err);
    } finally {
      setLoading(false);
    }
  };

  // Find sale by invoice number to return items
  const handleLookupInvoice = async (e) => {
    e.preventDefault();
    if (!searchInvoiceNo.trim()) return;

    try {
      setSearchingSale(true);
      const res = await api.getSales({ search: searchInvoiceNo.trim() });
      if (res.success && res.data && res.data.length > 0) {
        const sale = res.data[0];
        // Fetch full sale detail
        const detail = await api.getSaleById(sale.id);
        if (detail.success) {
          setFoundSale(detail.data);
          // Initialize return items map
          setReturnItems(
            detail.data.items.map(it => ({
              sale_item_id: it.sale_item_id || it.id,
              product_id: it.product_id,
              item_name: it.item_name,
              original_quantity: Number(it.quantity),
              line_total: Number(it.total_amount || 0),
              max_qty: Number(it.returnable_quantity ?? it.quantity),
              quantity: 0,
              unit: it.unit || 'PCS',
              price_per_unit: parseFloat(it.price_per_unit),
              tax_rate: it.tax_rate,
              refund_amount: 0
            }))
          );
        }
      } else {
        alert('Invoice not found. Please verify the invoice number.');
      }
    } catch (err) {
      alert('Error searching invoice: ' + err.message);
    } finally {
      setSearchingSale(false);
    }
  };

  const handleItemQtyChange = (idx, qty) => {
    setReturnItems(prev => {
      const updated = [...prev];
      const max = updated[idx].max_qty;
      const validQty = Math.min(max, Math.max(0, parseFloat(qty) || 0));
      updated[idx].quantity = validQty;
      const sourceTotal = (foundSale?.items || []).reduce(
        (sum, line) => sum + Number(line.total_amount || 0),
        0
      );
      const invoiceAllocation = sourceTotal > 0
        ? Number(foundSale.grand_total || 0) / sourceTotal
        : 0;
      updated[idx].refund_amount = validQty * updated[idx].line_total /
        updated[idx].original_quantity * invoiceAllocation;
      return updated;
    });
  };

  const totalRefund = returnItems.reduce((sum, it) => sum + it.refund_amount, 0);

  const handleSubmitReturn = async () => {
    const activeItems = returnItems.filter(it => it.quantity > 0);
    if (activeItems.length === 0) {
      alert('Please select at least one item quantity to return.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        sale_id: foundSale.id,
        invoice_number: foundSale.invoice_number,
        party_id: foundSale.party_id,
        customer_name: foundSale.customer_name,
        refund_mode: refundMode,
        return_reason: returnReason,
        items: activeItems.map(item => ({
          ...item,
          sale_item_id: item.sale_item_id
        }))
      };

      const res = await api.createReturn(payload);
      if (res.success) {
        alert(`Sales Return #${res.data.return_number} processed! Stock has been restocked and refund recorded.`);
        setShowAddModal(false);
        setFoundSale(null);
        setSearchInvoiceNo('');
        loadReturns();
      } else {
        alert(res.message || 'Failed to process return.');
      }
    } catch (err) {
      alert('Return error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f6f9] overflow-hidden select-none">
      {/* Header Bar */}
      <div className="h-12 bg-white border-b border-gray-200 px-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2">
          <RotateCcw className="w-5 h-5 text-red-600" />
          <h1 className="font-bold text-gray-800 text-sm">Sales Returns & Refunds</h1>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
            {returns.length} records
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search return # or invoice #..."
              className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 rounded text-xs outline-none focus:border-blue-500 w-56"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#e01a4f] hover:bg-[#c71342] text-white px-3 py-1.5 rounded font-bold text-xs shadow-sm flex items-center space-x-1 transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Process Return</span>
          </button>
        </div>
      </div>

      {/* Returns List */}
      <div className="flex-1 overflow-y-auto p-4">
        {returns.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
            <RotateCcw className="w-12 h-12 stroke-[1.2] text-gray-300" />
            <p className="text-xs font-medium">No sales returns recorded yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded text-xs font-semibold"
            >
              + Create First Return
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Return No</th>
                  <th className="py-2.5 px-3">Orig Invoice</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Refund Mode</th>
                  <th className="py-2.5 px-3 text-right">Refund Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {returns.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition">
                    <td className="py-2.5 px-3 text-gray-600">{formatDate(r.return_date)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{r.return_number}</td>
                    <td className="py-2.5 px-3 font-mono text-gray-700">Inv #{r.invoice_number}</td>
                    <td className="py-2.5 px-3 font-medium text-gray-900">{r.customer_name}</td>
                    <td className="py-2.5 px-3 text-gray-600">{r.return_reason}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold text-[10px]">
                        {r.refund_mode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-red-600">
                      {formatCurrency(r.total_refund_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Process Return Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-red-50">
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-red-600" />
                <span className="font-bold text-gray-900 text-sm">Create Sales Return & Refund</span>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Lookup Invoice */}
              {!foundSale ? (
                <form onSubmit={handleLookupInvoice} className="space-y-3">
                  <label className="block text-gray-700 font-bold">Find Original Invoice Number</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={searchInvoiceNo}
                      onChange={(e) => setSearchInvoiceNo(e.target.value)}
                      placeholder="e.g. 1 or 2..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded outline-none focus:border-blue-500 font-mono text-xs"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={searchingSale}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold transition"
                    >
                      {searchingSale ? 'Searching...' : 'Find Invoice'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  {/* Found Invoice Banner */}
                  <div className="bg-gray-50 border border-gray-200 rounded p-3 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-gray-800">
                        Invoice #{foundSale.invoice_number} ({formatDate(foundSale.invoice_date)})
                      </div>
                      <div className="text-[11px] text-gray-600 mt-0.5">
                        Customer: <span className="font-semibold">{foundSale.customer_name}</span> • Paid: {formatCurrency(foundSale.grand_total)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFoundSale(null)}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Change Invoice
                    </button>
                  </div>

                  {/* Return Items Selection */}
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">Select Items & Quantities to Return:</label>
                    <div className="border border-gray-200 rounded overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-gray-100 text-gray-600 font-semibold">
                            <th className="p-2">Item</th>
                            <th className="p-2 text-center">Sold Qty</th>
                            <th className="p-2 text-center">Unit Price</th>
                            <th className="p-2 text-center">Return Qty</th>
                            <th className="p-2 text-right">Refund</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {returnItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-2 font-medium">{item.item_name}</td>
                              <td className="p-2 text-center text-gray-500">{item.max_qty} {item.unit}</td>
                              <td className="p-2 text-center">{formatCurrency(item.price_per_unit)}</td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.max_qty}
                                  step="any"
                                  value={item.quantity}
                                  onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                                  className="w-16 px-1.5 py-0.5 text-center font-bold border border-gray-300 rounded outline-none focus:border-red-500"
                                />
                              </td>
                              <td className="p-2 text-right font-bold text-red-600">
                                {formatCurrency(item.refund_amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Refund details */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">Return Reason</label>
                      <select
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded outline-none focus:border-blue-500"
                      >
                        <option value="Defective / Damaged">Defective / Damaged</option>
                        <option value="Customer Change of Mind">Customer Change of Mind</option>
                        <option value="Expired Product">Expired Product</option>
                        <option value="Wrong Item Billed">Wrong Item Billed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">Refund Method</label>
                      <select
                        value={refundMode}
                        onChange={(e) => setRefundMode(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded outline-none focus:border-blue-500"
                      >
                        <option value="Cash">Cash Refund</option>
                        <option value="Bank">Bank / UPI Transfer</option>
                        <option value="Store Credit">Store Credit</option>
                      </select>
                    </div>
                  </div>

                  {/* Total Refund Banner */}
                  <div className="bg-red-50 border border-red-200 rounded p-3 flex justify-between items-center font-bold">
                    <span className="text-gray-800">Total Refund to Customer:</span>
                    <span className="text-lg text-red-700">{formatCurrency(totalRefund)}</span>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded font-medium hover:bg-gray-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitReturn}
                      disabled={totalRefund === 0 || submitting}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold shadow-md transition disabled:opacity-50"
                    >
                      {submitting ? 'Processing...' : 'Confirm Return & Restock'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
