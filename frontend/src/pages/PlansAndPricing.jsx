import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, ChevronDown, Award, Sparkles } from 'lucide-react';

export default function PlansAndPricing() {
  const navigate = useNavigate();
  const [deviceType, setDeviceType] = useState('Desktop + Mobile');
  const [duration, setDuration] = useState('1 Year');

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Top Header matching frame_1260s_079.jpg */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-gray-800">Plans & Pricing</h1>

        <button
          onClick={() => alert('Multiple licenses inquiry')}
          className="border border-blue-600 text-blue-600 hover:bg-blue-50 px-3.5 py-1.5 rounded text-xs font-semibold transition"
        >
          Buy Multiple Licenses
        </button>
      </div>

      {/* Selectors matching frame_1260s_079.jpg */}
      <div className="flex justify-center space-x-3 text-xs">
        <div className="border border-gray-300 rounded-full px-4 py-1.5 bg-white flex items-center space-x-1 cursor-pointer font-medium shadow-xs">
          <span>{deviceType}</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
        </div>

        <div className="border border-gray-300 rounded-full px-4 py-1.5 bg-white flex items-center space-x-1 cursor-pointer font-medium shadow-xs">
          <span>{duration}</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
        </div>
      </div>

      {/* 2 Plan Cards matching frame_1260s_079.jpg */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Card 1: Gold */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs">
                ▼
              </div>
              <h2 className="text-base font-bold text-gray-900">Gold</h2>
            </div>

            <div>
              <div className="flex items-baseline space-x-2">
                <span className="text-gray-400 line-through text-sm">₹9099</span>
                <span className="text-2xl font-black text-gray-900">₹4319.10</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Only ₹359.93 per month</div>
            </div>

            <button
              onClick={() => navigate('/order-summary?plan=Gold')}
              className="w-full border border-red-500 text-red-600 hover:bg-red-50 py-2 rounded-lg font-bold text-xs transition"
            >
              Get ApexBill Gold
            </button>

            {/* Features list */}
            <div className="space-y-2.5 text-xs pt-3 border-t border-gray-100">
              <div className="flex items-center text-gray-400">
                <X className="w-4 h-4 mr-2 text-rose-400" />
                <span>ApexBill POS Billing</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Check className="w-4 h-4 mr-2 text-emerald-600 font-bold" />
                <span>Send Invoice(s) on Whatsapp (Unlimited)</span>
              </div>
              <div className="flex items-center text-gray-400">
                <X className="w-4 h-4 mr-2 text-rose-400" />
                <span>Weighing Scale Integration</span>
              </div>
              <div className="flex items-center text-gray-400">
                <X className="w-4 h-4 mr-2 text-rose-400" />
                <span>In-built Item Library</span>
              </div>
              <div className="flex items-center text-gray-400">
                <X className="w-4 h-4 mr-2 text-rose-400" />
                <span>Accept POS payments</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Check className="w-4 h-4 mr-2 text-emerald-600 font-bold" />
                <span>Sync data across devices</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Check className="w-4 h-4 mr-2 text-emerald-600 font-bold" />
                <span>Create multiple companies (5 companies)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Retail Pro (Most Popular) matching frame_1260s_079.jpg */}
        <div className="bg-white rounded-xl border-2 border-red-400 p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
          {/* Badge */}
          <div className="absolute top-0 right-0 bg-[#e01a4f] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wide">
            Most Popular
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                ▼
              </div>
              <h2 className="text-base font-bold text-gray-900">Retail Pro</h2>
            </div>

            <div>
              <div className="flex items-baseline space-x-2">
                <span className="text-gray-400 line-through text-sm">₹18999</span>
                <span className="text-2xl font-black text-gray-900">₹8999.10</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Only ₹749.93 per month</div>
            </div>

            <button
              onClick={() => navigate('/order-summary?plan=RetailPro')}
              className="w-full bg-[#e01a4f] hover:bg-[#c71342] text-white py-2 rounded-lg font-bold text-xs transition shadow"
            >
              Get ApexBill Retail Pro
            </button>

            {/* Features list */}
            <div className="space-y-2.5 text-xs pt-3 border-t border-gray-100">
              <div className="flex items-center text-gray-800 font-medium">
                <Check className="w-4 h-4 mr-2 text-emerald-600 font-bold" />
                <span>ApexBill POS Billing</span>
              </div>
              <div className="flex items-center text-gray-800 font-medium">
                <Check className="w-4 h-4 mr-2 text-emerald-600 font-bold" />
                <span>Send Invoice(s) on Whatsapp (Unlimited)</span>
              </div>
              <div className="flex items-center text-gray-800 font-medium">
                <Check className="w-4 h-4 mr-2 text-emerald-600 font-bold" />
                <span>Weighing Scale Integration</span>
              </div>
              <div className="flex items-center text-gray-800 font-medium">
                <Check className="w-4 h-4 mr-2 text-emerald-600 font-bold" />
                <span>In-built Item Library</span>
              </div>
              <div className="flex items-center text-gray-800 font-medium">
                <Check className="w-4 h-4 mr-2 text-emerald-600 font-bold" />
                <span>Custom Label Printing</span>
              </div>
              <div className="flex items-center text-gray-800 font-medium">
                <Check className="w-4 h-4 mr-2 text-emerald-600 font-bold" />
                <span>Import From Barcode</span>
              </div>
              <div className="flex items-center text-gray-800 font-medium">
                <Check className="w-4 h-4 mr-2 text-emerald-600 font-bold" />
                <span>Create multiple companies (unlimited)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-2">
        <button
          onClick={() => alert('Full comparative matrix')}
          className="text-xs text-blue-600 font-bold hover:underline"
        >
          Compare All Features
        </button>
      </div>
    </div>
  );
}

