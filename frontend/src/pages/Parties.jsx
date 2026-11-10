import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatters';
import AddPartyModal from '../components/modals/AddPartyModal';
import PaymentInModal from '../components/modals/PaymentInModal';
import InvoicePreviewModal from '../components/invoice/InvoicePreviewModal';
import {
  Search,
  Plus,
  Settings,
  Edit2,
  Phone,
  MessageCircle,
  FileSpreadsheet,
  Printer,
  MoreVertical,
  Filter,
  CreditCard
} from 'lucide-react';

export default function Parties() {
  const location = useLocation();
  const { business } = useAuth();
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [partyDetails, setPartyDetails] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddPartyOpen, setIsAddPartyOpen] = useState(false);
  const [isPaymentInOpen, setIsPaymentInOpen] = useState(false);
  const [previewSale, setPreviewSale] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadParties();
    // Auto-open modal if query parameter has action=new
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new') {
      setIsAddPartyOpen(true);
    }
  }, [location.search]);

  const loadParties = async () => {
    try {
      const res = await api.getParties(search);
      if (res.success) {
        setParties(res.data);
        if (res.data.length > 0) {
          const first = res.data[0];
          setSelectedParty(first);
          loadPartyDetail(first.id);
        }
      }
    } catch (err) {
      console.error('Failed to load parties:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPartyDetail = async (id) => {
    try {
      const res = await api.getPartyById(id);
      if (res.success) {
        setPartyDetails(res.data);
      }
    } catch (err) {
      console.error('Failed to load party detail:', err);
    }
  };

  const handleSelectParty = (p) => {
    setSelectedParty(p);
    loadPartyDetail(p.id);
  };

  const handlePartyCreated = (newParty) => {
    setToastMessage('New party saved successfully.');
    loadParties();
    setSelectedParty(newParty);
    loadPartyDetail(newParty.id);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleViewInvoice = async (saleId) => {
    try {
      const res = await api.getSaleById(saleId);
      if (res.success) {
        setPreviewSale(res.data);
      }
    } catch (err) {
      console.error('Failed to load invoice for preview:', err);
    }
  };

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col space-y-2">
      {/* Toast Notification matching video frame_0270s_016.jpg */}
      {toastMessage && (
        <div className="fixed top-12 right-6 z-50 bg-emerald-600 text-white px-4 py-2 rounded shadow-lg text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-top-2">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top action row */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-800 flex items-center">
          Parties <span className="text-gray-400 text-xs ml-2 font-normal">({parties.length})</span>
        </h1>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPaymentInOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center shadow-sm transition"
          >
            <CreditCard className="w-3.5 h-3.5 mr-1" />
            + Payment-In
          </button>

          <button
            onClick={() => setIsAddPartyOpen(true)}
            className="bg-[#e01a4f] hover:bg-[#c71342] text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
            Add Party
          </button>

          <button className="p-1.5 hover:bg-gray-200 rounded text-gray-500">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2-Pane Master-Detail View matching frame_0720s_042.jpg */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex shadow-sm">
        {/* Left Master List */}
        <div className="w-64 border-r border-gray-200 flex flex-col bg-white">
          {/* Search Party */}
          <div className="p-2.5 border-b border-gray-200">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); loadParties(); }}
                placeholder="Search Party Name"
                className="w-full pl-8 pr-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          {/* List Table Header */}
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex justify-between text-[11px] font-bold text-gray-500 uppercase">
            <div className="flex items-center space-x-1">
              <span>Party Name</span>
              <Filter className="w-2.5 h-2.5 text-red-500" />
            </div>
            <span>Amount</span>
          </div>

          {/* Parties List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {parties.map(p => {
              const isSelected = selectedParty?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectParty(p)}
                  className={`px-3 py-2.5 flex items-center justify-between cursor-pointer text-xs transition ${
                    isSelected ? 'bg-blue-100/70 text-blue-900 font-semibold border-l-2 border-blue-600' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="truncate">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.phone_number || ''}</p>
                  </div>
                  <span className={`font-semibold text-xs ${Number(p.current_balance) > 0 ? 'text-emerald-700' : 'text-gray-500'}`}>
                    ₹ {Number(p.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom contacts banner */}
          <div className="p-2.5 bg-emerald-50 border-t border-emerald-100 text-[11px] text-emerald-800 flex items-center justify-between">
            <span>Easily convert your Phone contacts into parties</span>
            <span className="font-bold text-emerald-600">›</span>
          </div>
        </div>

        {/* Right Detail Pane matching frame_0720s_042.jpg */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {selectedParty ? (
            <>
              {/* Party Header Info */}
              <div className="p-4 border-b border-gray-200 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-gray-900">{partyDetails?.name || selectedParty.name}</h2>
                    <button className="text-blue-600 hover:text-blue-800 p-0.5">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Phone Number: <span className="text-gray-800 font-medium">{partyDetails?.phone_number || 'N/A'}</span>
                  </div>
                  {partyDetails?.billing_address && (
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {partyDetails.billing_address}
                    </div>
                  )}
                </div>

                {/* Right quick contact icons */}
                <div className="flex items-center space-x-3 text-gray-500">
                  <button 
                    onClick={() => alert(`SMS initiated for ${partyDetails?.phone_number}`)} 
                    className="p-1 hover:text-amber-500"
                    title="SMS"
                  >
                    <MessageCircle className="w-4 h-4 text-amber-500" />
                  </button>
                  <button 
                    onClick={() => window.open(`https://wa.me/${partyDetails?.phone_number || ''}`, '_blank')}
                    className="p-1 hover:text-emerald-600"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                  </button>
                  <button className="p-1 hover:text-gray-700">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Transactions Title & Tools matching frame_0720s_042.jpg */}
              <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between text-xs">
                <span className="font-bold text-gray-800">Transactions</span>
                <div className="flex items-center space-x-2 text-gray-500">
                  <button className="p-1 hover:bg-gray-100 rounded"><Search className="w-3.5 h-3.5" /></button>
                  <button onClick={() => window.print()} className="p-1 hover:bg-gray-100 rounded"><Printer className="w-3.5 h-3.5" /></button>
                  <button onClick={() => alert('Exporting to Excel...')} className="p-1 hover:bg-gray-100 rounded"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /></button>
                </div>
              </div>

              {/* Transactions Table matching frame_0720s_042.jpg */}
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Number</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5 text-right">Total</th>
                      <th className="p-2.5 text-right">Balance</th>
                      <th className="p-2.5 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {!partyDetails?.transactions || partyDetails.transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400">
                          No transactions recorded for this party yet.
                        </td>
                      </tr>
                    ) : (
                      partyDetails.transactions.map((tx, idx) => (
                        <tr
                          key={idx}
                          onClick={() => {
                            if (tx.type === 'Sale') handleViewInvoice(tx.id);
                          }}
                          className="hover:bg-blue-50/50 cursor-pointer transition"
                        >
                          <td className="p-2.5 font-semibold text-gray-800">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              tx.type === 'Sale' ? 'bg-blue-100 text-blue-800' :
                              tx.type === 'Purchase' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-gray-700">{tx.number}</td>
                          <td className="p-2.5 text-gray-600">{formatDate(tx.date)}</td>
                          <td className="p-2.5 text-right font-semibold text-gray-800">
                            ₹ {Number(tx.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-right font-bold text-red-600">
                            ₹ {Number(tx.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-center text-gray-400">
                            <MoreVertical className="w-3.5 h-3.5 inline" />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
              Select a party from the left to view details and transactions.
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddPartyModal
        isOpen={isAddPartyOpen}
        onClose={() => setIsAddPartyOpen(false)}
        onPartyAdded={handlePartyCreated}
      />

      <PaymentInModal
        isOpen={isPaymentInOpen}
        onClose={() => setIsPaymentInOpen(false)}
        initialParty={selectedParty}
        onPaymentSuccess={() => {
          loadParties();
          if (selectedParty) loadPartyDetail(selectedParty.id);
        }}
      />

      {previewSale && (
        <InvoicePreviewModal
          sale={previewSale}
          business={business}
          onClose={() => setPreviewSale(null)}
        />
      )}
    </div>
  );
}

