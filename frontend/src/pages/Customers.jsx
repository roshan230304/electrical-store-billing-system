import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import AddPartyModal from '../components/modals/AddPartyModal';
import PaymentInModal from '../components/modals/PaymentInModal';
import {
  Users, Search, Plus, Phone, Mail, MapPin, DollarSign,
  ArrowDownLeft, History, FileText, CheckCircle2
} from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerTransactions, setCustomerTransactions] = useState([]);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.getParties(search, 'Customer');
      if (res.success) {
        const list = (res.data || []).filter(p => p.party_type === 'Customer' || p.party_type === 'Both');
        setCustomers(list);
        if (list.length > 0 && !selectedCustomer) {
          selectCustomer(list[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectCustomer = async (cust) => {
    setSelectedCustomer(cust);
    try {
      const res = await api.getPartyById(cust.id);
      if (res.success) {
        setCustomerTransactions(res.data.transactions || []);
      }
      const loyaltyRes = await api.getLoyaltyHistory(cust.id);
      if (loyaltyRes.success) setLoyaltyTransactions(loyaltyRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-120px)] overflow-hidden rounded-[28px] border border-[#E5E5DF] bg-[#F4F3EF] text-[#242B26] shadow-[0_20px_60px_rgba(36,43,38,0.04)]">
      <div className="flex w-80 flex-col border-r border-[#E5E5DF] bg-white">
        <div className="border-b border-[#E5E5DF] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#DCE8C6] text-[#202D28]">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#858B84]">CRM</div>
                <div className="text-sm font-bold text-[#242B26]">Customers</div>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1 rounded-xl bg-[#B7D96B] px-2.5 py-1.5 text-[11px] font-bold text-[#202D28] shadow-sm transition hover:bg-[#A9CC54]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#858B84]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full rounded-xl border border-[#E5E5DF] bg-[#F4F3EF] py-2 pl-8 pr-2 text-xs text-[#242B26] outline-none transition focus:border-[#B7D96B]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#F0EFEA]">
          {customers.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#858B84]">
              No customers found. Click Add to create one.
            </div>
          ) : (
            customers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectCustomer(c)}
                className={`flex w-full items-center justify-between p-3 text-left transition ${
                  selectedCustomer?.id === c.id ? 'bg-[#F0F6E6] ring-1 ring-inset ring-[#B7D96B]' : 'hover:bg-[#FAF9F7]'
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-[#242B26]">{c.name}</div>
                  <div className="mt-0.5 text-[11px] text-[#858B84]">{c.phone_number || 'No phone'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-[0.12em] text-[#858B84]">Balance</div>
                  <div className={`text-xs font-bold ${parseFloat(c.current_balance) > 0 ? 'text-[#C95D55]' : 'text-[#2A7B54]'}`}>
                    {formatCurrency(c.current_balance)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

      </div>

      <div className="flex flex-1 flex-col overflow-hidden bg-[#F4F3EF]">
        {selectedCustomer ? (
          <>
            <div className="flex items-center justify-between border-b border-[#E5E5DF] bg-white px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-[#242B26]">{selectedCustomer.name}</h2>
                  <span className="rounded-full bg-[#DCE8C6] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#202D28]">
                    {selectedCustomer.party_type}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[#858B84]">
                  {selectedCustomer.phone_number && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {selectedCustomer.phone_number}</span>
                  )}
                  {selectedCustomer.gstin && (
                    <span className="font-mono">GSTIN: {selectedCustomer.gstin}</span>
                  )}
                  {selectedCustomer.billing_address && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {selectedCustomer.billing_address}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#F0F6E6] px-3 py-2 text-right">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-[#858B84]">Loyalty Points</div>
                  <div className="text-lg font-black text-[#2A7B54]">{selectedCustomer.loyalty_points || 0}</div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-[#858B84]">Receivable</div>
                  <div className={`text-lg font-black ${parseFloat(selectedCustomer.current_balance) > 0 ? 'text-[#C95D55]' : 'text-[#2A7B54]'}`}>
                    {formatCurrency(selectedCustomer.current_balance)}
                  </div>
                </div>

                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#202D28] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#1B2723]"
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  Receive Payment
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="overflow-hidden rounded-[22px] border border-[#E5E5DF] bg-white">
                <div className="flex items-center gap-2 border-b border-[#E5E5DF] bg-[#FAF9F7] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#242B26]">
                  <History className="h-4 w-4 text-[#202D28]" />
                  Transaction Ledger & Invoices
                </div>

                {customerTransactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#858B84]">
                    No transactions recorded for this customer yet.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-[#F7F6F2] text-[10px] uppercase tracking-[0.12em] text-[#858B84]">
                        <th className="px-3 py-2.5">Type</th>
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Reference</th>
                        <th className="px-3 py-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerTransactions.map((tx, idx) => (
                        <tr key={idx} className="border-t border-[#F0EFEA] hover:bg-[#FAF9F7]">
                          <td className="px-3 py-2.5">
                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tx.type === 'Sale' ? 'bg-[#DCE8C6] text-[#202D28]' : 'bg-[#F7E3D9] text-[#A55347]'}`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-[#242B26]">{formatDate(tx.date || tx.created_at)}</td>
                          <td className="px-3 py-2.5 text-[#858B84]">{tx.reference || tx.invoice_number || '—'}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-[#242B26]">{formatCurrency(tx.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="mt-4 overflow-hidden rounded-[22px] border border-[#E5E5DF] bg-white">
                <div className="flex items-center gap-2 border-b border-[#E5E5DF] bg-[#FAF9F7] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[#242B26]">
                  <History className="h-4 w-4 text-[#202D28]" />
                  Loyalty Points History
                </div>
                {loyaltyTransactions.length === 0 ? (
                  <div className="p-5 text-center text-xs text-[#858B84]">No loyalty transactions yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-[#F7F6F2] text-[10px] uppercase tracking-[0.12em] text-[#858B84]">
                          <th className="px-3 py-2.5">Date</th>
                          <th className="px-3 py-2.5">Invoice</th>
                          <th className="px-3 py-2.5">Type</th>
                          <th className="px-3 py-2.5 text-right">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loyaltyTransactions.map(transaction => (
                          <tr key={transaction.id} className="border-t border-[#F0EFEA]">
                            <td className="px-3 py-2.5">{formatDate(transaction.created_at)}</td>
                            <td className="px-3 py-2.5">{transaction.invoice_number}</td>
                            <td className="px-3 py-2.5">{transaction.transaction_type}</td>
                            <td className="px-3 py-2.5 text-right font-bold">{transaction.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-[#858B84]">
            Select a customer to view details
          </div>
        )}
      </div>

      <AddPartyModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onPartyAdded={() => {
          setShowAddModal(false);
          loadCustomers();
        }}
        defaultType="Customer"
      />

      {selectedCustomer && (
        <PaymentInModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          customer={selectedCustomer}
          onPaymentAdded={() => {
            setShowPaymentModal(false);
            loadCustomers();
            selectCustomer(selectedCustomer);
          }}
        />
      )}
    </div>
  );
}
