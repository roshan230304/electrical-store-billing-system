import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatCurrency, formatDate, numberToWords } from '../../utils/formatters';

export default function DoubleDivineTheme({ sale, business, accentColor = '#e01a4f' }) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    const upiId = sale.upi_id || business?.upi_id;
    if (!upiId) {
      setQrDataUrl('');
      return;
    }
    const amount = sale.grand_total || '0';
    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(business?.business_name || 'Electrical Store')}&am=${amount}&cu=INR`;

    QRCode.toDataURL(upiString, { width: 90, margin: 1 })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error(err));
  }, [sale, business]);

  const items = sale.items || [];

  return (
    <div className="bg-white text-black font-sans text-xs shadow-md border border-gray-200 max-w-[800px] mx-auto overflow-hidden leading-normal">
      {/* Curved Header Banner matching video frame_0600s_031.jpg */}
      <div className="relative bg-[#e01a4f] text-white p-6 pb-8">
        <div className="flex justify-between items-start relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded bg-white/20 border border-white/40 flex items-center justify-center font-bold text-lg">
              LOGO
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">{business?.business_name || 'HiTech'}</h1>
              <p className="text-xs text-white/80">{business?.business_address}</p>
              <p className="text-[11px] text-white/80">Phone: {business?.phone_number || '9742762826'}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black uppercase tracking-wider">Tax Invoice</div>
            <div className="text-xs text-white/90 mt-1">Invoice No: <span className="font-bold">#{sale.invoice_number}</span></div>
            <div className="text-xs text-white/90">Date: {formatDate(sale.invoice_date)}</div>
          </div>
        </div>

        {/* Decorative wave background styling */}
        <div className="absolute inset-x-0 bottom-0 h-4 bg-white rounded-t-[100%]"></div>
      </div>

      <div className="p-6 pt-2 space-y-4">
        {/* Bill To Info */}
        <div className="bg-gray-50 border border-gray-200 rounded p-3 flex justify-between">
          <div>
            <div className="text-[10px] font-bold text-gray-500 uppercase">Bill To:</div>
            <div className="font-bold text-sm text-gray-900">{sale.customer_name}</div>
            <div className="text-xs text-gray-600">Contact: {sale.phone_number || '-'}</div>
            {sale.billing_address && <div className="text-xs text-gray-600">{sale.billing_address}</div>}
          </div>
          <div className="text-right text-xs text-gray-600 space-y-0.5">
            <div><span className="font-semibold">State of Supply:</span> {sale.state_of_supply || 'Karnataka'}</div>
            <div><span className="font-semibold">Payment Mode:</span> {sale.payment_type || 'Cash'}</div>
          </div>
        </div>

        {/* Items Table with bold colored header matching frame_0600s_031.jpg */}
        <table className="w-full text-left border-collapse border border-gray-200">
          <thead>
            <tr className="bg-[#e01a4f] text-white text-[11px] font-bold">
              <th className="p-2 w-8 text-center">#</th>
              <th className="p-2">Item Name</th>
              <th className="p-2 text-center w-20">HSN</th>
              <th className="p-2 text-right w-16">Qty</th>
              <th className="p-2 text-right w-24">Price/Unit</th>
              <th className="p-2 text-right w-20">Discount</th>
              <th className="p-2 text-right w-24">GST</th>
              <th className="p-2 text-right w-24">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-xs">
            {items.map((it, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="p-2 text-center">{idx + 1}</td>
                <td className="p-2 font-semibold text-gray-800">{it.item_name}</td>
                <td className="p-2 text-center text-gray-500">{it.hsn_code || '-'}</td>
                <td className="p-2 text-right font-medium">{it.quantity}</td>
                <td className="p-2 text-right">₹{Number(it.price_per_unit).toFixed(2)}</td>
                <td className="p-2 text-right text-green-700">₹{Number(it.discount_amount || 0).toFixed(2)}</td>
                <td className="p-2 text-right">₹{Number(it.tax_amount || 0).toFixed(2)}</td>
                <td className="p-2 text-right font-bold text-gray-900">₹{Number(it.total_amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals & Bank Section */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Bank details & QR */}
          <div className="border border-gray-200 rounded p-3 flex items-center space-x-3 bg-gray-50">
            {qrDataUrl && <img src={qrDataUrl} alt="UPI QR" className="w-16 h-16 border bg-white p-0.5 rounded" />}
            <div className="text-[11px] space-y-0.5">
              {sale.bank_name && <div className="font-bold text-gray-800">{sale.bank_name}</div>}
              {sale.account_number && <div>A/C: <span className="font-semibold">{sale.account_number}</span></div>}
              {sale.ifsc_code && <div>IFSC: <span className="font-semibold">{sale.ifsc_code}</span></div>}
              {sale.upi_id && <div>UPI: <span className="font-semibold">{sale.upi_id}</span></div>}
              {qrDataUrl && <div className="text-[10px] text-gray-500 font-medium">Scan QR to pay via any UPI app</div>}
              {!qrDataUrl && !sale.bank_name && !sale.account_number && !sale.ifsc_code
                && <div className="text-gray-500">Payment details are not configured.</div>}
            </div>
          </div>

          {/* Amount Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded p-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span>₹{Number(sale.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax (GST):</span>
              <span>₹{Number(sale.tax_total).toFixed(2)}</span>
            </div>
            {Number(sale.cgst_amount || 0) > 0 && (
              <>
                <div className="flex justify-between text-gray-600"><span>CGST:</span><span>₹{Number(sale.cgst_amount).toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-600"><span>SGST:</span><span>₹{Number(sale.sgst_amount).toFixed(2)}</span></div>
              </>
            )}
            {Number(sale.igst_amount || 0) > 0 && (
              <div className="flex justify-between text-gray-600"><span>IGST:</span><span>₹{Number(sale.igst_amount).toFixed(2)}</span></div>
            )}
            <div className="flex justify-between font-black text-sm text-[#e01a4f] pt-1 border-t border-gray-300">
              <span>Grand Total:</span>
              <span>₹{Number(sale.grand_total).toFixed(2)}</span>
            </div>
            <div className="text-[10px] text-gray-500 italic">
              {numberToWords(sale.grand_total)}
            </div>
            <div className="flex justify-between text-gray-600 border-t pt-1">
              <span>Received:</span><span>₹{Number(sale.received_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Balance due:</span><span>₹{Number(sale.balance_due || 0).toFixed(2)}</span>
            </div>
            {(sale.payments || []).map((payment, index) => (
              <div key={`${payment.method}-${index}`} className="flex justify-between text-gray-600">
                <span>{payment.method}:</span><span>₹{Number(payment.amount || 0).toFixed(2)}</span>
              </div>
            ))}
            {Number(sale.change_returned || 0) > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Change returned:</span><span>₹{Number(sale.change_returned).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Signature */}
        <div className="flex justify-between items-end pt-4 border-t border-gray-200">
          <div className="text-[10px] text-gray-400">Thank you for your business!</div>
          <div className="text-center">
            <div className="text-[10px] text-gray-500">Authorized Signature</div>
            <div className="h-8"></div>
            <div className="w-36 border-t border-gray-400"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
