import React from 'react';
import { formatDate } from '../../utils/formatters';

export default function ThermalReceipt({ sale, business }) {
  const items = sale.items || [];

  return (
    <div className="bg-white text-black font-mono text-[11px] p-4 max-w-[320px] mx-auto border border-dashed border-gray-400 shadow-sm leading-tight select-text">
      {/* Receipt Header */}
      <div className="text-center space-y-1 border-b border-dashed border-black pb-2 mb-2">
        <div className="font-bold text-sm tracking-wide uppercase">{business?.business_name || 'Electrical Store'}</div>
        <div className="text-[10px]">{business?.business_address || 'Main Road'}</div>
        <div className="text-[10px]">Ph: {business?.phone_number || ''}</div>
        {business?.gstin && <div className="text-[10px]">GSTIN: {business.gstin}</div>}
      </div>

      {/* Invoice Meta */}
      <div className="border-b border-dashed border-black pb-2 mb-2 text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span>Inv: #{sale.invoice_number}</span>
          <span>{formatDate(sale.invoice_date)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cust: {sale.customer_name}</span>
          <span>{sale.phone_number || ''}</span>
        </div>
        <div>Mode: {sale.payment_type || 'Cash'}</div>
        {sale.state_of_supply && <div>Place of supply: {sale.state_of_supply}</div>}
      </div>

      {/* Items list */}
      <div className="border-b border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between font-bold text-[10px] border-b border-gray-300 pb-1 mb-1">
          <span className="w-1/2">Item</span>
          <span className="w-1/6 text-right">Qty</span>
          <span className="w-1/3 text-right">Amt</span>
        </div>
        {items.map((it, idx) => (
          <div key={idx} className="flex justify-between py-0.5 text-[10px]">
            <span className="w-1/2 truncate">{it.item_name}</span>
            <span className="w-1/6 text-right">{it.quantity} {it.unit || ''}</span>
            <span className="w-1/3 text-right">₹{Number(it.total_amount).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Total summary */}
      <div className="space-y-1 text-xs border-b border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between text-[11px]">
          <span>Subtotal:</span>
          <span>₹{Number(sale.subtotal).toFixed(2)}</span>
        </div>
        {Number(sale.discount_total || sale.discount || 0) > 0 && (
          <div className="flex justify-between text-[11px]">
            <span>Discount:</span>
            <span>-₹{Number(sale.discount_total || sale.discount || 0).toFixed(2)}</span>
          </div>
        )}
        {Number(sale.cgst_amount || 0) > 0 || Number(sale.sgst_amount || 0) > 0 ? (
          <>
            <div className="flex justify-between text-[11px]">
              <span>CGST:</span><span>₹{Number(sale.cgst_amount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>SGST:</span><span>₹{Number(sale.sgst_amount || 0).toFixed(2)}</span>
            </div>
          </>
        ) : Number(sale.igst_amount || 0) > 0 ? (
          <div className="flex justify-between text-[11px]">
            <span>IGST:</span><span>₹{Number(sale.igst_amount || 0).toFixed(2)}</span>
          </div>
        ) : (
          <div className="flex justify-between text-[11px]">
            <span>GST:</span><span>₹{Number(sale.tax_total || sale.gst_amount || 0).toFixed(2)}</span>
          </div>
        )}
        {Number(sale.points_redeemed || 0) > 0 && (
          <div className="flex justify-between text-[11px] font-semibold text-emerald-800">
            <span>Points Redeemed:</span>
            <span>-{Number(sale.points_redeemed)} pts (-₹{Number(sale.redemption_discount || sale.points_redeemed).toFixed(2)})</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm pt-1 border-t border-black">
          <span>TOTAL PAYABLE:</span>
          <span>₹{Number(sale.grand_total).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[11px]">
          <span>Received:</span>
          <span>₹{Number(sale.received_amount || 0).toFixed(2)}</span>
        </div>
        {(sale.payments || []).map((payment, idx) => (
          <div key={`${payment.method}-${idx}`} className="flex justify-between text-[10px]">
            <span>{payment.method}:</span><span>₹{Number(payment.amount || 0).toFixed(2)}</span>
          </div>
        ))}
        {Number(sale.amount_tendered || 0) > Number(sale.received_amount || 0) && (
          <div className="flex justify-between text-[11px]">
            <span>Change returned:</span>
            <span>₹{Number(sale.change_returned || 0).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-[11px] font-bold">
          <span>Balance Due:</span>
          <span>₹{Number(sale.balance_due || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Loyalty Points Section */}
      {(Number(sale.points_earned || 0) > 0 || Number(sale.points_redeemed || 0) > 0 || sale.remaining_points !== undefined) && (
        <div className="border-b border-dashed border-black pb-2 mb-2 text-[10px] space-y-0.5">
          <div className="font-bold text-center tracking-wider text-[9px] uppercase">★ Loyalty Points ★</div>
          {Number(sale.points_redeemed || 0) > 0 && (
            <div className="flex justify-between">
              <span>Points Redeemed:</span>
              <span>{sale.points_redeemed} pts</span>
            </div>
          )}
          {Number(sale.points_earned || 0) > 0 && (
            <div className="flex justify-between font-bold">
              <span>Points Earned (₹100 = 1 pt):</span>
              <span>+{sale.points_earned} pts</span>
            </div>
          )}
          {sale.remaining_points !== undefined && (
            <div className="flex justify-between font-bold">
              <span>Updated Balance:</span>
              <span>{sale.remaining_points} pts</span>
            </div>
          )}
        </div>
      )}

      {/* Thermal Footer */}
      <div className="text-center text-[10px] space-y-0.5 pt-1">
        <div>Thank You For Shopping!</div>
        <div>Visit Again</div>
      </div>
    </div>
  );
}
