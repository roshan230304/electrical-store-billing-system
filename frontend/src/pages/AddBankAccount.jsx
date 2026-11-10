import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Search, Info, Plus } from 'lucide-react';

export default function AddBankAccount() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    account_display_name: 'GPAY',
    opening_balance: '0',
    as_of_date: new Date().toISOString().split('T')[0],
    account_number: '2554415255',
    ifsc_code: 'BARB0VJCHPU',
    upi_id: '9742762826@okaxis',
    bank_name: 'BANK OF BARODA, CHANDAPURA,BANGALORE',
    account_holder_name: 'HITECH ELECTRICALS',
    print_qr_on_invoice: true,
    print_bank_details: true,
    accept_payments_online: false
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.account_display_name || !formData.account_number) {
      setError('Account Display Name and Account Number are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await api.addBankAccount(formData);
      if (res.success) {
        navigate('/bank-accounts');
      } else {
        setError(res.message || 'Failed to save bank account');
      }
    } catch (err) {
      setError('Server error connecting to database');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[calc(100vh-65px)] text-xs">
      <div className="p-3.5 px-6 border-b border-gray-200">
        <h1 className="text-sm font-bold text-gray-800">Add Bank Account</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs px-6 py-2 border-b border-red-200">
          {error}
        </div>
      )}

      {/* Main Form matching frame_0840s_052.jpg */}
      <form onSubmit={handleSave} className="flex-1 p-6 space-y-5 overflow-y-auto">
        {/* Row 1: Account Display Name *, Opening Balance, As of Date */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">Account Display Name *</label>
            <input
              type="text"
              required
              value={formData.account_display_name}
              onChange={(e) => setFormData({ ...formData, account_display_name: e.target.value })}
              placeholder="e.g. GPAY, HDFC Bank, SBI"
              className="w-full px-2.5 py-1.5 border border-blue-500 rounded outline-none font-semibold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">Opening Balance</label>
            <input
              type="number"
              value={formData.opening_balance}
              onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
              placeholder="Enter Opening Balance"
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">As of Date</label>
            <input
              type="date"
              value={formData.as_of_date}
              onChange={(e) => setFormData({ ...formData, as_of_date: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
            />
          </div>
        </div>

        {/* Row 2: Account Number *, IFSC Code, UPI ID for QR Code */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">Account Number *</label>
            <input
              type="text"
              required
              value={formData.account_number}
              onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              placeholder="2554415255"
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">IFSC Code</label>
            <div className="relative">
              <input
                type="text"
                value={formData.ifsc_code}
                onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                placeholder="BARB0VJCHPU"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none uppercase font-mono pr-8"
              />
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">UPI ID for QR Code</label>
            <input
              type="text"
              value={formData.upi_id}
              onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
              placeholder="9742762826@okaxis"
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
            />
          </div>
        </div>

        {/* Row 3: Bank Name, Account Holder Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">Bank Name</label>
            <input
              type="text"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              placeholder="BANK OF BARODA, CHANDAPURA,BANGALORE"
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">Account Holder Name</label>
            <input
              type="text"
              value={formData.account_holder_name}
              onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
              placeholder="Enter Account Holder Name"
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
            />
          </div>
        </div>

        {/* Checkboxes matching frame_0840s_052.jpg */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.print_qr_on_invoice}
              onChange={(e) => setFormData({ ...formData, print_qr_on_invoice: e.target.checked })}
              className="rounded text-blue-600"
            />
            <span className="font-medium text-gray-700">Print offline UPI QR on Invoices (Only UPI, No automatic reconciliation)</span>
            <Info className="w-3.5 h-3.5 text-gray-400" />
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.print_bank_details}
              onChange={(e) => setFormData({ ...formData, print_bank_details: e.target.checked })}
              className="rounded text-blue-600"
            />
            <span className="font-medium text-gray-700">Print Bank Details on Invoices</span>
            <Info className="w-3.5 h-3.5 text-gray-400" />
          </label>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.accept_payments_online}
                onChange={(e) => setFormData({ ...formData, accept_payments_online: e.target.checked })}
                className="rounded text-blue-600"
              />
              <span className="font-semibold text-gray-800">Accept Payments Online</span>
              <span className="bg-[#e01a4f] text-white text-[9px] px-1 rounded font-bold">NEW</span>
            </label>
            <p className="text-[11px] text-gray-500 pl-6">
              Accept UPI, debit cards, credit cards, and net banking to boost revenue and reconcile incoming payments with invoices directly.
            </p>
          </div>
        </div>

        {/* Promo Cards matching video bottom: PhonePe SQR, Card Machine, Razorpay */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
          <div className="border border-blue-100 bg-blue-50/50 rounded-lg p-3 flex justify-between items-center">
            <div>
              <p className="font-bold text-gray-800">PhonePe SQR</p>
              <p className="text-[10px] text-gray-500">Scan, pay, auto-reconcile</p>
              <span className="text-[11px] text-blue-600 font-semibold cursor-pointer">Link PhonePe QR &gt;</span>
            </div>
            <div className="w-10 h-10 bg-white border border-gray-200 rounded flex items-center justify-center font-bold text-xs text-purple-700">
              QR
            </div>
          </div>

          <div className="border border-gray-200 bg-gray-50/50 rounded-lg p-3 flex justify-between items-center">
            <div>
              <p className="font-bold text-gray-800">Card Machine (EDC)</p>
              <p className="text-[10px] text-gray-500">Card payments at your counter</p>
              <span className="text-[11px] text-blue-600 font-semibold cursor-pointer">Add Card Machine &gt;</span>
            </div>
            <div className="w-10 h-10 bg-white border border-gray-200 rounded flex items-center justify-center text-lg">
              💳
            </div>
          </div>

          <div className="border border-gray-200 bg-gray-50/50 rounded-lg p-3 flex justify-between items-center">
            <div>
              <p className="font-bold text-gray-800">Payment Gateway</p>
              <p className="text-[10px] text-gray-500">Collect payments via links</p>
              <span className="text-[11px] text-blue-600 font-semibold cursor-pointer">Add Payment Gateway &gt;</span>
            </div>
            <div className="w-10 h-10 bg-blue-900 text-white rounded flex items-center justify-center font-bold text-xs">
              R
            </div>
          </div>
        </div>

        {/* Action Buttons matching frame_0840s_052.jpg */}
        <div className="pt-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/bank-accounts')}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-[#e01a4f] hover:bg-[#c71342] text-white rounded font-bold shadow-sm transition"
          >
            {saving ? 'Saving...' : 'Save Details'}
          </button>
        </div>
      </form>
    </div>
  );
}

