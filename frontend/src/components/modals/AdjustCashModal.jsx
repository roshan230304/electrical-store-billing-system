import React, { useState } from 'react';
import { api } from '../../services/api';
import { X } from 'lucide-react';

export default function AdjustCashModal({ isOpen, onClose, onAdjustSuccess }) {
  const [adjustmentType, setAdjustmentType] = useState('Add Cash');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await api.adjustCash({
        adjustment_type: adjustmentType,
        amount: Number(amount),
        date,
        description: description || `${adjustmentType} manual adjustment`
      });

      if (res.success) {
        if (onAdjustSuccess) onAdjustSuccess(res);
        onClose();
      } else {
        setError(res.message || 'Failed to adjust cash balance.');
      }
    } catch (err) {
      setError('Server connection error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden border border-gray-200">
        <div className="p-3.5 px-5 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-sm text-gray-800">Adjust Cash</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-xs px-5 py-2 border-b border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-2">Adjustment Action</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdjustmentType('Add Cash')}
                className={`py-2 rounded font-semibold text-xs border transition ${
                  adjustmentType === 'Add Cash'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                + Add Cash
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('Reduce Cash')}
                className={`py-2 rounded font-semibold text-xs border transition ${
                  adjustmentType === 'Reduce Cash'
                    ? 'bg-red-50 border-red-500 text-red-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                - Reduce Cash
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">Amount (₹) *</label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded font-semibold text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">Reason / Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Petty cash replenishment, Owner withdrawal..."
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none resize-none"
            ></textarea>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-gray-300 text-gray-600 rounded font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-1.5 bg-[#e01a4f] hover:bg-[#c71342] text-white rounded font-semibold shadow-sm transition"
            >
              {saving ? 'Saving...' : 'Save Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

