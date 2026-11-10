import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Camera, Edit2, Upload, CheckCircle2 } from 'lucide-react';

export default function EditProfile() {
  const { business, refreshBusiness } = useAuth();

  const [formData, setFormData] = useState({
    business_name: 'HiTech',
    phone_number: '9742762826',
    gstin: '29ABCDE1234F1Z5',
    email: 'contact@hitech.in',
    business_type: 'Manufacturing & Retail',
    business_category: 'Electrical & Electronics Equipments',
    state: 'Karnataka',
    pincode: '560100',
    business_address: 'Chandapura Main Road, Electronic City Phase 2, Bangalore, Karnataka',
    signature_url: '',
    logo_url: '',
    account_books_beginning_date: '2026-10-29'
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (business) {
      setFormData(prev => ({
        ...prev,
        ...business,
        account_books_beginning_date: business.account_books_beginning_date
          ? String(business.account_books_beginning_date).split('T')[0]
          : '2026-10-29'
      }));
    }
  }, [business]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.updateBusinessProfile(formData);
      if (res.success) {
        setSuccessMsg('Business profile saved successfully!');
        refreshBusiness();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setError(res.message || 'Failed to update profile');
      }
    } catch (err) {
      setError('Server connection error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[calc(100vh-65px)] text-xs">
      <div className="p-3.5 px-6 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-sm font-bold text-gray-800">Edit Profile</h1>
        {successMsg && (
          <span className="text-emerald-700 font-semibold flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-500" /> {successMsg}
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs px-6 py-2 border-b border-red-200">
          {error}
        </div>
      )}

      {/* Main Profile Form matching frame_1140s_072.jpg */}
      <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center gap-5">
          <div className="relative flex h-28 w-72 items-center justify-center overflow-hidden rounded-[18px] border-[4px] border-white bg-[#090d12] shadow-[0_12px_24px_rgba(0,0,0,0.12)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(72,201,133,0.16),transparent_35%)]" />
            <div className="relative flex flex-col items-center justify-center gap-1">
              <div className="select-none text-[56px] font-black leading-none tracking-[-0.12em] text-[#f3f4f5]" style={{ fontFamily: 'Arial Black, Inter, sans-serif', textShadow: '0 0 0 #f3f4f5' }}>
                <span className="inline-block -mr-1">A</span>
                <span className="inline-block text-[#48C985]">P</span>
                <span className="inline-block">E</span>
                <span className="inline-block text-[#48C985]">X</span>
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.5em] text-[#c2c8ce]">
                Creative Design
              </div>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="font-bold text-sm text-gray-800">{formData.business_name}</h2>
            <p className="text-[11px] text-gray-500">Official business identity displayed on sales invoices and receipts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {/* Section 1: Business Details */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wide border-b border-gray-100 pb-1">
              Business Details
            </h3>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Business Name *</label>
              <input
                type="text"
                required
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">GSTIN</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="Enter GSTIN"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Email ID</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter Email ID"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Account Books Beginning Date</label>
              <input
                type="date"
                value={formData.account_books_beginning_date}
                onChange={(e) => setFormData({ ...formData, account_books_beginning_date: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
              />
            </div>
          </div>

          {/* Section 2: More Details */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wide border-b border-gray-100 pb-1">
              More Details
            </h3>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Business Type</label>
              <select
                value={formData.business_type}
                onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white outline-none"
              >
                <option value="Manufacturing & Retail">Manufacturing & Retail</option>
                <option value="Retailer">Retailer</option>
                <option value="Wholesaler">Wholesaler</option>
                <option value="Distributor">Distributor</option>
                <option value="Service Provider">Service Provider</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Business Category</label>
              <select
                value={formData.business_category}
                onChange={(e) => setFormData({ ...formData, business_category: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white outline-none"
              >
                <option value="Electrical & Electronics Equipments">Electrical & Electronics Equipments</option>
                <option value="Accounting & CA">Accounting & CA</option>
                <option value="Interior Designer">Interior Designer</option>
                <option value="Automobiles/ Auto parts">Automobiles/ Auto parts</option>
                <option value="Salon & Spa">Salon & Spa</option>
                <option value="Book / Stationary store">Book / Stationary store</option>
                <option value="Construction Materials & Equipment">Construction Materials & Equipment</option>
                <option value="Chemicals & Fertilizers">Chemicals & Fertilizers</option>
                <option value="Computer Equipments & Softwares">Computer Equipments & Softwares</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">State</label>
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
                <option value="Telangana">Telangana</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Pincode</label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="Enter Pincode"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none font-mono"
              />
            </div>
          </div>

          {/* Section 3: Address & Signature */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wide border-b border-gray-100 pb-1">
              Address & Signature
            </h3>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Business Address</label>
              <textarea
                rows={3}
                value={formData.business_address}
                onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                placeholder="Enter Business Address"
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none resize-none"
              ></textarea>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Add Signature</label>
              <div 
                onClick={() => alert('Signature upload dialog')}
                className="border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg p-5 text-center cursor-pointer space-y-1 transition"
              >
                <Upload className="w-5 h-5 mx-auto text-gray-400" />
                <span className="font-semibold text-gray-600 block">Upload Signature</span>
                <span className="text-[10px] text-gray-400 block">PNG, JPG with transparent background</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Buttons matching frame_1140s_072.jpg */}
        <div className="pt-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-[#e01a4f] hover:bg-[#c71342] text-white rounded font-bold shadow-sm transition"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

