import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Settings, X, Plus, Trash2, ChevronDown, Upload, Loader2 } from 'lucide-react';

const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

const BLANK_ROW = () => ({
  product_id: null,
  item_name: '',
  quantity: 1,
  unit: 'NONE',
  price_per_unit: '',
  discount_percent: 0,
  tax_rate: 'GST@18%',
  total_amount: 0
});

export default function AddPurchase() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id'); // null = create mode, number = edit mode
  const isEditMode = Boolean(editId);

  const [loadingBill, setLoadingBill] = useState(isEditMode);

  const [billNumber, setBillNumber] = useState(`PB-${Date.now().toString().slice(-4)}`);
  const [billDate, setBillDate]     = useState(new Date().toISOString().split('T')[0]);
  const [stateOfSupply, setStateOfSupply] = useState('Karnataka');

  const [parties, setParties] = useState([]);
  const [supplierName, setSupplierName] = useState('');
  const [supplierId, setSupplierId]     = useState('');
  const [phoneNumber, setPhoneNumber]   = useState('');

  const [availableProducts, setAvailableProducts] = useState([]);
  const [items, setItems] = useState([BLANK_ROW()]);

  const [paymentType, setPaymentType] = useState('Cash');
  const [paidAmount, setPaidAmount]   = useState('0');
  const [modReason, setModReason]     = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [showUploadTooltip, setShowUploadTooltip] = useState(true);

  /* ── Load reference data ── */
  useEffect(() => {
    api.getParties().then(res => {
      if (res.success) setParties(res.data.filter(p => p.party_type === 'Supplier'));
    });
    api.getItems('', '', 'Product').then(res => {
      if (res.success) setAvailableProducts(res.data);
    });
  }, []);

  /* ── Load existing bill in edit mode ── */
  useEffect(() => {
    if (!isEditMode) return;
    (async () => {
      try {
        const res = await api.getPurchaseById(editId);
        if (!res.success) {
          setError(res.message || 'Failed to load purchase bill.');
          setLoadingBill(false);
          return;
        }
        const d = res.data;
        setBillNumber(d.bill_number);
        setBillDate(d.bill_date ? d.bill_date.split('T')[0] : new Date().toISOString().split('T')[0]);
        setSupplierName(d.supplier_name || '');
        setSupplierId(d.party_id || '');
        setPhoneNumber(d.phone_number || '');

        // payments
        const paidAmt = Number(d.paid_amount || 0);
        setPaidAmount(String(paidAmt));
        setPaymentType(d.payment_type === 'Unpaid' ? 'Cash' : (d.payment_type || 'Cash'));

        // items
        if (d.items && d.items.length > 0) {
          setItems(d.items.map(it => ({
            product_id: it.product_id || null,
            item_name: it.item_name || '',
            quantity: Number(it.quantity),
            unit: it.unit || 'NONE',
            price_per_unit: Number(it.price_per_unit) || 0,
            discount_percent: Number(it.discount_percent) || 0,
            tax_rate: it.tax_rate || 'GST@18%',
            total_amount: Number(it.total_amount) || 0
          })));
        }
      } catch (err) {
        setError('Could not load bill. Please go back and try again.');
      } finally {
        setLoadingBill(false);
      }
    })();
  }, [isEditMode, editId]);

  /* ── Row updater ── */
  const updateRow = (index, updates) => {
    setItems(prev => {
      const next = [...prev];
      const cur = { ...next[index], ...updates };
      if (Object.prototype.hasOwnProperty.call(updates, 'item_name')) {
        const match = availableProducts.find(
          p => p.name.toLowerCase() === String(updates.item_name).trim().toLowerCase()
        );
        cur.product_id = match?.id || null;
        if (match) {
          cur.unit = match.unit || cur.unit;
          cur.price_per_unit = match.purchase_price ?? cur.price_per_unit;
          cur.tax_rate = `GST@${Number(match.gst_rate || 0)}%`;
        }
      }

      const qty   = parseFloat(cur.quantity || 0);
      const price = parseFloat(cur.price_per_unit || 0);
      const disc  = parseFloat(cur.discount_percent || 0);
      let gstNum = 0;
      if (cur.tax_rate?.includes('28')) gstNum = 28;
      else if (cur.tax_rate?.includes('18')) gstNum = 18;
      else if (cur.tax_rate?.includes('12')) gstNum = 12;
      else if (cur.tax_rate?.includes('5'))  gstNum = 5;

      const gross   = round2(price * qty);
      const discAmt = round2(gross * (disc / 100));
      const taxable = round2(gross - discAmt);
      cur.total_amount = round2(taxable + round2(taxable * gstNum / 100));

      next[index] = cur;
      return next;
    });
  };

  const addRow = () => setItems(prev => [...prev, BLANK_ROW()]);

  const grandTotal = round2(items.reduce((s, i) => s + Number(i.total_amount || 0), 0));
  const numPaid    = Number(paidAmount) || 0;
  const balanceDue = round2(Math.max(0, grandTotal - numPaid));

  /* ── Save / Update ── */
  const handleSave = async () => {
    if (!supplierName.trim()) { setError('Supplier Name is required.'); return; }
    setSaving(true);
    setError('');

    const payload = {
      bill_date:       billDate,
      party_id:        supplierId || null,
      supplier_name:   supplierName,
      phone_number:    phoneNumber,
      state_of_supply: stateOfSupply,
      payment_type:    paymentType,
      paid_amount:     numPaid,
      modification_reason: modReason || 'Purchase bill edited',
      items: items.filter(i => i.item_name.trim())
    };

    try {
      let res;
      if (isEditMode) {
        res = await api.updatePurchase(editId, payload);
      } else {
        res = await api.createPurchase({ bill_number: billNumber, ...payload });
      }

      if (res.success) {
        navigate('/purchases');
      } else {
        setError(res.message || `Failed to ${isEditMode ? 'update' : 'record'} purchase bill.`);
      }
    } catch (err) {
      setError('Server error while saving purchase.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Loading skeleton ── */
  if (loadingBill) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm min-h-[calc(100vh-65px)] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-sm">Loading purchase bill...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[calc(100vh-65px)] text-xs">
      {/* Tab bar */}
      <div className="h-9 bg-gray-100 border-b border-gray-200 px-3 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <div className="bg-white border-t border-x border-gray-200 rounded-t px-3 py-1 font-bold text-gray-800 flex items-center space-x-2 shadow-xs">
            <span>{isEditMode ? `Edit Purchase — ${billNumber}` : 'Purchase #1'}</span>
            <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700 cursor-pointer" onClick={() => navigate('/purchases')} />
          </div>
          {!isEditMode && (
            <button className="p-1 hover:bg-gray-200 rounded text-blue-600"><Plus className="w-3.5 h-3.5" /></button>
          )}
        </div>
        <div className="flex items-center space-x-2 text-gray-400">
          <button className="hover:text-gray-600 p-1"><Settings className="w-4 h-4" /></button>
          <button onClick={() => navigate('/purchases')} className="hover:text-gray-600 p-1"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs px-5 py-2 border-b border-red-200">{error}</div>
      )}

      {/* Main form */}
      <div className="p-4 space-y-4 flex-1">
        <div className="flex items-center space-x-2">
          <h1 className="text-sm font-bold text-gray-800">{isEditMode ? 'Edit Purchase Bill' : 'Purchase'}</h1>
          {isEditMode && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold uppercase tracking-wide">
              Editing
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Party *</label>
              <input
                type="text"
                value={supplierName}
                list="purchase-suppliers"
                onChange={(e) => {
                  const value = e.target.value;
                  const supplier = parties.find(p => p.name === value);
                  setSupplierName(value);
                  setSupplierId(supplier?.id || '');
                  if (supplier) setPhoneNumber(supplier.phone_number || '');
                }}
                placeholder="Search or enter Supplier Name"
                className="w-full px-2.5 py-1.5 border border-blue-500 rounded font-medium outline-none"
              />
              <datalist id="purchase-suppliers">
                {parties.map(p => <option key={p.id} value={p.name} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Phone No.</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone No."
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
              />
            </div>
          </div>

          <div className="md:col-span-4 bg-gray-50/70 p-3 rounded border border-gray-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Bill Number</span>
              {isEditMode ? (
                <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded select-none">{billNumber}</span>
              ) : (
                <input
                  type="text"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  className="w-28 text-right px-2 py-0.5 border border-gray-300 rounded font-bold outline-none"
                />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Bill Date</span>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="border border-gray-300 rounded px-2 py-0.5 outline-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">State of supply</span>
              <select
                value={stateOfSupply}
                onChange={(e) => setStateOfSupply(e.target.value)}
                className="border border-gray-300 rounded px-2 py-0.5 bg-white outline-none"
              >
                <option value="Karnataka">Karnataka</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi">Delhi</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Rajasthan">Rajasthan</option>
              </select>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-gray-200 rounded overflow-visible mt-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-gray-100 text-[10px] font-bold text-gray-600 uppercase border-b border-gray-200">
              <tr>
                <th className="p-2 w-8 text-center">#</th>
                <th className="p-2 min-w-[220px]">ITEM</th>
                <th className="p-2 w-16 text-center">QTY</th>
                <th className="p-2 w-20 text-center">UNIT</th>
                <th className="p-2 w-28 text-right">PRICE/UNIT</th>
                <th className="p-2 w-20 text-right">DISC%</th>
                <th className="p-2 w-28 text-center">TAX</th>
                <th className="p-2 w-24 text-right">AMOUNT</th>
                <th className="p-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row, idx) => (
                <tr key={idx}>
                  <td className="p-2 text-center text-gray-400">{idx + 1}</td>
                  <td className="p-1">
                    <input
                      type="text"
                      value={row.item_name}
                      onChange={(e) => updateRow(idx, { item_name: e.target.value })}
                      list="purchase-products"
                      placeholder="Item name..."
                      className="w-full px-2 py-1 border border-gray-300 rounded font-medium outline-none"
                    />
                    <datalist id="purchase-products">
                      {availableProducts.map(p => <option key={p.id} value={p.name} />)}
                    </datalist>
                  </td>
                  <td className="p-1">
                    <input
                      type="number" min="1"
                      value={row.quantity}
                      onChange={(e) => updateRow(idx, { quantity: e.target.value })}
                      className="w-full px-2 py-1 text-center border border-gray-300 rounded outline-none"
                    />
                  </td>
                  <td className="p-1">
                    <select
                      value={row.unit}
                      onChange={(e) => updateRow(idx, { unit: e.target.value })}
                      className="w-full px-1 py-1 border border-gray-300 rounded bg-white text-[11px] outline-none"
                    >
                      <option value="NONE">NONE</option>
                      <option value="PCS">PCS</option>
                      <option value="BOX">BOX</option>
                      <option value="KG">KG</option>
                      <option value="MTR">MTR</option>
                      <option value="LTR">LTR</option>
                      <option value="SET">SET</option>
                    </select>
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      value={row.price_per_unit}
                      onChange={(e) => updateRow(idx, { price_per_unit: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-2 py-1 text-right border border-gray-300 rounded font-semibold outline-none"
                    />
                  </td>
                  <td className="p-1">
                    <input
                      type="number"
                      value={row.discount_percent}
                      onChange={(e) => updateRow(idx, { discount_percent: e.target.value })}
                      placeholder="%"
                      className="w-full px-1.5 py-1 text-right border border-gray-300 rounded outline-none"
                    />
                  </td>
                  <td className="p-1">
                    <select
                      value={row.tax_rate}
                      onChange={(e) => updateRow(idx, { tax_rate: e.target.value })}
                      className="w-full px-1 py-1 border border-gray-300 rounded bg-white text-[11px] outline-none"
                    >
                      <option value="None">None</option>
                      <option value="GST@5%">GST@5%</option>
                      <option value="GST@12%">GST@12%</option>
                      <option value="GST@18%">GST@18%</option>
                      <option value="GST@28%">GST@28%</option>
                    </select>
                  </td>
                  <td className="p-2 text-right font-bold text-gray-900">
                    ₹{Number(row.total_amount).toFixed(2)}
                  </td>
                  <td className="p-1 text-center">
                    <button type="button"
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                      className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={2} className="p-2">
                  <button type="button" onClick={addRow}
                    className="px-3 py-1 border border-blue-400 text-blue-600 hover:bg-blue-50 rounded text-xs font-semibold flex items-center space-x-1">
                    <Plus className="w-3.5 h-3.5" /><span>ADD ROW</span>
                  </button>
                </td>
                <td colSpan={5} className="p-2 text-right font-bold uppercase text-gray-600">TOTAL</td>
                <td className="p-2 text-right font-extrabold text-sm text-gray-900">₹{grandTotal.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Lower section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 items-start">
          <div className="space-y-3">
            <div className="bg-gray-50 border border-gray-200 rounded p-3 w-64 space-y-2">
              <label className="block text-[11px] font-semibold text-gray-700">Payment Type</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded bg-white font-medium outline-none"
              >
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank">Bank Transfer</option>
                <option value="UPI">UPI</option>
              </select>
            </div>

            {/* Edit reason field */}
            {isEditMode && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 w-64 space-y-2">
                <label className="block text-[11px] font-semibold text-amber-800">Reason for Edit</label>
                <input
                  type="text"
                  value={modReason}
                  onChange={(e) => setModReason(e.target.value)}
                  placeholder="e.g. Corrected quantity"
                  className="w-full px-2 py-1 border border-amber-300 rounded bg-white text-xs outline-none"
                />
              </div>
            )}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center text-sm font-bold">
              <span>Total</span>
              <span className="text-base text-gray-900">₹{grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Paid Amount</span>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-28 text-right px-2 py-1 border border-gray-300 rounded font-bold outline-none"
              />
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-red-600 pt-2 border-t border-gray-200">
              <span>Balance Due</span>
              <span>₹{balanceDue.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 px-5 bg-gray-50 border-t border-gray-200 flex justify-between items-center relative">
        <div className="relative">
          {!isEditMode && (
            <>
              <button type="button"
                onClick={() => alert('Select invoice PDF/image to auto-extract purchase data')}
                className="border border-gray-300 hover:bg-gray-100 text-gray-700 px-3.5 py-1.5 rounded text-xs font-medium flex items-center space-x-1">
                <Upload className="w-3.5 h-3.5 text-gray-500" /><span>Upload Bill</span>
              </button>
              {showUploadTooltip && (
                <div className="absolute left-0 bottom-full mb-2 bg-white border border-gray-200 shadow-2xl rounded-lg p-3 w-56 text-xs z-40">
                  <p className="font-bold text-gray-900">Upload Purchase Bill</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                    Upload the image/PDF of your bill and create purchase bill instantly
                  </p>
                  <div className="mt-2 text-right">
                    <button type="button" onClick={() => setShowUploadTooltip(false)}
                      className="bg-[#e01a4f] text-white px-2.5 py-0.5 rounded font-bold text-[10px]">
                      Got It!
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex space-x-3">
          <button type="button" onClick={() => navigate('/purchases')}
            className="px-3 py-1.5 border border-gray-300 rounded text-xs text-gray-700 font-medium flex items-center">
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={handleSave}
            className={`px-8 py-2 text-white rounded text-xs font-bold transition shadow-sm disabled:opacity-60 ${
              isEditMode
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-[#1976d2] hover:bg-[#1565c0]'
            }`}>
            {saving ? 'Saving...' : (isEditMode ? 'Update Bill' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
