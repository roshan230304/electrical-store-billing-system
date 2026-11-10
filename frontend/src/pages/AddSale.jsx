import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import InvoicePreviewModal from '../components/invoice/InvoicePreviewModal';
import {
  Calculator,
  Settings,
  X,
  Plus,
  Trash2,
  ChevronDown,
  Search,
  Check
} from 'lucide-react';

const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

export default function AddSale() {
  const navigate = useNavigate();
  const { business } = useAuth();

  // Mode: Credit vs Cash toggle
  const [isCashSale, setIsCashSale] = useState(false);

  // Invoice Meta
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [stateOfSupply, setStateOfSupply] = useState('Karnataka');

  // Customer / Party
  const [parties, setParties] = useState([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [customerBalance, setCustomerBalance] = useState(0);

  // Line items
  const [availableProducts, setAvailableProducts] = useState([]);
  const [activeItemSearchIndex, setActiveItemSearchIndex] = useState(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  const [items, setItems] = useState([
    {
      product_id: null,
      item_name: '',
      hsn_code: '',
      quantity: 1,
      unit: 'NONE',
      price_per_unit: '',
      price_tax_type: 'Without Tax',
      discount_percent: 0,
      discount_amount: 0,
      tax_rate: 'GST@18%',
      tax_amount: 0,
      total_amount: 0
    }
  ]);

  // Payment & Totals
  const [paymentType, setPaymentType] = useState('Cash');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [roundOffEnabled, setRoundOffEnabled] = useState(true);
  const [roundOffAmount, setRoundOffAmount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedChecked, setReceivedChecked] = useState(true);
  const [notes, setNotes] = useState('');

  // Status & Saved modal
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedSale, setSavedSale] = useState(null);

  useEffect(() => {
    // 1. Fetch next invoice number
    api.getNextInvoiceNumber().then(res => {
      if (res.success) setInvoiceNumber(String(res.next_invoice_no));
    });

    // 2. Fetch parties
    api.getParties().then(res => {
      if (res.success) setParties(res.data);
    });

    // 3. Fetch products
    api.getItems().then(res => {
      if (res.success) setAvailableProducts(res.data);
    });

    // 4. Fetch bank accounts
    api.getBankAccounts().then(res => {
      if (res.success) {
        setBankAccounts(res.data);
        if (res.data.length > 0) setSelectedBankId(res.data[0].id);
      }
    });
  }, []);

  // When party changes
  const handlePartySelect = (partyId) => {
    setSelectedPartyId(partyId);
    const p = parties.find(x => String(x.id) === String(partyId));
    if (p) {
      setCustomerName(p.name);
      setPhoneNumber(p.phone_number || '');
      setBillingAddress(p.billing_address || '');
      setCustomerBalance(Number(p.current_balance || 0));
    } else {
      setCustomerBalance(0);
    }
  };

  // Recalculate row amounts
  const updateRow = (index, updates) => {
    setItems(prev => {
      const next = [...prev];
      const cur = { ...next[index], ...updates };

      const qty = parseFloat(cur.quantity || 0);
      const rawPrice = parseFloat(cur.price_per_unit || 0);
      const discPct = parseFloat(cur.discount_percent || 0);
      const taxRateStr = cur.tax_rate || 'None';

      let taxRateNum = 0;
      if (taxRateStr.includes('18')) taxRateNum = 18;
      else if (taxRateStr.includes('12')) taxRateNum = 12;
      else if (taxRateStr.includes('5')) taxRateNum = 5;
      else if (taxRateStr.includes('28')) taxRateNum = 28;

      let basePrice = rawPrice;
      if (cur.price_tax_type === 'With Tax' && taxRateNum > 0) {
        basePrice = round2(rawPrice / (1 + taxRateNum / 100));
      }

      const gross = round2(basePrice * qty);
      const discAmt = round2(gross * (discPct / 100));
      const taxable = round2(gross - discAmt);
      const taxAmt = round2(taxable * (taxRateNum / 100));
      const total = round2(taxable + taxAmt);

      cur.discount_amount = discAmt;
      cur.tax_amount = taxAmt;
      cur.total_amount = total;

      next[index] = cur;
      return next;
    });
  };

  const addRow = () => {
    setItems(prev => [
      ...prev,
      {
        product_id: null,
        item_name: '',
        hsn_code: '',
        quantity: 1,
        unit: 'NONE',
        price_per_unit: '',
        price_tax_type: 'Without Tax',
        discount_percent: 0,
        discount_amount: 0,
        tax_rate: 'GST@18%',
        tax_amount: 0,
        total_amount: 0
      }
    ]);
  };

  const removeRow = (index) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSelectItem = (index, product) => {
    // If sale_price is With Tax in product, back it out or keep as selected
    let unitPrice = Number(product.sale_price);
    let taxType = product.sale_price_tax_type || 'Without Tax';

    if (taxType === 'With Tax' && product.tax_rate === 'GST@18%') {
      // 1800 with tax becomes 1525.42 without tax (as seen in video frame_0540s_027.jpg!)
      unitPrice = round2(unitPrice / 1.18);
      taxType = 'Without Tax';
    }

    updateRow(index, {
      product_id: product.id,
      item_name: product.name,
      hsn_code: product.hsn_code || '',
      unit: product.unit || 'NONE',
      price_per_unit: unitPrice,
      price_tax_type: taxType,
      discount_percent: Number(product.discount_value || 0),
      tax_rate: product.tax_rate || 'GST@18%'
    });

    setActiveItemSearchIndex(null);
  };

  // Grand Totals Calculation
  const subtotal = round2(items.reduce((s, i) => s + (Number(i.quantity) * Number(i.price_per_unit || 0)), 0));
  const totalDiscount = round2(items.reduce((s, i) => s + Number(i.discount_amount || 0), 0));
  const totalTax = round2(items.reduce((s, i) => s + Number(i.tax_amount || 0), 0));
  const rawGrandTotal = round2(subtotal - totalDiscount + totalTax);

  // Round off calculation matching video frame_0540s_027.jpg
  const roundedGrandTotal = roundOffEnabled ? Math.round(rawGrandTotal) : rawGrandTotal;
  const computedRoundOff = round2(roundedGrandTotal - rawGrandTotal);
  const grandTotal = round2(roundedGrandTotal);

  const numReceived = receivedChecked ? (Number(receivedAmount) || 0) : 0;
  const balanceDue = round2(Math.max(0, grandTotal - numReceived));

  const handleSaveInvoice = async () => {
    if (!customerName.trim() && !isCashSale) {
      setError('Please select or enter Customer Name.');
      return;
    }

    const validItems = items.filter(i => i.item_name.trim());
    if (validItems.length === 0) {
      setError('Please add at least one line item with an item name.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        is_cash_sale: isCashSale,
        party_id: selectedPartyId || null,
        customer_name: isCashSale ? 'Cash Sale' : customerName,
        phone_number: phoneNumber,
        billing_address: billingAddress,
        state_of_supply: stateOfSupply,
        payment_type: paymentType,
        bank_account_id: paymentType === 'GPAY' || paymentType === 'Bank' ? selectedBankId : null,
        round_off: computedRoundOff,
        received_amount: numReceived,
        notes,
        theme_name: 'Tally Theme',
        items: validItems
      };

      const res = await api.createSale(payload);
      if (res.success) {
        // Fetch full sale to show in the preview modal
        const fullSaleRes = await api.getSaleById(res.data.id);
        if (fullSaleRes.success) {
          setSavedSale(fullSaleRes.data);
        }
      } else {
        setError(res.message || 'Failed to save sale invoice.');
      }
    } catch (err) {
      setError('Server connection error while saving invoice.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[calc(100vh-65px)] text-xs">
      {/* Top Tab Bar matching video frame_0490s_025.jpg: "Sale #1" */}
      <div className="h-9 bg-gray-100 border-b border-gray-200 px-3 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <div className="bg-white border-t border-x border-gray-200 rounded-t px-3 py-1 font-bold text-gray-800 flex items-center space-x-2 shadow-xs">
            <span>Sale #{invoiceNumber || '1'}</span>
            <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700 cursor-pointer" />
          </div>
          <button className="p-1 hover:bg-gray-200 rounded text-blue-600" title="Open new sale tab">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center space-x-2 text-gray-400">
          <button className="hover:text-gray-600 p-1"><Calculator className="w-4 h-4" /></button>
          <button className="hover:text-gray-600 p-1"><Settings className="w-4 h-4" /></button>
          <button onClick={() => navigate('/sales')} className="hover:text-gray-600 p-1"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs px-5 py-2 border-b border-red-200">
          {error}
        </div>
      )}

      {/* Main Form Area */}
      <div className="p-4 space-y-4 flex-1">
        {/* Title & Mode Switcher matching frame_0490s_025.jpg: Sale [Credit | Cash] */}
        <div className="flex items-center space-x-4">
          <h1 className="text-sm font-bold text-gray-800">Sale</h1>
          <div className="flex items-center space-x-2 bg-gray-100 p-0.5 rounded-full text-xs">
            <button
              type="button"
              onClick={() => setIsCashSale(false)}
              className={`px-3 py-0.5 rounded-full font-medium transition ${
                !isCashSale ? 'bg-white shadow text-gray-800 font-bold' : 'text-gray-500'
              }`}
            >
              Credit
            </button>
            <button
              type="button"
              onClick={() => setIsCashSale(true)}
              className={`px-3 py-0.5 rounded-full font-medium transition ${
                isCashSale ? 'bg-blue-600 shadow text-white font-bold' : 'text-gray-500'
              }`}
            >
              Cash
            </button>
          </div>
        </div>

        {/* Customer & Invoice Meta Grid matching frame_0490s_025.jpg */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          {/* Customer Selection */}
          <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Customer * {customerBalance > 0 && <span className="text-red-500 font-bold ml-2">BAL: ₹{customerBalance}</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setSelectedPartyId('');
                  }}
                  placeholder="Search by Name/Phone *"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none focus:border-blue-500 font-medium"
                />
                {parties.length > 0 && !selectedPartyId && customerName && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 shadow-xl rounded max-h-36 overflow-y-auto z-40">
                    {parties
                      .filter(p => p.name.toLowerCase().includes(customerName.toLowerCase()) || (p.phone_number && p.phone_number.includes(customerName)))
                      .map(p => (
                        <div
                          key={p.id}
                          onClick={() => handlePartySelect(p.id)}
                          className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex justify-between text-xs"
                        >
                          <span className="font-semibold text-gray-800">{p.name}</span>
                          <span className="text-gray-500">{p.phone_number || ''}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
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

            <div className="md:col-span-2">
              <label className="block text-[11px] text-gray-500 mb-0.5">Billing Address</label>
              <textarea
                rows={2}
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Billing Address"
                className="w-full px-2.5 py-1 border border-gray-200 rounded outline-none text-xs resize-none"
              ></textarea>
            </div>
          </div>

          {/* Invoice Meta matching frame_0490s_025.jpg */}
          <div className="md:col-span-4 bg-gray-50/70 p-3 rounded border border-gray-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Invoice Number</span>
              <input
                type="number"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-24 text-right px-2 py-0.5 border border-gray-300 rounded font-bold outline-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Invoice Date</span>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
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
              </select>
            </div>
          </div>
        </div>

        {/* Line Items Table matching frame_0490s_025.jpg and frame_0540s_027.jpg */}
        <div className="border border-gray-200 rounded overflow-visible mt-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-gray-100/80 text-[10px] font-bold text-gray-600 uppercase border-b border-gray-200">
              <tr>
                <th className="p-2 w-8 text-center">#</th>
                <th className="p-2 min-w-[220px]">ITEM</th>
                <th className="p-2 w-16 text-center">QTY</th>
                <th className="p-2 w-20 text-center">UNIT</th>
                <th className="p-2 w-28 text-right">PRICE/UNIT</th>
                <th className="p-2 w-20 text-right">DISC %</th>
                <th className="p-2 w-20 text-right">DISC AMT</th>
                <th className="p-2 w-28 text-center">TAX</th>
                <th className="p-2 w-20 text-right">TAX AMT</th>
                <th className="p-2 w-24 text-right">AMOUNT</th>
                <th className="p-2 w-8 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((row, idx) => (
                <tr key={idx} className="relative hover:bg-gray-50/50">
                  <td className="p-2 text-center text-gray-400">{idx + 1}</td>

                  {/* Item Name with Autocomplete dropdown matching frame_0640s_038.jpg */}
                  <td className="p-1 relative">
                    <input
                      type="text"
                      value={row.item_name}
                      onFocus={() => {
                        setActiveItemSearchIndex(idx);
                        setItemSearchQuery(row.item_name);
                      }}
                      onChange={(e) => {
                        updateRow(idx, { item_name: e.target.value });
                        setItemSearchQuery(e.target.value);
                      }}
                      placeholder="Type product name or scan barcode..."
                      className="w-full px-2 py-1 border border-gray-300 rounded font-medium outline-none focus:border-blue-500"
                    />

                    {/* Autocomplete Popup matching video frame_0640s_038.jpg */}
                    {activeItemSearchIndex === idx && (
                      <div className="absolute left-0 top-full mt-1 w-96 bg-white border border-gray-300 shadow-2xl rounded-md z-50 overflow-hidden">
                        <div
                          onClick={() => {
                            navigate('/items/add');
                            setActiveItemSearchIndex(null);
                          }}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold flex items-center space-x-1 cursor-pointer border-b border-gray-200"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Item</span>
                        </div>

                        <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                          {availableProducts.map(p => (
                            <div
                              key={p.id}
                              onClick={() => handleSelectItem(idx, p)}
                              className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center text-xs"
                            >
                              <div>
                                <span className="font-bold text-gray-800">{p.name}</span>
                                <span className="text-[10px] text-gray-400 ml-1 font-mono">({p.item_code})</span>
                              </div>
                              <div className="text-right text-[11px] space-x-3">
                                <span className="font-semibold text-gray-900">₹{p.sale_price}</span>
                                <span className="text-gray-500 font-mono">Stock: <b className="text-emerald-700">{p.current_stock}</b></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>

                  <td className="p-1">
                    <input
                      type="number"
                      min="1"
                      value={row.quantity}
                      onChange={(e) => updateRow(idx, { quantity: e.target.value })}
                      className="w-full px-2 py-1 text-center border border-gray-300 rounded outline-none font-semibold"
                    />
                  </td>

                  <td className="p-1">
                    <select
                      value={row.unit}
                      onChange={(e) => updateRow(idx, { unit: e.target.value })}
                      className="w-full px-1 py-1 border border-gray-300 rounded bg-white outline-none text-[11px]"
                    >
                      <option value="NONE">NONE</option>
                      <option value="PCS">PCS</option>
                      <option value="BOX">BOX</option>
                      <option value="KGS">KGS</option>
                      <option value="MTR">MTR</option>
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

                  <td className="p-2 text-right text-gray-600 font-medium">
                    {Number(row.discount_amount || 0).toFixed(2)}
                  </td>

                  <td className="p-1">
                    <select
                      value={row.tax_rate}
                      onChange={(e) => updateRow(idx, { tax_rate: e.target.value })}
                      className="w-full px-1 py-1 border border-gray-300 rounded bg-white outline-none text-[11px]"
                    >
                      <option value="None">None</option>
                      <option value="GST@0%">GST@0%</option>
                      <option value="GST@5%">GST@5%</option>
                      <option value="GST@12%">GST@12%</option>
                      <option value="GST@18%">GST@18%</option>
                      <option value="GST@28%">GST@28%</option>
                    </select>
                  </td>

                  <td className="p-2 text-right text-gray-600 font-medium">
                    {Number(row.tax_amount || 0).toFixed(2)}
                  </td>

                  <td className="p-2 text-right font-bold text-gray-900">
                    ₹{Number(row.total_amount || 0).toFixed(2)}
                  </td>

                  <td className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200 font-bold">
                <td colSpan={2} className="p-2">
                  <button
                    type="button"
                    onClick={addRow}
                    className="px-3 py-1 border border-blue-400 text-blue-600 hover:bg-blue-50 rounded text-xs font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ADD ROW</span>
                  </button>
                </td>
                <td className="p-2 text-center">{items.reduce((s, i) => s + Number(i.quantity || 0), 0)}</td>
                <td colSpan={3} className="p-2 text-right text-gray-500 uppercase">TOTAL</td>
                <td className="p-2 text-right text-gray-800">₹{totalDiscount.toFixed(2)}</td>
                <td></td>
                <td className="p-2 text-right text-gray-800">₹{totalTax.toFixed(2)}</td>
                <td className="p-2 text-right text-base text-[#e01a4f]">₹{grandTotal.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom Section: Notes & Grand Summary matching frame_0540s_027.jpg */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 items-start">
          {/* Left helper actions */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-gray-600">
              <button
                type="button"
                onClick={() => setNotes(prev => prev ? prev : 'Payment terms: 30 days. Late fee applies.')}
                className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-50 text-[11px]"
              >
                + ADD TERMS & CONDITIONS
              </button>
              <button
                type="button"
                onClick={() => setNotes(prev => prev ? prev : 'Special order delivered via local transport.')}
                className="px-2.5 py-1 border border-gray-300 rounded hover:bg-gray-50 text-[11px]"
              >
                + ADD DESCRIPTION
              </button>
            </div>

            {notes && (
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Invoice notes..."
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded outline-none text-xs"
              ></textarea>
            )}

            {/* Payment Type Selection (Cash, Cheque, GPAY) matching video */}
            <div className="bg-gray-50 border border-gray-200 rounded p-3 w-64 space-y-2">
              <label className="block text-[11px] font-semibold text-gray-700">Payment Type</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded bg-white font-medium outline-none"
              >
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="GPAY">GPAY (Bank UPI)</option>
              </select>

              {(paymentType === 'GPAY' || paymentType === 'Bank') && (
                <div>
                  <label className="block text-[10px] text-gray-500 mb-0.5">Select Bank Account</label>
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-xs outline-none"
                  >
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.account_display_name} - {b.account_number}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Right Calculations Summary matching frame_0540s_027.jpg */}
          <div className="bg-gray-50/80 border border-gray-200 rounded p-4 space-y-2.5 text-xs">
            {/* Round off */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roundOffEnabled}
                  onChange={(e) => setRoundOffEnabled(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-gray-600">Round Off</span>
              </label>
              <span className="text-gray-500 font-mono">
                {computedRoundOff >= 0 ? `+₹${computedRoundOff.toFixed(2)}` : `-₹${Math.abs(computedRoundOff).toFixed(2)}`}
              </span>
            </div>

            {/* Grand Total */}
            <div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-gray-200">
              <span className="text-gray-800">Total</span>
              <span className="text-base text-gray-900 font-extrabold">₹{grandTotal}</span>
            </div>

            {/* Received Checkbox & Input */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={receivedChecked}
                  onChange={(e) => {
                    setReceivedChecked(e.target.checked);
                    if (!e.target.checked) setReceivedAmount('0');
                  }}
                  className="rounded text-blue-600"
                />
                <span className="font-semibold text-gray-700">Received</span>
              </label>
              <input
                type="number"
                disabled={!receivedChecked}
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                placeholder="500"
                className="w-28 text-right px-2 py-1 border border-gray-300 rounded font-bold outline-none focus:border-blue-500"
              />
            </div>

            {/* Balance Due */}
            <div className="flex items-center justify-between text-sm font-black pt-2 border-t border-gray-200 text-red-600">
              <span>Balance</span>
              <span>₹{balanceDue}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Save Bar matching frame_0540s_027.jpg */}
      <div className="p-3 px-5 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
        <button
          type="button"
          className="px-3.5 py-1.5 border border-gray-300 hover:bg-gray-100 rounded text-xs text-gray-700 font-medium flex items-center"
        >
          Generate e-Invoice <ChevronDown className="w-3.5 h-3.5 ml-1" />
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={handleSaveInvoice}
          className="px-8 py-2 bg-[#1976d2] hover:bg-[#1565c0] text-white rounded text-xs font-bold transition shadow-sm"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Invoice Preview Modal once saved */}
      {savedSale && (
        <InvoicePreviewModal
          sale={savedSale}
          business={business}
          onClose={() => {
            setSavedSale(null);
            navigate('/sales');
          }}
        />
      )}
    </div>
  );
}

