import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  DollarSign, Plus, Search, X, TrendingDown, Pencil, Trash2
} from 'lucide-react';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [period, setPeriod] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    description: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [search, selectedCategory, period]);

  const loadCategories = async () => {
    try {
      const res = await api.getExpenseCategories();
      if (res.success) setCategories(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.getExpenses({ search, category: selectedCategory, period });
      if (res.success) {
        setExpenses(res.data || []);
        setTotalAmount(res.totalAmount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    try {
      setSubmitting(true);
      const res = editingExpenseId
        ? await api.updateExpense(editingExpenseId, formData)
        : await api.createExpense(formData);
      if (res.success) {
        alert(editingExpenseId ? 'Expense updated successfully.' : 'Expense recorded successfully.');
        setShowAddModal(false);
        setEditingExpenseId(null);
        setFormData({
          title: '',
          category: '',
          amount: '',
          expense_date: new Date().toISOString().split('T')[0],
          payment_method: 'Cash',
          description: '',
          notes: ''
        });
        loadExpenses();
      } else {
        alert(res.message || 'Failed to record expense.');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpenseId(expense.id);
    setFormData({
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      expense_date: String(expense.expense_date).slice(0, 10),
      payment_method: expense.payment_method || 'Cash',
      description: expense.description || '',
      notes: expense.notes || ''
    });
    setShowAddModal(true);
  };

  const handleDeleteExpense = async (expense) => {
    if (!window.confirm(`Delete expense "${expense.title}"? This cannot be undone.`)) return;
    try {
      const result = await api.deleteExpense(expense.id);
      if (!result.success) throw new Error(result.message || 'Expense deletion failed.');
      await loadExpenses();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f4f6f9] overflow-hidden select-none">
      {/* Header Bar */}
      <div className="h-12 bg-white border-b border-gray-200 px-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-amber-600" />
            <h1 className="font-bold text-gray-800 text-sm">Operating Expenses</h1>
          </div>
          <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
            Total: {formatCurrency(totalAmount)}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs outline-none focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs outline-none focus:border-blue-500"
          >
            <option value="">All dates</option>
            <option value="daily">Today</option>
            <option value="weekly">Last 7 days</option>
            <option value="monthly">This month</option>
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expense # or note..."
              className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 rounded text-xs outline-none focus:border-blue-500 w-52"
            />
          </div>

          <button
            onClick={() => {
              setEditingExpenseId(null);
              setFormData({
                title: '', category: '', amount: '',
                expense_date: new Date().toISOString().split('T')[0],
                payment_method: 'Cash', description: '', notes: ''
              });
              setShowAddModal(true);
            }}
            className="bg-[#1976d2] hover:bg-[#1565c0] text-white px-3 py-1.5 rounded font-bold text-xs shadow-sm flex items-center space-x-1 transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="flex-1 overflow-y-auto p-4">
        {expenses.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
            <TrendingDown className="w-12 h-12 stroke-[1.2] text-gray-300" />
            <p className="text-xs font-medium">No expenses recorded yet.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded text-xs font-semibold"
            >
              + Record Your First Expense
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Payment Method</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 transition">
                    <td className="py-2.5 px-3 text-gray-600">{formatDate(e.expense_date)}</td>
                    <td className="py-2.5 px-3 font-bold text-gray-800">{e.title}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-medium">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 max-w-xs truncate">{e.description || '-'}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {e.payment_method}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-gray-900">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEditExpense(e)} title="Edit expense" className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteExpense(e)} title="Delete expense (admin only)" className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record or edit expense modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-gray-900 text-sm">{editingExpenseId ? 'Edit Expense' : 'Record Store Operating Expense'}</span>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Expense Title *</label>
                <input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Expense Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => {
                    setFormData({ ...formData, category: e.target.value });
                  }}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none focus:border-blue-500 font-medium"
                >
                  <option value="">Select Category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none focus:border-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none focus:border-blue-500"
                  >
                    <option value="Cash">Cash in Hand</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Notes</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Notes / Description</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Electrician repair charges, carry bag bundles purchase..."
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingExpenseId ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
