import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { ArrowLeft, Tag, ChevronDown, CheckCircle2 } from 'lucide-react';

export default function OrderSummary() {
  const navigate = useNavigate();
  const location = useLocation();

  const [couponApplied, setCouponApplied] = useState(true);
  const [gstin, setGstin] = useState('');
  const [showGstin, setShowGstin] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  // Pricing breakdown matching frame_1290s_080.jpg
  const basePrice = 9899.00;
  const couponDiscount = couponApplied ? 1979.80 : 0.00;
  const taxable = basePrice - couponDiscount;
  const gst18 = Math.round(taxable * 0.18 * 100) / 100; // 1425.46
  const totalAmount = Math.round((taxable + gst18) * 100) / 100; // 9344.66
  const totalSaved = couponApplied ? 10779.80 : 8800.00;

  const handlePay = () => {
    setIsPaid(true);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto py-2 text-xs">
      {/* Header matching frame_1290s_080.jpg */}
      <div className="flex items-center space-x-3">
        <button onClick={() => navigate('/plans')} className="p-1 hover:bg-gray-200 rounded text-gray-700">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-base font-bold text-gray-800">Review Order Summary</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Plan details, Coupon, GSTIN matching frame_1290s_080.jpg */}
        <div className="md:col-span-7 space-y-4">
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase mb-2">View Selected Plans</div>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 flex justify-between items-center shadow-xs">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center font-bold text-sm">
                  ▼
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">ApexBill Gold</h3>
                  <p className="text-[11px] text-gray-500">Desktop + Mobile • 3 Years</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-gray-400 line-through text-xs block">₹18699</span>
                <span className="font-extrabold text-base text-gray-900">₹9899</span>
              </div>
            </div>
          </div>

          {/* Coupon Box matching frame_1290s_080.jpg */}
          <div>
            <div className="text-[11px] font-bold text-gray-500 uppercase mb-2">Apply Coupon</div>
            {couponApplied ? (
              <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Tag className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-purple-900">"GRAB60" Flat ₹1979.80 OFF applied!</span>
                    <span className="block text-[11px] text-gray-500">Coupon Expires in 12h : 50m</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCouponApplied(false)}
                  className="px-3 py-1 border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-semibold transition"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter Promo Code"
                  defaultValue="GRAB60"
                  className="border border-gray-300 rounded px-3 py-1.5 uppercase outline-none text-xs flex-1 font-mono font-bold"
                />
                <button
                  onClick={() => setCouponApplied(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-1.5 rounded text-xs"
                >
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Add GSTIN dropdown matching frame_1290s_080.jpg */}
          <div className="border border-gray-200 rounded-lg p-3 bg-white">
            <div
              onClick={() => setShowGstin(!showGstin)}
              className="flex justify-between items-center cursor-pointer font-semibold text-gray-700 text-xs"
            >
              <span>Add GSTIN (Optional)</span>
              <ChevronDown className={`w-4 h-4 transition ${showGstin ? 'rotate-180' : ''}`} />
            </div>
            {showGstin && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="Enter 15-digit GSTIN for tax invoice credit"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none uppercase font-mono"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Price Details matching frame_1290s_080.jpg */}
        <div className="md:col-span-5 bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">
            Price Details
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Gold (Desktop + Mobile • 3 Years)</span>
              <span className="font-medium text-gray-900">₹{basePrice.toFixed(2)}</span>
            </div>

            {couponApplied && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Coupon Discount</span>
                <span>-₹{couponDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600">
              <span>GST (18%)</span>
              <span className="font-medium text-gray-900">₹{gst18.toFixed(2)}</span>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm font-black text-gray-900">
                <span>Total Amount</span>
                <span className="text-base">₹{totalAmount.toFixed(2)}</span>
              </div>
              <div className="text-[11px] text-emerald-600 font-bold text-right mt-0.5">
                You saved ₹{totalSaved.toFixed(2)}!
              </div>
            </div>
          </div>

          {isPaid ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-bold text-sm">Payment Successful!</p>
              <p className="text-[11px]">Your 3-Year ApexBill Gold License has been activated successfully.</p>
            </div>
          ) : (
            <button
              onClick={handlePay}
              className="w-full bg-[#e01a4f] hover:bg-[#c71342] text-white py-3 rounded-lg font-bold text-sm shadow-md transition active:scale-95 flex items-center justify-center space-x-1"
            >
              <span>Pay ₹{totalAmount.toFixed(2)} Now</span>
            </button>
          )}

          <div className="text-[10px] text-gray-400 text-center">
            Secured 256-bit encrypted checkout with UPI, Netbanking & Cards
          </div>
        </div>
      </div>
    </div>
  );
}

