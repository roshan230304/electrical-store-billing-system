import React, { useState } from 'react';
import TallyTheme from './TallyTheme';
import DoubleDivineTheme from './DoubleDivineTheme';
import ThermalReceipt from './ThermalReceipt';
import {
  Printer,
  Download,
  Share2,
  Mail,
  MessageSquare,
  X,
  Check,
  ChevronDown,
  Sparkles
} from 'lucide-react';

export default function InvoicePreviewModal({ sale, business, onClose }) {
  const [selectedTheme, setSelectedTheme] = useState('Tally Theme');
  const [selectedColor, setSelectedColor] = useState('#e01a4f');
  const [isThermal, setIsThermal] = useState(false);

  const themes = [
    { name: 'Tally Theme', desc: 'Classic tabular accounting layout' },
    { name: 'Double Divine', desc: 'Modern header wave with vibrant accents' },
    { name: 'GST Theme 1', desc: 'Government compliance standard format' },
    { name: 'GST Theme 3', desc: 'Compact retail GST bill' },
    { name: 'French Elite', desc: 'Minimalist contemporary luxury theme' },
    { name: 'Landscape Theme 1', desc: 'Save paper layout' },
    { name: 'Landscape Theme 2', desc: 'Dual-invoice per page format' }
  ];

  const colors = [
    { name: 'Apex Red', hex: '#e01a4f' },
    { name: 'Ocean Blue', hex: '#1976d2' },
    { name: 'Sunset Orange', hex: '#f59e0b' },
    { name: 'Emerald Green', hex: '#10b981' },
    { name: 'Deep Purple', hex: '#7c3aed' }
  ];

  const handlePrintNormal = () => {
    setIsThermal(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintThermal = () => {
    setIsThermal(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleShareWhatsApp = () => {
    const text = `Dear ${sale.customer_name}, your invoice #${sale.invoice_number} from ${business?.business_name || 'HiTech'} for ₹${sale.grand_total} is ready. Thank you!`;
    const phone = sale.phone_number ? sale.phone_number.replace(/\D/g, '') : '';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 lg:p-4 overflow-hidden">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-[1280px] h-[92vh] flex flex-col overflow-hidden">
        {/* Header Bar matching video: "Preview" and "Save & Close" */}
        <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-gray-800 text-sm">Preview</span>
            <span className="text-[10px] text-gray-500">
              {sale.invoice_number} · {sale.phone_number || 'No phone'} · Earned {sale.points_earned || 0} pts
              {Number(sale.points_redeemed || 0) > 0 && ` · Redeemed ${sale.points_redeemed} pts`}
              {sale.remaining_points !== undefined && ` · Balance ${sale.remaining_points} pts`}
            </span>
          </div>

          <div className="flex items-center space-x-4 text-xs">
            <label className="flex items-center space-x-1.5 text-gray-600 cursor-pointer">
              <input type="checkbox" className="rounded text-[#e01a4f]" />
              <span>Do not show Invoice preview again</span>
            </label>
            <button
              onClick={onClose}
              className="text-blue-600 font-semibold hover:underline flex items-center"
            >
              Save & Close
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal 3-Column Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Select Theme & Color (matching frame_0570s_029.jpg) */}
          <div className="w-56 bg-gray-50 border-r border-gray-200 p-3 overflow-y-auto no-print space-y-4 text-xs">
            <div>
              <div className="font-bold text-gray-800 mb-2">Select Theme</div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-gray-500 uppercase flex items-center justify-between">
                  <span>Classic Themes</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
                {themes.map(t => (
                  <button
                    key={t.name}
                    onClick={() => { setSelectedTheme(t.name); setIsThermal(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded transition ${
                      selectedTheme === t.name && !isThermal
                        ? 'bg-blue-100/70 text-blue-800 font-bold border-l-2 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-200/60'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Presets */}
            <div className="pt-2 border-t border-gray-200">
              <div className="font-bold text-gray-800 mb-2">Select Color</div>
              <div className="flex items-center space-x-2">
                {colors.map(c => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition shadow-sm ${
                      selectedColor === c.hex ? 'ring-2 ring-offset-1 ring-blue-500' : 'hover:scale-110'
                    }`}
                    title={c.name}
                  >
                    {selectedColor === c.hex && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Helper tip */}
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 flex items-start space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>Use this theme for a clean, verified, and professional tax invoice.</span>
            </div>
          </div>

          {/* Center Column: Scrollable Invoice Document Render */}
          <div className="flex-1 bg-gray-100 overflow-y-auto p-4 flex justify-center items-start">
            <div id="printable-invoice" className="w-full">
              {isThermal ? (
                <ThermalReceipt sale={sale} business={business} />
              ) : selectedTheme === 'Double Divine' ? (
                <DoubleDivineTheme sale={sale} business={business} accentColor={selectedColor} />
              ) : (
                <TallyTheme sale={sale} business={business} primaryColor={selectedColor} />
              )}
            </div>
          </div>

          {/* Right Column: Actions & Share matching frame_0570s_029.jpg */}
          <div className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto no-print space-y-5 text-xs">
            {/* Online payment banner */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 text-center space-y-2">
              <div className="flex justify-center space-x-2 text-gray-700 text-[10px]">
                <span className="font-bold">BHIM UPI</span>
                <span>•</span>
                <span>Credit/Debit Cards</span>
              </div>
              <p className="text-[11px] font-semibold text-gray-800">
                Accept Online Payments & Reconcile with ApexBill
              </p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-1.5 rounded-full shadow-sm">
                Start Now
              </button>
            </div>

            {/* Share Invoice Section */}
            <div>
              <div className="font-bold text-gray-800 mb-3">Share Invoice</div>
              <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                <button
                  onClick={handleShareWhatsApp}
                  className="flex flex-col items-center p-1.5 rounded hover:bg-gray-50 transition group"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow group-hover:scale-105 transition">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <span className="mt-1 font-medium text-gray-700">Whatsapp</span>
                </button>

                <button
                  onClick={() => window.open(`mailto:?subject=Invoice ${sale.invoice_number}&body=Please find your invoice attached.`)}
                  className="flex flex-col items-center p-1.5 rounded hover:bg-gray-50 transition group"
                >
                  <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow group-hover:scale-105 transition">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="mt-1 font-medium text-gray-700">Gmail</span>
                </button>

                <button
                  onClick={() => alert(`SMS sending simulated for Invoice #${sale.invoice_number}`)}
                  className="flex flex-col items-center p-1.5 rounded hover:bg-gray-50 transition group"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-400 text-white flex items-center justify-center shadow group-hover:scale-105 transition">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span className="mt-1 font-medium text-gray-700">Message</span>
                </button>

                <button
                  onClick={() => alert('ApexBill Network link copied to clipboard')}
                  className="flex flex-col items-center p-1.5 rounded hover:bg-gray-50 transition group"
                >
                  <div className="w-8 h-8 rounded-full bg-[#e01a4f] text-white flex items-center justify-center shadow font-bold text-xs group-hover:scale-105 transition">
                    A
                  </div>
                  <span className="mt-1 font-medium text-gray-700">ApexBill</span>
                </button>
              </div>
            </div>

            {/* Print & Download Action Buttons matching video */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <button
                onClick={handlePrintNormal}
                className="w-full bg-[#1976d2] hover:bg-[#1565c0] text-white py-2.5 px-3 rounded flex items-center justify-center font-semibold text-xs shadow transition active:scale-95"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Invoice (Normal)
              </button>

              <button
                onClick={handlePrintThermal}
                className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-2.5 px-3 rounded flex items-center justify-center font-medium text-xs transition"
              >
                <Printer className="w-4 h-4 mr-2 text-gray-500" />
                Print Invoice (Thermal)
              </button>

              <button
                onClick={handlePrintNormal}
                className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 px-3 rounded flex items-center justify-center font-medium text-xs transition"
              >
                <Download className="w-4 h-4 mr-2 text-gray-500" />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
