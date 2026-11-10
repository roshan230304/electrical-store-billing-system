import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Search, X, Package, Users, Receipt, ArrowRight } from 'lucide-react';

export default function QuickSearchModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [parties, setParties] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setItems([]);
      setParties([]);
      setSales([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [itemsRes, partiesRes, salesRes] = await Promise.all([
          api.getItems(query),
          api.getParties(query),
          api.getSales({ search: query })
        ]);
        if (itemsRes.success) setItems(itemsRes.data.slice(0, 5));
        if (partiesRes.success) setParties(partiesRes.data.slice(0, 5));
        if (salesRes.success) setSales(salesRes.data.slice(0, 5));
      } catch (err) {
        console.error('Quick search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200">
        {/* Search Input Bar */}
        <div className="p-3 border-b border-gray-200 flex items-center space-x-2 bg-gray-50">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items by name/code, parties by name/phone, invoices..."
            className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
          />
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="text-center py-6 text-gray-400 text-xs">Searching database...</div>
          )}

          {!loading && !query.trim() && (
            <div className="text-center py-8 text-gray-400 text-xs">
              Type to instantly search across Products, Customers, Suppliers, and Invoices.
            </div>
          )}

          {!loading && query.trim() && items.length === 0 && parties.length === 0 && sales.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-xs">
              No matching records found for "{query}".
            </div>
          )}

          {/* Items Section */}
          {items.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                <Package className="w-3.5 h-3.5 mr-1" /> Products / Items
              </div>
              <div className="space-y-1">
                {items.map(it => (
                  <div
                    key={it.id}
                    onClick={() => { navigate(`/items`); onClose(); }}
                    className="p-2 hover:bg-blue-50 rounded flex items-center justify-between cursor-pointer border border-transparent hover:border-blue-200 transition"
                  >
                    <div>
                      <span className="font-semibold text-xs text-gray-800">{it.name}</span>
                      <span className="text-[11px] text-gray-500 ml-2">Code: {it.item_code}</span>
                      <span className="text-[11px] text-gray-500 ml-2">Stock: {it.current_stock}</span>
                    </div>
                    <span className="text-xs font-bold text-blue-600">₹{it.sale_price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parties Section */}
          {parties.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                <Users className="w-3.5 h-3.5 mr-1" /> Parties / Customers
              </div>
              <div className="space-y-1">
                {parties.map(p => (
                  <div
                    key={p.id}
                    onClick={() => { navigate(`/parties`); onClose(); }}
                    className="p-2 hover:bg-emerald-50 rounded flex items-center justify-between cursor-pointer border border-transparent hover:border-emerald-200 transition"
                  >
                    <div>
                      <span className="font-semibold text-xs text-gray-800">{p.name}</span>
                      <span className="text-[11px] text-gray-500 ml-2">{p.phone_number || 'No phone'}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-700">Bal: ₹{p.current_balance}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sales Section */}
          {sales.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                <Receipt className="w-3.5 h-3.5 mr-1" /> Sale Invoices
              </div>
              <div className="space-y-1">
                {sales.map(s => (
                  <div
                    key={s.id}
                    onClick={() => { navigate(`/sales`); onClose(); }}
                    className="p-2 hover:bg-red-50 rounded flex items-center justify-between cursor-pointer border border-transparent hover:border-red-200 transition"
                  >
                    <div>
                      <span className="font-semibold text-xs text-gray-800">Invoice #{s.invoice_number}</span>
                      <span className="text-[11px] text-gray-500 ml-2">{s.customer_name}</span>
                    </div>
                    <span className="text-xs font-bold text-[#e01a4f]">₹{s.grand_total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

