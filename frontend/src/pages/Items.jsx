import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Search, Plus, Filter, Package, AlertTriangle, ArrowUpDown, Trash2, Edit, Barcode } from 'lucide-react';
import ProductBarcodeModal from '../components/ProductBarcodeModal';

export default function Items() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [barcodeProduct, setBarcodeProduct] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadItems();
  }, [categoryFilter, search]);

  const loadCategories = async () => {
    const res = await api.getCategories();
    if (res.success) setCategories(res.data);
  };

  const loadItems = async () => {
    try {
      const res = await api.getItems(search, categoryFilter, 'Product');
      if (res.success) setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      const res = await api.deleteItem(id);
      if (res.success) loadItems();
    }
  };

  return (
    <>
    <div className="space-y-3">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-800">Electrical Products & Inventory</h1>
          <p className="text-[11px] text-gray-500">Manage products, automatic Code 128 barcodes, prices, and stock limits</p>
        </div>

        <button
          onClick={() => navigate('/items/add')}
          className="bg-[#1976d2] hover:bg-[#1565c0] text-white px-3.5 py-1.5 rounded text-xs font-semibold flex items-center shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
          Add Product
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg p-3 border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Product Name, Code, Barcode, or Brand..."
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded outline-none text-xs focus:border-blue-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-200 rounded px-2.5 py-1.5 bg-gray-50 outline-none text-xs"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2 text-gray-500 text-[11px]">
          <label className="flex items-center gap-1.5 text-gray-600">
            <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
            Low stock only
          </label>
          <span>Total Products: <b className="text-gray-800">{items.length}</b></span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-500 border-b border-gray-200">
            <tr>
              <th className="p-2.5 w-10 text-center">#</th>
              <th className="p-2.5">Product Name & Brand</th>
              <th className="p-2.5">Product Code / Barcode</th>
              <th className="p-2.5">Category</th>
              <th className="p-2.5 text-right">Selling Price</th>
              <th className="p-2.5 text-right">Purchase Price</th>
              <th className="p-2.5 text-right">Stock</th>
              <th className="p-2.5 text-center">GST Rate</th>
              <th className="p-2.5 text-center w-28">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(lowStockOnly ? items.filter(it => Number(it.current_stock) <= Number(it.min_stock_to_maintain)) : items).length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-400 text-xs">
                  No products found. Click "+ Add Product" to register your first electrical item.
                </td>
              </tr>
            ) : (
              (lowStockOnly ? items.filter(it => Number(it.current_stock) <= Number(it.min_stock_to_maintain)) : items).map((it, idx) => {
                const isLowStock = Number(it.current_stock) <= Number(it.min_stock_to_maintain);
                return (
                  <tr key={it.id} className="hover:bg-gray-50 transition">
                    <td className="p-2.5 text-center text-gray-400">{idx + 1}</td>
                    <td className="p-2.5 font-bold text-gray-800">
                      <div>{it.name}</div>
                      <div className="text-[10px] text-gray-400 font-normal">
                        {it.brand ? <span className="text-gray-600 font-semibold">{it.brand}</span> : null}
                        {it.model_number ? <span className="ml-1 text-gray-400">({it.model_number})</span> : null}
                        {it.location ? <span className="ml-1 text-gray-400">• Loc: {it.location}</span> : null}
                      </div>
                      {it.description && (
                        <div className="mt-0.5 max-w-xs truncate text-[10px] font-normal text-gray-500" title={it.description}>
                          {it.description}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-gray-700 text-[11px]">
                      <div className="font-semibold text-blue-700">{it.product_code || it.item_code}</div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Barcode className="w-3 h-3 text-gray-400" />
                        <span>{it.barcode || it.product_code}</span>
                      </div>
                    </td>
                    <td className="p-2.5 text-gray-600">{it.category_name || '-'}</td>
                    <td className="p-2.5 text-right font-semibold text-gray-900">
                      ₹ {Number(it.sale_price).toFixed(2)}
                      <span className="text-[10px] text-gray-400 ml-1 block font-normal">{it.sale_price_tax_type}</span>
                    </td>
                    <td className="p-2.5 text-right text-gray-600">
                      ₹ {Number(it.purchase_price).toFixed(2)}
                    </td>
                    <td className="p-2.5 text-right font-bold">
                      <div className="flex items-center justify-end space-x-1">
                        {isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" title="Low Stock Warning" />}
                        <span className={Number(it.current_stock) <= 0 ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-emerald-700'}>
                          {it.current_stock} {it.unit !== 'NONE' ? it.unit : ''}
                        </span>
                      </div>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                        {it.tax_rate}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center space-x-1 text-gray-400">
                        <button
                          onClick={() => navigate(`/items/${it.id}`)}
                          className="hover:text-blue-600 p-1.5 rounded hover:bg-blue-50 transition"
                          title="Edit Product"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setBarcodeProduct(it)}
                          className="hover:text-blue-600 p-1.5 rounded text-blue-600 hover:bg-blue-50 transition"
                          title="View, Print & Download Barcode (Code 128)"
                        >
                          <Barcode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(it.id, it.name)}
                          className="hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Barcode View, Print & Download Modal */}
    {barcodeProduct && (
      <ProductBarcodeModal
        product={barcodeProduct}
        onClose={() => setBarcodeProduct(null)}
      />
    )}
    </>
  );
}
