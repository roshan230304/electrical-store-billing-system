import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Plus, Landmark, QrCode, CheckCircle2, MoreVertical } from 'lucide-react';

export default function BankAccounts() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await api.getBankAccounts();
      if (res.success) setAccounts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-800">Bank Accounts</h1>
          <p className="text-[11px] text-gray-500">Manage bank accounts, UPI IDs, and invoice QR code configuration</p>
        </div>

        <button
          onClick={() => navigate('/bank-accounts/add')}
          className="bg-[#e01a4f] hover:bg-[#c71342] text-white px-3.5 py-1.5 rounded text-xs font-bold flex items-center shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
          Add Bank Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">{acc.account_display_name}</h3>
                  <p className="text-[11px] text-gray-500">{acc.bank_name}</p>
                </div>
              </div>
              <MoreVertical className="w-4 h-4 text-gray-400 cursor-pointer" />
            </div>

            <div className="space-y-1 text-xs pt-1 border-t border-gray-100">
              <div className="flex justify-between">
                <span className="text-gray-500">Account No:</span>
                <span className="font-mono font-semibold text-gray-800">{acc.account_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">IFSC Code:</span>
                <span className="font-mono font-semibold text-gray-800">{acc.ifsc_code}</span>
              </div>
              {acc.upi_id && (
                <div className="flex justify-between">
                  <span className="text-gray-500">UPI ID:</span>
                  <span className="font-medium text-blue-700">{acc.upi_id}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-2 border-t border-gray-100 text-[11px] text-emerald-700 font-medium">
              <QrCode className="w-4 h-4 text-emerald-600" />
              <span>UPI QR Code active on tax invoices</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

