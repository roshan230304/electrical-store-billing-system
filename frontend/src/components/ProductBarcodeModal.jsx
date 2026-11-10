import React, { useEffect, useState } from 'react';
import { Barcode, Check, Copy, Download, Printer, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const labelSizes = [
  { name: '50 × 30 mm', width: 50, height: 30 },
  { name: '50 × 25 mm', width: 50, height: 25 },
  { name: '40 × 20 mm', width: 40, height: 20 }
];

export default function ProductBarcodeModal({ product, onClose }) {
  const { business } = useAuth();
  const [size, setSize] = useState(labelSizes[0]);
  const [barcodeUrl, setBarcodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const barcodeHeight = Math.max(6, size.height - (product.brand ? 14 : 12));

  useEffect(() => {
    let objectUrl;
    let cancelled = false;

    api.getBarcodeSvg(product.id)
      .then(svg => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        setBarcodeUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError('Barcode image could not be generated. Please try again.');
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [product.id]);

  const copyProductCode = async () => {
    try {
      await navigator.clipboard.writeText(product.product_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (copyError) {
      setError('Could not copy the product code. Copy it directly from the label.');
    }
  };

  const downloadBarcode = () => {
    if (!barcodeUrl) return;
    const link = document.createElement('a');
    link.href = barcodeUrl;
    link.download = `${product.product_code}.svg`;
    link.click();
  };

  const printLabel = () => {
    document.body.classList.add('printing-product-barcode');
    const cleanUp = () => document.body.classList.remove('printing-product-barcode');
    window.addEventListener('afterprint', cleanUp, { once: true });
    window.print();
    window.setTimeout(cleanUp, 1000);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <style>{`
        @media print {
          body.printing-product-barcode * { visibility: hidden !important; }
          body.printing-product-barcode .barcode-print-area,
          body.printing-product-barcode .barcode-print-area * { visibility: visible !important; }
          body.printing-product-barcode .barcode-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          @page { margin: 0; size: auto; }
        }
      `}</style>
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Barcode className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-gray-800">Product barcode label</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close barcode label">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-gray-600">Thermal label size</label>
              <select
                value={size.name}
                onChange={event => setSize(labelSizes.find(option => option.name === event.target.value))}
                className="rounded border border-gray-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500"
              >
                {labelSizes.map(option => <option key={option.name}>{option.name}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={copyProductCode} className="inline-flex items-center gap-1 rounded border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy code'}
              </button>
              <button onClick={downloadBarcode} disabled={!barcodeUrl} className="inline-flex items-center gap-1 rounded border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                <Download className="h-3.5 w-3.5" /> Download
              </button>
              <button onClick={printLabel} disabled={!barcodeUrl} className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
            </div>
          </div>

          {error && <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          <div
            className="barcode-print-area mx-auto flex flex-col items-center justify-center overflow-hidden border border-dashed border-gray-300 bg-white px-2 text-center"
            style={{ width: `${size.width}mm`, height: `${size.height}mm`, boxSizing: 'border-box' }}
          >
            <div className="w-full truncate text-[8px] font-bold uppercase tracking-wide text-gray-500">
              {business?.store_name || business?.business_name || 'Electrical Store'}
            </div>
            <div className="mt-0.5 w-full truncate text-[10px] font-bold leading-tight text-gray-900">{product.name}</div>
            {product.brand && <div className="w-full truncate text-[8px] text-gray-600">{product.brand}</div>}
            <div className="flex w-full items-center justify-center" style={{ height: `${barcodeHeight}mm` }}>
              {barcodeUrl
                ? <img src={barcodeUrl} alt={`Code 128 barcode ${product.product_code}`} className="max-h-full max-w-full" />
                : <span className="text-[9px] text-gray-400">Preparing barcode…</span>}
            </div>
            <div className="font-mono text-[8px] font-semibold tracking-wider text-gray-900">{product.product_code}</div>
            <div className="mt-0.5 text-[9px] font-bold text-gray-800">₹ {Number(product.sale_price || 0).toFixed(2)}</div>
          </div>

          <p className="text-[11px] text-gray-500">
            The Code 128 barcode encodes the exact product code saved in the database.
          </p>
        </div>
      </div>
    </div>
  );
}
