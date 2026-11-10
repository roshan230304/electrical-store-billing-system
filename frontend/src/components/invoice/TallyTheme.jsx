import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatCurrency, formatDate, numberToWords } from '../../utils/formatters';

export default function TallyTheme({ sale, business, primaryColor = '#1e293b' }) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Generate UPI QR code for instant scan & pay
  useEffect(() => {
    const upiId = sale.upi_id || business?.upi_id;
    const amount = sale.grand_total || sale.balance_due || '0';
    if (!upiId) {
      setQrDataUrl('');
      return;
    }
    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(business?.business_name || 'Electrical Store')}&am=${amount}&cu=INR&tn=Invoice_${sale.invoice_number}`;

    QRCode.toDataURL(upiString, { width: 100, margin: 1 })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR generation error:', err));
  }, [sale, business]);

  const items = sale.items || [];
  const isIntraState = Number(sale.igst_amount || 0) === 0;
  const taxGroups = items.reduce((groups, item) => {
    const rate = Number(String(item.tax_rate || '').replace(/[^0-9.]/g, '')) || 0;
    const key = `${item.hsn_code || '-'}:${rate}`;
    const group = groups.get(key) || { hsn: item.hsn_code || '-', rate, taxable: 0, tax: 0 };
    group.taxable += Number(item.total_amount || 0) - Number(item.tax_amount || 0);
    group.tax += Number(item.tax_amount || 0);
    groups.set(key, group);
    return groups;
  }, new Map());

  return (
    <div className="bg-white text-black p-6 font-sans text-xs border border-gray-300 shadow-sm max-w-[800px] mx-auto leading-normal">
      {/* Top Header: Tax Invoice */}
      <div className="border border-black">
        <div className="text-center font-bold text-sm tracking-wide py-1.5 border-b border-black uppercase bg-gray-50">
          Tax Invoice
        </div>

        {/* Company & Client Details Grid */}
        <div className="grid grid-cols-2 divide-x divide-black border-b border-black">
          {/* Bill To */}
          <div className="p-2.5 space-y-1">
            <div className="font-semibold text-gray-700 uppercase text-[10px]">Bill To:</div>
            <div className="font-bold text-sm">{sale.customer_name || 'Customer'}</div>
            {sale.phone_number && <div>Contact No: {sale.phone_number}</div>}
            {sale.billing_address && <div className="text-[11px] text-gray-700">{sale.billing_address}</div>}
            {sale.party_gstin && <div>GSTIN: {sale.party_gstin}</div>}
          </div>

          {/* Invoice Details & Business Info */}
          <div className="p-2.5 space-y-1">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Invoice No:</span>
              <span className="font-bold text-sm">{sale.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Date:</span>
              <span>{formatDate(sale.invoice_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">State of Supply:</span>
              <span>{sale.state_of_supply || business?.state || 'Karnataka'}</span>
            </div>
            <div className="pt-1 mt-1 border-t border-gray-200">
              <div className="font-bold text-gray-800">{business?.business_name || 'HiTech'}</div>
              <div className="text-[10px] text-gray-600">{business?.business_address}</div>
              {business?.gstin && <div className="text-[10px]">GSTIN: {business.gstin}</div>}
            </div>
          </div>
        </div>

        {/* Items Table with standard Tally bordered cells */}
        <table className="w-full border-collapse border-b border-black text-left">
          <thead>
            <tr className="bg-gray-100 border-b border-black text-[10px] font-bold uppercase">
              <th className="border-r border-black p-1.5 w-8 text-center">#</th>
              <th className="border-r border-black p-1.5">Item Name</th>
              <th className="border-r border-black p-1.5 text-center w-16">HSN/SAC</th>
              <th className="border-r border-black p-1.5 text-right w-12">Qty</th>
              <th className="border-r border-black p-1.5 text-right w-20">Price/Unit (₹)</th>
              <th className="border-r border-black p-1.5 text-right w-20">Discount (₹)</th>
              <th className="border-r border-black p-1.5 text-right w-20">GST (₹)</th>
              <th className="p-1.5 text-right w-24">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((it, idx) => (
              <tr key={idx} className="min-h-[28px]">
                <td className="border-r border-black p-1.5 text-center">{idx + 1}</td>
                <td className="border-r border-black p-1.5 font-medium">{it.item_name}</td>
                <td className="border-r border-black p-1.5 text-center">{it.hsn_code || '-'}</td>
                <td className="border-r border-black p-1.5 text-right">{it.quantity}</td>
                <td className="border-r border-black p-1.5 text-right">{Number(it.price_per_unit).toFixed(2)}</td>
                <td className="border-r border-black p-1.5 text-right">{Number(it.discount_amount || 0).toFixed(2)}</td>
                <td className="border-r border-black p-1.5 text-right">{Number(it.tax_amount || 0).toFixed(2)}</td>
                <td className="p-1.5 text-right font-semibold">{Number(it.total_amount).toFixed(2)}</td>
              </tr>
            ))}
            {/* Empty space filler for realistic height */}
            <tr className="h-16">
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td className="border-r border-black"></td>
              <td></td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t border-black font-bold bg-gray-50">
              <td colSpan={3} className="border-r border-black p-1.5 text-right">Total</td>
              <td className="border-r border-black p-1.5 text-right">{items.reduce((s, i) => s + Number(i.quantity), 0)}</td>
              <td className="border-r border-black p-1.5 text-right"></td>
              <td className="border-r border-black p-1.5 text-right">{Number(sale.discount_total || 0).toFixed(2)}</td>
              <td className="border-r border-black p-1.5 text-right">{Number(sale.tax_total || 0).toFixed(2)}</td>
              <td className="p-1.5 text-right">₹{Number(sale.grand_total).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        {/* GST Tax Summary Box */}
        <div className="grid grid-cols-2 divide-x divide-black border-b border-black">
          {/* Tax Breakdown Table */}
          <div className="p-1.5">
            <div className="font-bold text-[10px] uppercase text-gray-700 mb-1">Tax Summary:</div>
            <table className="w-full text-[10px] border border-gray-300">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="p-1 border-r border-gray-300">HSN/SAC</th>
                  <th className="p-1 border-r border-gray-300 text-right">Taxable (₹)</th>
                  <th className="p-1 border-r border-gray-300 text-center">{isIntraState ? 'CGST' : 'IGST'}</th>
                  {isIntraState && <th className="p-1 border-r border-gray-300 text-center">SGST</th>}
                  <th className="p-1 text-right">Total Tax (₹)</th>
                </tr>
              </thead>
              <tbody>
                {[...taxGroups.values()].map((group, index) => {
                  const halfTax = Math.round((group.tax / 2 + Number.EPSILON) * 100) / 100;
                  return (
                    <tr key={`${group.hsn}-${group.rate}-${index}`}>
                      <td className="p-1 border-r border-gray-300">{group.hsn}</td>
                      <td className="p-1 border-r border-gray-300 text-right">{group.taxable.toFixed(2)}</td>
                      <td className="p-1 border-r border-gray-300 text-center">
                        {isIntraState
                          ? `${(group.rate / 2).toFixed(2)}% (₹${halfTax.toFixed(2)})`
                          : `${group.rate.toFixed(2)}% (₹${group.tax.toFixed(2)})`}
                      </td>
                      {isIntraState && (
                        <td className="p-1 border-r border-gray-300 text-center">
                          {(group.rate / 2).toFixed(2)}% (₹{(group.tax - halfTax).toFixed(2)})
                        </td>
                      )}
                      <td className="p-1 text-right font-semibold">{group.tax.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Bank Details & QR Code section (exactly matching video frame_0960s_059.jpg) */}
            <div className="mt-2 pt-2 border-t border-gray-200 flex items-center space-x-2">
              {qrDataUrl && (
                <div className="text-center flex-shrink-0">
                  <img src={qrDataUrl} alt="UPI QR" className="w-16 h-16 border border-gray-300" />
                  <div className="text-[8px] text-gray-600 font-semibold">Scan to Pay</div>
                </div>
              )}
              <div className="text-[10px] space-y-0.5">
                {sale.bank_name && <div><span className="font-semibold">Bank Name:</span> {sale.bank_name}</div>}
                {sale.account_number && <div><span className="font-semibold">Bank Account No.:</span> {sale.account_number}</div>}
                {sale.ifsc_code && <div><span className="font-semibold">Bank IFSC code:</span> {sale.ifsc_code}</div>}
                {sale.upi_id && <div><span className="font-semibold">UPI ID:</span> {sale.upi_id}</div>}
              </div>
            </div>
          </div>

          {/* Grand Totals & Balance Breakdown */}
          <div className="p-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Sub Total:</span>
              <span>₹{Number(sale.subtotal).toFixed(2)}</span>
            </div>
            {Number(sale.discount_total) > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Discount:</span>
                <span>-₹{Number(sale.discount_total).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Total Tax:</span>
              <span>+₹{Number(sale.tax_total).toFixed(2)}</span>
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
            {Number(sale.round_off) !== 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Round Off:</span>
                <span>{Number(sale.round_off) > 0 ? `+₹${sale.round_off}` : `-₹${Math.abs(sale.round_off)}`}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-300">
              <span>Total:</span>
              <span>₹{Number(sale.grand_total).toFixed(2)}</span>
            </div>

            <div className="text-[10px] text-gray-600 pt-1">
              <span className="font-semibold">Invoice Amount in Words:</span><br />
              <span className="italic">{numberToWords(sale.grand_total)}</span>
            </div>

            <div className="pt-2 border-t border-gray-200 space-y-1">
              <div className="flex justify-between text-green-700 font-medium">
                <span>Received:</span>
                <span>₹{Number(sale.received_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-600 font-bold">
                <span>Balance Due:</span>
                <span>₹{Number(sale.balance_due).toFixed(2)}</span>
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
        </div>

        {/* Footer / Authorized Signatory */}
        <div className="p-3 flex justify-between items-end min-h-[70px]">
          <div className="text-[10px] text-gray-500">
            Terms & Conditions: Goods once sold will not be taken back or exchanged.
          </div>
          <div className="text-center">
            <div className="text-[10px] text-gray-600">For {business?.business_name || 'HiTech'}:</div>
            <div className="h-8"></div>
            <div className="border-t border-black px-4 pt-1 font-semibold text-[10px]">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
