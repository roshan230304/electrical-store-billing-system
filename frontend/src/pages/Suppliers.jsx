import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import AddPartyModal from '../components/modals/AddPartyModal';
import {
  Truck, Search, Plus, Phone, Mail, MapPin, DollarSign,
  ArrowUpRight, History, FileText, CheckCircle2
} from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierTransactions, setSupplierTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, [search]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const res = await api.getParties(search, 'Supplier');
      if (res.success) {
        const list = (res.data || []).filter(p => p.party_type === 'Supplier' || p.party_type === 'Both');
        setSuppliers(list);
        if (list.length > 0 && !selectedSupplier) {
          selectSupplier(list[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectSupplier = async (sup) => {
    setSelectedSupplier(sup);
    try {
      const res = await api.getPartyById(sup.id, 'Supplier');
      if (res.success) {
        setSupplierTransactions(res.data.transactions || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex h-full bg-[#f4f6f9] overflow-hidden select-none">
      {/* Left List of Suppliers */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header & Search */}
        <div className="p-3 border-b border-gray-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 font-bold text-gray-800 text-sm">
              <Truck className="w-4 h-4 text-purple-600" />
              <span>Suppliers / Vendors</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-full font-normal">
                {suppliers.length}
              </span>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-[#1976d2] hover:bg-[#1565c0] text-white px-2.5 py-1 rounded text-xs font-bold flex items-center space-x-1 shadow-sm"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vendor name or phone..."
              className="w-full pl-8 pr-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Suppliers Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {suppliers.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs">
              No suppliers found. Click + Add to record a vendor.
            </div>
          ) : (
            suppliers.map(s => (
              <div
                key={s.id}
                onClick={() => selectSupplier(s)}
                className={`p-3 cursor-pointer transition flex items-center justify-between ${
                  selectedSupplier?.id === s.id
                    ? 'bg-purple-50/80 border-l-4 border-purple-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div>
                  <div className="font-bold text-gray-900 text-xs">{s.name}</div>
                  <div className="text-[11px] text-gray-500">{s.phone_number || 'No phone'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-400">Payable Dues</div>
                  <div className="text-xs font-bold text-red-600">
                    {formatCurrency(s.current_balance)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Detail Pane */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#f4f6f9]">
        {selectedSupplier ? (
          <>
            {/* Supplier Profile Banner */}
            <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-xs">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-extrabold text-gray-900">{selectedSupplier.name}</h2>
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                    {selectedSupplier.party_type}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-600 mt-1">
                  {selectedSupplier.phone_number && (
                    <span className="flex items-center"><Phone className="w-3 h-3 mr-1 text-gray-400" /> {selectedSupplier.phone_number}</span>
                  )}
                  {selectedSupplier.gstin && (
                    <span className="font-mono">GSTIN: {selectedSupplier.gstin}</span>
                  )}
                  {selectedSupplier.billing_address && (
                    <span className="flex items-center"><MapPin className="w-3 h-3 mr-1 text-gray-400" /> {selectedSupplier.billing_address}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right mr-2">
                  <div className="text-[10px] text-gray-500 font-bold uppercase">Payable Balance</div>
                  <div className="text-base font-black text-red-600">
                    {formatCurrency(selectedSupplier.current_balance)}
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions History */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-3 border-b border-gray-100 font-bold text-xs text-gray-800 flex items-center space-x-1.5">
                  <History className="w-4 h-4 text-purple-600" />
                  <span>Purchase Bills & Supplier Statement</span>
                </div>

                {supplierTransactions.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs">
                    No transactions recorded for this supplier yet.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Bill / Ref #</th>
                        <th className="py-2.5 px-3">Payment Mode</th>
                        <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                        <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                        <th className="py-2.5 px-3 text-right">Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {supplierTransactions.map((t, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition">
                          <td className="py-2.5 px-3 font-semibold text-gray-900">{t.type}</td>
                          <td className="py-2.5 px-3 text-gray-600">{formatDate(t.date)}</td>
                          <td className="py-2.5 px-3 font-mono font-medium text-purple-700">{t.ref_no}</td>
                          <td className="py-2.5 px-3 text-gray-600">{t.mode || 'Cash'}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-gray-900">
                            {parseFloat(t.debit) > 0 ? formatCurrency(t.debit) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-emerald-600">
                            {parseFloat(t.credit) > 0 ? formatCurrency(t.credit) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                            {formatCurrency(t.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-xs">
            Select a supplier from the left to view statement.
          </div>
        )}
      </div>

      {showAddModal && (
        <AddPartyModal
          defaultType="Supplier"
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadSuppliers();
          }}
        />
      )}
    </div>
  );
}
