import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatDate } from '../utils/formatters';
import AdjustCashModal from '../components/modals/AdjustCashModal';
import { Plus, MoreVertical, Search, Wallet } from 'lucide-react';

export default function CashInHand() {
  const [cashBalance, setCashBalance] = useState(1000);
  const [transactions, setTransactions] = useState([]);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCashData();
  }, []);

  const loadCashData = async () => {
    try {
      const res = await api.getCashInHand();
      if (res.success) {
        setCashBalance(res.current_balance);
        setTransactions(res.transactions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header matching frame_1000s_062.jpg: Cash In Hand ₹ 1,000 & Adjust Cash */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="text-base font-bold text-gray-800">Cash In Hand</h1>
          <span className="text-base font-extrabold text-emerald-600">
            ₹ {Number(cashBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <button
          onClick={() => setIsAdjustModalOpen(true)}
          className="bg-[#e01a4f] hover:bg-[#c71342] text-white px-4 py-1.5 rounded text-xs font-bold flex items-center shadow-sm transition"
        >
          Adjust Cash
        </button>
      </div>

      {/* Transactions Table matching frame_1000s_062.jpg */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-3 border-b border-gray-200">
          <span className="font-bold text-xs text-gray-800">Transactions</span>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-200">
            <tr>
              <th className="p-2.5">Type</th>
              <th className="p-2.5">Name</th>
              <th className="p-2.5">Date</th>
              <th className="p-2.5 text-right">Amount</th>
              <th className="p-2.5 text-center w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  No cash transactions recorded. Cash received from sales will appear here automatically.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 transition">
                  <td className="p-2.5 font-semibold text-gray-800">
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px]">
                      {tx.entry_type}
                    </span>
                  </td>
                  <td className="p-2.5 font-medium text-gray-900">{tx.party_name || 'Business'}</td>
                  <td className="p-2.5 text-gray-600">{formatDate(tx.date)}</td>
                  <td className="p-2.5 text-right font-bold text-emerald-600">
                    ₹ {Number(tx.inflow > 0 ? tx.inflow : tx.outflow).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-2.5 text-center text-gray-400">
                    <MoreVertical className="w-3.5 h-3.5 inline cursor-pointer" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Adjust Cash Modal */}
      <AdjustCashModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        onAdjustSuccess={loadCashData}
      />
    </div>
  );
}

