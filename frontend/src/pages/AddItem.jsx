import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Settings, X, Camera, Barcode, Sparkles, CheckCircle2 } from 'lucide-react';
import ProductBarcodeModal from '../components/ProductBarcodeModal';

export default function AddItem() {
  const navigate = useNavigate();
  const { id: itemId } = useParams();
  const [itemType, setItemType] = useState('Product'); // 'Product' | 'Service'
  const [activeTab, setActiveTab] = useState('pricing'); // 'pricing' | 'stock'
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [barcodeItem, setBarcodeItem] = useState(null);
  const [navigateAfterBarcode, setNavigateAfterBarcode] = useState(false);
  const [nextCode, setNextCode] = useState('ELEC-000001');

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model_number: '',
    hsn_code: '',
    unit: 'Piece',
    category_id: '',
    sale_price: '',
    sale_price_tax_type: 'With Tax',
    discount_value: '',
    discount_type: 'Percentage',
    purchase_price: '',
    purchase_price_tax_type: 'With Tax',
    tax_rate: 'GST@18%',
    opening_quantity: '',
    at_price: '',
    as_of_date: new Date().toISOString().split('T')[0],
    min_stock_to_maintain: '5',
    location: '',
    description: ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadInitialData = () => {
    api.getCategories().then(res => { if (res.success) setCategories(res.data); }).catch(() => {});
    api.getUnits().then(res => { if (res.success) setUnits(res.data); }).catch(() => {});
    api.getNextProductCode().then(res => {
      if (res?.success && res.next_code) setNextCode(res.next_code);
    }).catch(() => {});
  };

  useEffect(() => {
    loadInitialData();
    if (itemId) {
      api.getItemById(itemId).then(res => {
        if (!res.success || !res.data) {
          setError(res.message || 'Could not load product.');
          return;
        }
        const item = res.data;
        setItemType(item.item_type || 'Product');
        setNextCode(item.product_code || item.item_code || '');
        setFormData(current => ({
          ...current,
          name: item.name || '',
          brand: item.brand || '',
          model_number: item.model_number || '',
          hsn_code: item.hsn_code || '',
          unit: item.unit || 'Piece',
          category_id: item.category_id ? String(item.category_id) : '',
          sale_price: item.sale_price ?? '',
          sale_price_tax_type: item.sale_price_tax_type || 'With Tax',
          discount_value: item.discount_value ?? '',
          discount_type: item.discount_type || 'Percentage',
          purchase_price: item.purchase_price ?? '',
          purchase_price_tax_type: item.purchase_price_tax_type || 'With Tax',
          tax_rate: item.tax_rate || 'GST@0%',
          opening_quantity: item.current_stock ?? '',
          min_stock_to_maintain: item.min_stock_to_maintain ?? '5',
          location: item.location || '',
          description: item.description || ''
        }));
      }).catch(err => setError(`Could not load product: ${err.message}`));
    }
  }, []);

  const handleSave = async (saveAndNew = false) => {
    if (!formData.name.trim()) {
      setError('Product Name is required.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...formData,
        item_type: itemType,
        sale_price: Number(formData.sale_price) || 0,
        purchase_price: Number(formData.purchase_price) || 0,
        discount_value: Number(formData.discount_value) || 0,
        opening_quantity: Number(formData.opening_quantity) || 0,
        at_price: Number(formData.at_price) || 0,
        min_stock_to_maintain: Number(formData.min_stock_to_maintain) || 5
      };

      const res = itemId
        ? await api.updateItem(itemId, payload)
        : await api.createItem(payload);
      if (res.success) {
        if (itemId) {
          setSuccessMsg(`Product "${formData.name}" updated. Product code and barcode were preserved.`);
          setTimeout(() => navigate('/items'), 900);
          return;
        }
        setSuccessMsg(`Product "${formData.name}" saved with code ${res.data.product_code}!`);
        setTimeout(() => setSuccessMsg(''), 4000);
        setBarcodeItem(res.data);
        setNavigateAfterBarcode(!saveAndNew);

        // Refresh upcoming product code
        api.getNextProductCode().then(r => {
          if (r?.success && r.next_code) setNextCode(r.next_code);
        }).catch(() => {});

        if (saveAndNew) {
          setFormData({
            name: '',
            brand: '',
            model_number: '',
            hsn_code: '',
            unit: 'Piece',
            category_id: '',
            sale_price: '',
            sale_price_tax_type: 'With Tax',
            discount_value: '',
            discount_type: 'Percentage',
            purchase_price: '',
            purchase_price_tax_type: 'With Tax',
            tax_rate: 'GST@18%',
            opening_quantity: '',
            at_price: '',
            as_of_date: new Date().toISOString().split('T')[0],
            min_stock_to_maintain: '5',
            location: ''
          });
        }
      } else {
        setError(res.message || 'Failed to save product.');
      }
    } catch (err) {
      setError('Server connection error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-65px)]">
      {/* Header */}
      <div className="p-3 px-5 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-sm font-bold text-gray-800">{itemId ? 'Edit Electrical Product' : 'Add Electrical Product'}</h1>

          {/* Product / Service Switcher */}
          <div className="flex items-center space-x-2 text-xs">
            <span className={itemType === 'Product' ? 'font-bold text-blue-600' : 'text-gray-500'}>Product</span>
            <button
              type="button"
              onClick={() => setItemType(itemType === 'Product' ? 'Service' : 'Product')}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition ${
                itemType === 'Service' ? 'bg-blue-600 justify-end' : 'bg-blue-500 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md"></div>
            </button>
            <span className={itemType === 'Service' ? 'font-bold text-blue-600' : 'text-gray-500'}>Service</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-gray-400">
          <button className="hover:text-gray-600 p-1"><Settings className="w-4 h-4" /></button>
          <button onClick={() => navigate('/items')} className="hover:text-gray-600 p-1"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-xs px-5 py-2 border-b border-red-200">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 text-xs px-5 py-2 border-b border-emerald-200 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Form Fields */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">

        {/* Automatic Code and Barcode Notice Banner */}
        {!itemId && (
        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Barcode className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <span>Automatic Barcode & Product Code Engine</span>
                <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">MySQL Active</span>
              </div>
              <div className="text-[11px] text-emerald-800">
                A unique sequential Code 128 barcode is automatically generated and saved permanently in MySQL.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-white border border-emerald-300 rounded px-2.5 py-1 text-right">
              <span className="block text-[9px] uppercase font-bold text-gray-400">Generated Code</span>
              <span className="font-mono font-bold text-xs text-emerald-800">{nextCode}</span>
            </div>
            <div className="bg-white border border-emerald-300 rounded px-2.5 py-1 text-right">
              <span className="block text-[9px] uppercase font-bold text-gray-400">Barcode Value</span>
              <span className="font-mono font-bold text-xs text-emerald-800">{nextCode}</span>
            </div>
          </div>
        </div>
        )}

        {/* Product Basic Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Havells LED Bulb 12W"
              className="w-full px-2.5 py-1.5 border border-blue-500 rounded outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">Brand</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="e.g. Havells / Anchor"
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">Model Number</label>
            <input
              type="text"
              value={formData.model_number}
              onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
              placeholder="e.g. 12W-B22 / MOD-01"
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">Unit</label>
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 font-semibold rounded outline-none cursor-pointer"
            >
              {units.map(unit => (
                <option key={unit.short_name} value={unit.short_name}>{unit.full_name}</option>
              ))}
              <option value="Piece">Piece</option>
              <option value="Metre">Metre</option>
              <option value="Roll">Roll</option>
              <option value="Box">Box</option>
              <option value="Bundle">Bundle</option>
              <option value="Coil">Coil</option>
              <option value="Set">Set</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-700 mb-1">Product Description</label>
          <textarea
            rows="2"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
          />
        </div>

        {/* Category, HSN, and Generated Identifiers */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">Category</label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded bg-white outline-none"
            >
              <option value="">Select Category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">HSN Code</label>
            <input
              type="text"
              value={formData.hsn_code}
              onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
              placeholder="e.g. 8536 / 9405"
              className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              {itemId ? 'Product Code' : 'Automatically Generated Product Code'}
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={nextCode}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded bg-gray-100 font-mono font-bold text-gray-700 cursor-not-allowed"
              />
              <span className="absolute right-2 top-2 text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">
                AUTO
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              {itemId ? 'Barcode' : 'Automatically Generated Barcode'}
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={nextCode}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded bg-gray-100 font-mono font-bold text-gray-700 cursor-not-allowed"
              />
              <span className="absolute right-2 top-2 text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">
                MATCHES
              </span>
            </div>
          </div>
        </div>

        {/* Tabs: Pricing & Stock */}
        <div className="border-b border-gray-200 flex space-x-8 text-xs font-semibold pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`pb-2 border-b-2 transition ${
              activeTab === 'pricing' ? 'border-[#e01a4f] text-[#e01a4f]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pricing & Taxes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`pb-2 border-b-2 transition ${
              activeTab === 'stock' ? 'border-[#e01a4f] text-[#e01a4f]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Stock & Inventory Limits
          </button>
        </div>

        {/* Tab 1: Pricing */}
        {activeTab === 'pricing' && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Selling Price Card */}
              <div className="bg-gray-50/70 border border-gray-200 rounded p-4 space-y-3">
                <div className="font-semibold text-gray-800 text-xs">Selling Price (POS Billed)</div>
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <label className="block text-[11px] text-gray-600 mb-1">Selling Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.sale_price}
                      onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                      placeholder="e.g. 120"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none font-semibold text-gray-800"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-[11px] text-gray-600 mb-1">Tax Inclusion</label>
                    <select
                      value={formData.sale_price_tax_type}
                      onChange={(e) => setFormData({ ...formData, sale_price_tax_type: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded bg-white outline-none"
                    >
                      <option value="With Tax">With Tax</option>
                      <option value="Without Tax">Without Tax</option>
                    </select>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <div className="flex-1">
                    <label className="block text-[11px] text-gray-600 mb-1">Discount On Selling Price</label>
                    <input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-[11px] text-gray-600 mb-1">Type</label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded bg-white outline-none"
                    >
                      <option value="Percentage">Percentage (%)</option>
                      <option value="Amount">Amount (₹)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Purchase Price & GST Rate */}
              <div className="bg-gray-50/70 border border-gray-200 rounded p-4 space-y-3">
                <div className="font-semibold text-gray-800 text-xs">Purchase Price & GST Rate</div>
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <label className="block text-[11px] text-gray-600 mb-1">Purchase Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                      placeholder="e.g. 80"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none font-semibold text-gray-800"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-[11px] text-gray-600 mb-1">Tax Inclusion</label>
                    <select
                      value={formData.purchase_price_tax_type}
                      onChange={(e) => setFormData({ ...formData, purchase_price_tax_type: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded bg-white outline-none"
                    >
                      <option value="With Tax">With Tax</option>
                      <option value="Without Tax">Without Tax</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-600 mb-1">GST Rate</label>
                  <select
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-blue-500 rounded bg-white outline-none font-semibold text-gray-800"
                  >
                    <option value="None">None (0%)</option>
                    <option value="GST@0%">GST@0%</option>
                    <option value="GST@5%">GST@5% (Wires / Cables / Bulbs)</option>
                    <option value="GST@12%">GST@12% (Electrical Equipment)</option>
                    <option value="GST@18%">GST@18% (Switches / Sockets / Fittings)</option>
                    <option value="GST@28%">GST@28% (Special Electrical Goods)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Stock */}
        {activeTab === 'stock' && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">{itemId ? 'Available Stock' : 'Stock Quantity (Opening Quantity)'}</label>
                <input
                  type="number"
                  step="any"
                  value={formData.opening_quantity}
                  readOnly={Boolean(itemId)}
                  onChange={(e) => setFormData({ ...formData, opening_quantity: e.target.value })}
                  placeholder="e.g. 100"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none font-semibold text-emerald-800"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-600 mb-1">At Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.at_price}
                  onChange={(e) => setFormData({ ...formData, at_price: e.target.value })}
                  placeholder="₹ 80"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-600 mb-1">As Of Date</label>
                <input
                  type="date"
                  value={formData.as_of_date}
                  onChange={(e) => setFormData({ ...formData, as_of_date: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Low Stock Limit (Min Stock To Maintain)</label>
                <input
                  type="number"
                  value={formData.min_stock_to_maintain}
                  onChange={(e) => setFormData({ ...formData, min_stock_to_maintain: e.target.value })}
                  placeholder="5"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none font-semibold text-amber-700"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">POS will display low-stock warning when inventory reaches this level.</span>
              </div>

              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Storage Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Rack E-3, Shelf 2"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3.5 px-5 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSave(true)}
          className="px-4 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded text-xs font-semibold transition"
        >
          Save & New
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSave(false)}
          className="px-6 py-1.5 bg-[#1976d2] hover:bg-[#1565c0] text-white rounded text-xs font-semibold transition shadow-sm"
        >
          {saving ? 'Saving...' : itemId ? 'Update Product' : 'Save Product'}
        </button>
      </div>
    </div>

    {/* Barcode View, Print, Download Modal */}
    {barcodeItem && (
      <ProductBarcodeModal
        product={barcodeItem}
        onClose={() => {
          setBarcodeItem(null);
          if (navigateAfterBarcode) navigate('/items');
        }}
      />
    )}
    </>
  );
}
