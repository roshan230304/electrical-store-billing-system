import React, { useState } from 'react';
import { api } from '../../services/api';
import { X, ShieldCheck } from 'lucide-react';

export default function AddUserModal({ isOpen, onClose, onUserAdded }) {
  const [fullName, setFullName] = useState('');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [userRole, setUserRole] = useState('Salesman/Biller');
  const [viewAccess, setViewAccess] = useState('Self-Created Transactions');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Default permissions matrix matching video frame_1080s_066.jpg
  const [permissions, setPermissions] = useState({
    saleInvoice: { view: true, create: true, edit: false, share: true, cancel: false, delete: false },
    quotation: { view: true, create: true, edit: false, share: true, cancel: false, delete: false },
    posBilling: { view: true, create: true, edit: false, share: true, cancel: false, delete: false },
    parties: { view: true, create: true, edit: false, share: true, cancel: false, delete: false },
    items: { view: true, create: false, edit: false, share: false, cancel: false, delete: false }
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !phoneOrEmail.trim()) {
      setError('Full Name and Phone/Email are required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await api.createUser({
        full_name: fullName.trim(),
        phone_or_email: phoneOrEmail.trim(),
        user_role: userRole,
        view_access: viewAccess
      });

      if (res.success) {
        if (onUserAdded) onUserAdded(res.data);
        onClose();
      } else {
        setError(res.message || 'Failed to create user');
      }
    } catch (err) {
      setError('Server error creating user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-3.5 px-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-sm text-gray-800">Add User & Assign Role</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-xs px-5 py-2 border-b border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* User inputs matching video frame_1080s_066.jpg */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dhinesh"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Phone Number or Email *</label>
              <input
                type="text"
                required
                value={phoneOrEmail}
                onChange={(e) => setPhoneOrEmail(e.target.value)}
                placeholder="9742762826"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">User Role *</label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white outline-none"
              >
                <option value="Salesman/Biller">Salesman/Biller</option>
                <option value="Admin">Admin</option>
                <option value="Partner">Partner</option>
                <option value="Accountant">Accountant</option>
                <option value="Stock Keeper">Stock Keeper</option>
              </select>
            </div>
          </div>

          {/* View Access Radios matching frame_1080s_066.jpg */}
          <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
            <div>
              <div className="font-bold text-gray-800">{userRole} Permissions</div>
              <div className="text-[11px] text-gray-500">View Self-Created Transactions: User can access transactions created by themselves only.</div>
            </div>

            <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-full text-[11px]">
              <button
                type="button"
                onClick={() => setViewAccess('All Transactions')}
                className={`px-3 py-1 rounded-full font-medium transition ${
                  viewAccess === 'All Transactions' ? 'bg-white shadow text-gray-900 font-bold' : 'text-gray-500'
                }`}
              >
                All Transactions
              </button>
              <button
                type="button"
                onClick={() => setViewAccess('Self-Created Transactions')}
                className={`px-3 py-1 rounded-full font-medium transition ${
                  viewAccess === 'Self-Created Transactions' ? 'bg-white shadow text-blue-700 font-bold' : 'text-gray-500'
                }`}
              >
                Self-Created Transactions
              </button>
            </div>
          </div>

          {/* Granular Permissions Table matching frame_1080s_066.jpg */}
          <div className="border border-gray-200 rounded overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-bold text-gray-600 uppercase border-b border-gray-200">
                <tr>
                  <th className="p-2">Module / Action</th>
                  <th className="p-2 text-center">View</th>
                  <th className="p-2 text-center">Create</th>
                  <th className="p-2 text-center">Edit</th>
                  <th className="p-2 text-center">Share</th>
                  <th className="p-2 text-center">Cancel</th>
                  <th className="p-2 text-center">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[11px]">
                <tr>
                  <td className="p-2 font-medium">Sale Invoice</td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.saleInvoice.view} readOnly className="rounded text-blue-600" /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.saleInvoice.create} readOnly className="rounded text-blue-600" /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.saleInvoice.edit} readOnly className="rounded" /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.saleInvoice.share} readOnly className="rounded text-blue-600" /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.saleInvoice.cancel} readOnly className="rounded" /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.saleInvoice.delete} readOnly className="rounded" /></td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Estimate / Quotation</td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.quotation.view} readOnly className="rounded text-blue-600" /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.quotation.create} readOnly className="rounded text-blue-600" /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.quotation.edit} readOnly className="rounded" /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.quotation.share} readOnly className="rounded text-blue-600" /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.quotation.cancel} readOnly className="rounded" /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.quotation.delete} readOnly className="rounded" /></td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">POS Billing</td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.posBilling.view} readOnly className="rounded text-blue-600" /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.posBilling.create} readOnly className="rounded text-blue-600" /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.posBilling.edit} readOnly className="rounded" /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.posBilling.share} readOnly className="rounded text-blue-600" /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.posBilling.cancel} readOnly className="rounded" /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={permissions.posBilling.delete} readOnly className="rounded" /></td>
                </tr>
              </tbody>
            </table>
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
              className="px-6 py-1.5 bg-[#e01a4f] hover:bg-[#c71342] text-white rounded font-semibold shadow-sm transition"
            >
              {saving ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

