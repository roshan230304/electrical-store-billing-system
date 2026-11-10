import React, { useState } from 'react';
import { api } from '../../services/api';
import { Settings, X, Plus } from 'lucide-react';

export default function AddPartyModal({ isOpen, onClose, onPartyAdded, defaultType }) {
  const [activeTab, setActiveTab] = useState('gst'); // 'gst' | 'credit' | 'additional'
  const [formData, setFormData] = useState({
    name: '',
    gstin: '',
    phone_number: '',
    gst_type: 'Unregistered/Consumer',
    state: 'Karnataka',
    email: '',
    billing_address: '',
    shipping_address: '',
    opening_balance: '0',
    party_type: defaultType || 'Both'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (saveAndNew = false) => {
    if (!formData.name.trim()) {
      setError('Party Name is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await api.createParty(formData);
      if (res.success) {
        if (onPartyAdded) onPartyAdded(res.data);
        if (saveAndNew) {
          setFormData({
            name: '',
            gstin: '',
            phone_number: '',
            gst_type: 'Unregistered/Consumer',
            state: 'Karnataka',
            email: '',
            billing_address: '',
            shipping_address: '',
            opening_balance: '0',
            party_type: defaultType || 'Both'
          });
        } else {
          onClose();
        }
      } else {
        setError(res.message || 'Failed to save party');
      }
    } catch (err) {
      setError('Server connection error while saving party');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header matching frame_0240s_015.jpg */}
        <div className="p-3.5 px-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">Add Party</h2>
          <div className="flex items-center space-x-2 text-gray-400">
            <button className="hover:text-gray-600 p-1"><Settings className="w-4 h-4" /></button>
            <button onClick={onClose} className="hover:text-gray-600 p-1"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-700 text-xs px-5 py-2 border-b border-red-200">
            {error}
          </div>
        )}

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {/* Top Row Inputs matching video: Party Name *, GSTIN, Phone Number */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Party Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="HiTech"
                className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="29ABCDE1234F1Z5"
                className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:border-blue-500 outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="9742762826"
                className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Tabs matching video */}
          <div className="border-b border-gray-200 flex space-x-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('gst')}
              className={`pb-2 border-b-2 transition ${
                activeTab === 'gst' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              GST & Address
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('credit')}
              className={`pb-2 border-b-2 flex items-center transition ${
                activeTab === 'credit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Credit & Balance
              <span className="ml-1 bg-red-600 text-white text-[9px] px-1 rounded font-bold">New</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('additional')}
              className={`pb-2 border-b-2 transition ${
                activeTab === 'additional' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Additional Fields
            </button>
          </div>

          {/* GST & Address Tab */}
          {activeTab === 'gst' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">GST Type</label>
                  <select
                    value={formData.gst_type}
                    onChange={(e) => setFormData({ ...formData, gst_type: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white outline-none"
                  >
                    <option value="Unregistered/Consumer">Unregistered/Consumer</option>
                    <option value="Registered Regular">Registered Regular</option>
                    <option value="Registered Composition">Registered Composition</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">State</label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white outline-none"
                  >
                    <option value="Karnataka">Karnataka</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Kerala">Kerala</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Email ID</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="client@gmail.com"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Billing Address</label>
                  <textarea
                    rows={3}
                    value={formData.billing_address}
                    onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                    placeholder="Enter Billing Address"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none resize-none"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Shipping Address</label>
                  <textarea
                    rows={2}
                    value={formData.shipping_address}
                    onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                    placeholder="Enter Shipping Address (if different)"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none resize-none"
                  ></textarea>
                </div>
              </div>
            </div>
          )}

          {/* Credit & Balance Tab */}
          {activeTab === 'credit' && (
            <div className="pt-2 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    value={formData.opening_balance}
                    onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">Party Type</label>
                  <select
                    value={formData.party_type}
                    onChange={(e) => setFormData({ ...formData, party_type: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white outline-none"
                  >
                    <option value="Customer">Customer</option>
                    <option value="Supplier">Supplier</option>
                    <option value="Both">Both Customer & Supplier</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Additional Fields Tab */}
          {activeTab === 'additional' && (
            <div className="py-4 text-center text-xs text-gray-400">
              No additional custom fields configured.
            </div>
          )}
        </div>

        {/* Footer matching frame_0240s_015.jpg */}
        <div className="p-3.5 px-5 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit(true)}
            className="px-4 py-1.5 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded text-xs font-semibold transition"
          >
            Save & New
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit(false)}
            className="px-6 py-1.5 bg-[#1976d2] hover:bg-[#1565c0] text-white rounded text-xs font-semibold transition shadow-sm"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

