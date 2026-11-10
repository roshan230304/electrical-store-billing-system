import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatDate } from '../../utils/formatters';
import { X, Settings, RotateCcw, Calculator, ChevronDown } from 'lucide-react';

export default function PaymentInModal({ isOpen, onClose, initialParty, onPaymentSuccess }) {
  const [parties, setParties] = useState([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [selectedParty, setSelectedParty] = useState(null);
  const [paymentType, setPaymentType] = useState('Cash');
  const [receiptNo, setReceiptNo] = useState('1');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountReceived, setAmountReceived] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Link transactions modal sub-state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [pendingSales, setPendingSales] = useState([]);
  const [allocatedSales, setAllocatedSales] = useState({});

  useEffect(() => {
    if (!isOpen) return;

    // Load parties
    api.getParties().then(res => {
      if (res.success) {
        setParties(res.data);
        if (initialParty) {
          setSelectedPartyId(initialParty.id);
          setSelectedParty(initialParty);
          setAmountReceived(initialParty.current_balance > 0 ? String(initialParty.current_balance) : '0');
        } else if (res.data.length > 0) {
          setSelectedPartyId(res.data[0].id);
          setSelectedParty(res.data[0]);
          setAmountReceived(res.data[0].current_balance > 0 ? String(res.data[0].current_balance) : '0');
        }
      }
    });
  }, [isOpen, initialParty]);

  // When party changes, fetch their sales to enable linking
  useEffect(() => {
    if (!selectedPartyId) return;
    const p = parties.find(x => String(x.id) === String(selectedPartyId));
    if (p) {
      setSelectedParty(p);
      setAmountReceived(p.current_balance > 0 ? String(p.current_balance) : '0');
      
      api.getPartyById(selectedPartyId).then(res => {
        if (res.success && res.data.transactions) {
          const salesWithBal = res.data.transactions.filter(t => t.type === 'Sale' && Number(t.balance) > 0);
          setPendingSales(salesWithBal);

          // Default auto-allocation
          const alloc = {};
          let rem = Number(p.current_balance || 0);
          salesWithBal.forEach(s => {
            const due = Number(s.balance);
            const take = Math.min(rem, due);
            alloc[s.id] = take;
            rem -= take;
          });
          setAllocatedSales(alloc);
        }
      });
    }
  }, [selectedPartyId, parties]);

  if (!isOpen) return null;

  const currentBal = selectedParty ? Number(selectedParty.current_balance || 0) : 0;
  const numRec = Number(amountReceived) || 0;
  const remainingBal = Math.max(0, currentBal - numRec);

  const handleAutoLink = () => {
    let rem = numRec;
    const alloc = {};
    pendingSales.forEach(s => {
      const due = Number(s.balance);
      const take = Math.min(rem, due);
      alloc[s.id] = take;
      rem -= take;
    });
    setAllocatedSales(alloc);
  };

  const handleSave = async () => {
    if (!selectedPartyId || numRec <= 0) {
      setError('Please select a party and enter a valid received amount.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const linkedList = Object.keys(allocatedSales)
        .filter(saleId => allocatedSales[saleId] > 0)
        .map(saleId => ({
          sale_id: Number(saleId),
          allocated_amount: allocatedSales[saleId]
        }));

      const res = await api.addPaymentIn({
        party_id: selectedPartyId,
        amount: numRec,
        date,
        payment_mode: paymentType,
        description: description || `Payment from ${selectedParty?.name}`,
        linked_sales: linkedList
      });

      if (res.success) {
        if (onPaymentSuccess) onPaymentSuccess(res);
        onClose();
      } else {
        setError(res.message || 'Payment recording failed.');
      }
    } catch (err) {
      setError('Server error processing payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
          {/* Header matching frame_0750s_044.jpg */}
          <div className="p-3.5 px-5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">Payment-In</h2>
            <div className="flex items-center space-x-2 text-gray-400">
              <Calculator className="w-4 h-4 hover:text-gray-600 cursor-pointer" />
              <Settings className="w-4 h-4 hover:text-gray-600 cursor-pointer" />
              <button onClick={onClose} className="hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-xs px-5 py-2 border-b border-red-200">
              {error}
            </div>
          )}

          {/* Body */}
          <div className="p-5 space-y-4 text-xs">
            {/* Top row: Party, Receipt No, Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">Party *</label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white outline-none font-medium"
                >
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Bal: ₹{p.current_balance})</option>
                  ))}
                </select>
                <div className="text-[11px] text-green-700 font-semibold mt-1">
                  BAL: ₹{currentBal.toFixed(2)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Receipt No:</span>
                  <span className="font-semibold">{receiptNo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Date:</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-0.5 text-xs outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Payment Type */}
            <div>
              <label className="block text-[11px] text-gray-600 mb-1">Payment Type</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-48 px-2.5 py-1.5 border border-gray-300 rounded bg-white outline-none"
              >
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="GPAY">GPAY (Bank UPI)</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] text-gray-600 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Payment description / reference note"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
              />
            </div>

            {/* Balance & Received Calculation */}
            <div className="bg-gray-50 border border-gray-200 rounded p-4 space-y-2">
              <div className="flex justify-between items-center text-gray-700">
                <span>Balance Due:</span>
                <span className="font-bold text-sm">₹{currentBal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800">Received (₹):</span>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="w-36 text-right font-bold text-sm px-2 py-1 border border-blue-500 rounded outline-none"
                />
              </div>
              <div className="flex justify-between items-center text-gray-800 font-bold pt-2 border-t border-gray-200">
                <span>Remaining Balance:</span>
                <span>₹{remainingBal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer matching frame_0750s_044.jpg */}
          <div className="p-3.5 px-5 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setShowLinkModal(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded text-xs font-semibold shadow-sm transition"
            >
              LINK PAYMENT (?)
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                className="px-3 py-1.5 border border-gray-300 hover:bg-gray-100 rounded text-xs text-gray-700 font-medium flex items-center"
              >
                Share <ChevronDown className="w-3 h-3 ml-1" />
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="px-6 py-1.5 bg-[#1976d2] hover:bg-[#1565c0] text-white rounded text-xs font-semibold transition shadow-sm"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Link Payment to Txns Submodal (matching frame_0760s_045.jpg) */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200">
            <div className="p-3.5 px-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-800">Link Payment to Txns</h3>
              <button onClick={() => setShowLinkModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-gray-500 text-[10px]">Party</div>
                  <div className="font-bold text-gray-900">{selectedParty?.name}</div>
                </div>

                <div className="text-right">
                  <div className="text-gray-500 text-[10px]">Received</div>
                  <div className="font-bold text-sm text-blue-600">₹{numRec.toFixed(2)}</div>
                </div>

                <button
                  type="button"
                  onClick={handleAutoLink}
                  className="bg-[#1976d2] text-white px-3 py-1.5 rounded font-semibold text-xs flex items-center shadow-sm"
                >
                  AUTO LINK
                </button>
              </div>

              {/* Invoices table */}
              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-[10px] font-bold text-gray-600 uppercase border-b border-gray-200">
                    <tr>
                      <th className="p-2 w-8"></th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Type</th>
                      <th className="p-2">Ref/Inv No.</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-right">Balance</th>
                      <th className="p-2 text-right">Linked Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pendingSales.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-gray-400">
                          No outstanding invoices found for this party.
                        </td>
                      </tr>
                    ) : (
                      pendingSales.map(s => {
                        const isAlloc = (allocatedSales[s.id] || 0) > 0;
                        return (
                          <tr key={s.id} className={isAlloc ? 'bg-blue-50' : ''}>
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={isAlloc}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setAllocatedSales({
                                    ...allocatedSales,
                                    [s.id]: checked ? Number(s.balance) : 0
                                  });
                                }}
                                className="rounded text-blue-600"
                              />
                            </td>
                            <td className="p-2">{formatDate(s.date)}</td>
                            <td className="p-2">{s.type}</td>
                            <td className="p-2 font-bold">{s.number}</td>
                            <td className="p-2 text-right">₹{Number(s.total).toFixed(2)}</td>
                            <td className="p-2 text-right">₹{Number(s.balance).toFixed(2)}</td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                value={allocatedSales[s.id] || ''}
                                onChange={(e) => {
                                  setAllocatedSales({
                                    ...allocatedSales,
                                    [s.id]: Math.min(Number(s.balance), Number(e.target.value) || 0)
                                  });
                                }}
                                className="w-20 text-right px-1.5 py-0.5 border border-gray-300 rounded font-semibold"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 px-5 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs">
              <div>
                Unused Amount: <span className="font-bold">₹0.00</span>
              </div>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-1.5 border border-gray-300 rounded font-semibold text-gray-700 hover:bg-gray-100"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-5 py-1.5 bg-[#1976d2] text-white rounded font-semibold shadow-sm"
                >
                  DONE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

