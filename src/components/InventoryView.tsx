/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Filter, 
  X, 
  AlertTriangle, 
  IndianRupee,
  Download
} from 'lucide-react';
import { Product } from '../types.js';
import { formatINR } from '../utils.js';
import { useConfirm } from '../context/ConfirmationContext.js';

interface InventoryViewProps {
  token: string;
}

export default function InventoryView({ token }: InventoryViewProps) {
  const confirm = useConfirm();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [gstPercent, setGstPercent] = useState('18');
  const [stockQuantity, setStockQuantity] = useState('');
  const [unit, setUnit] = useState('pcs');

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Could not pull products list');
      const data = await response.json();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred while loading products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token]);

  // Categories list computed from products
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const handleOpenAdd = () => {
    setIsEdit(false);
    setCurrentId('');
    setName('');
    // Auto-generate helper SKU
    setSku(`SKU-${Math.random().toString(36).substr(2, 4).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`);
    setCategory('Grocery');
    setPurchasePrice('');
    setSellingPrice('');
    setGstPercent('18');
    setStockQuantity('');
    setUnit('pcs');
    setShowModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setIsEdit(true);
    setCurrentId(p.id);
    setName(p.name);
    setSku(p.sku);
    setCategory(p.category);
    setPurchasePrice(p.purchasePrice.toString());
    setSellingPrice(p.sellingPrice.toString());
    setGstPercent(p.gstPercent.toString());
    setStockQuantity(p.stockQuantity.toString());
    setUnit(p.unit);
    setShowModal(true);
  };

  const handleDelete = async (id: string, prodName: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${prodName}" from inventory?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!isConfirmed) return;
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove from inventory.');
      }
      setProducts(products.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error deleting product');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim() || !unit) {
      alert('Product name, SKU & units are mandatory.');
      return;
    }

    const priceP = Number(purchasePrice);
    const priceS = Number(sellingPrice);
    const gstP = Number(gstPercent);
    const qty = Number(stockQuantity);

    if (isNaN(priceP) || priceP < 0 || isNaN(priceS) || priceS < 0) {
      alert('Please input positive numeric prices.');
      return;
    }
    if (isNaN(qty) || qty < 0) {
      alert('Stock quantities cannot be negative.');
      return;
    }

    setSaveLoading(true);
    const payload = {
      name,
      sku,
      category,
      purchasePrice: priceP,
      sellingPrice: priceS,
      gstPercent: gstP,
      stockQuantity: qty,
      unit
    };

    const endpoint = isEdit ? `/api/products/${currentId}` : '/api/products';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      if (isEdit) {
        setProducts(products.map(p => p.id === currentId ? data : p));
      } else {
        setProducts([...products, data]);
      }
      setShowModal(false);
    } catch (err: any) {
      alert(err.message || 'Error occurred saving product');
    } finally {
      setSaveLoading(false);
    }
  };

  // Export to CSV helper
  const handleExportCSV = () => {
    if (products.length === 0) return;
    const headers = ['Product Name', 'SKU', 'Category', 'Purchase Price (INR)', 'Selling Price (INR)', 'GST (%)', 'Stock Quantity', 'Unit', 'Created Date'];
    const rows = products.map(p => [
      p.name,
      p.sku,
      p.category,
      p.purchasePrice,
      p.sellingPrice,
      p.gstPercent,
      p.stockQuantity,
      p.unit,
      p.createdAt
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Inventory_Master_ERP.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter computation
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 overflow-y-auto max-h-screen">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Inventory Catalog</h2>
          <p className="text-xs text-slate-500">Add products, configure pricing matrix, update stock quantities</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-bold text-slate-600 shadow-sm cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-bold shadow-lg shadow-indigo-100 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add New Product
          </button>
        </div>
      </div>

      {/* Searched Panel and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        {/* Search Input */}
        <div className="md:col-span-2 relative">
          <Search className="absolute inset-y-0 left-0 pl-3 flex items-center h-5 w-5 text-slate-400 m-auto" />
          <input
            type="text"
            className="pl-10 w-full rounded-xl border border-slate-200 outline-none p-2 text-xs focus:border-indigo-500"
            placeholder="Search by Product name, SKU identifier, or Category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Category Selection Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-xl border border-slate-200 outline-none p-2 text-xs bg-white"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Quick Diagnostics */}
        <div className="flex items-center justify-end text-xs font-semibold text-slate-500 bg-slate-50 rounded-lg px-3 py-1 text-center md:col-start-4">
          Matched: {filteredProducts.length} of {products.length} Items
        </div>
      </div>

      {/* Inventory table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 space-y-4">
            <div className="h-6 w-full bg-slate-100 animate-pulse rounded" />
            <div className="h-6 w-full bg-slate-100 animate-pulse rounded" />
            <div className="h-6 w-full bg-slate-100 animate-pulse rounded" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 bg-red-50 font-medium text-xs">{error}</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <Package className="h-12 w-12 mx-auto text-slate-300" />
            <p className="font-bold text-slate-600">No items found matching the filter</p>
            <p className="text-xs text-slate-400">Add a product or verify search queries</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  <th className="py-3.5 pl-6">Product Details</th>
                  <th className="py-3.5">SKU Code</th>
                  <th className="py-3.5">Category</th>
                  <th className="py-3.5 text-right">Purchase Price</th>
                  <th className="py-3.5 text-right">Selling Price</th>
                  <th className="py-3.5 text-center">GST Tax</th>
                  <th className="py-3.5 text-center">Stock Levels</th>
                  <th className="py-3.5 pr-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-sans">
                {filteredProducts.map(p => {
                  const isLow = p.stockQuantity < 10;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/40 transition-colors text-xs text-slate-600">
                      <td className="py-4 pl-6 font-bold text-slate-900">{p.name}</td>
                      <td className="py-4 font-mono font-semibold text-slate-500">{p.sku}</td>
                      <td className="py-4">
                        <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-4 text-right font-medium">{formatINR(p.purchasePrice)}</td>
                      <td className="py-4 text-right font-bold text-slate-900">{formatINR(p.sellingPrice)}</td>
                      <td className="py-4 text-center font-bold text-slate-700">{p.gstPercent}%</td>
                      <td className="py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            isLow 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                              : 'bg-indigo-50 text-indigo-700'
                          }`}>
                            {p.stockQuantity} {p.unit}
                          </span>
                          {isLow && (
                            <span className="text-[9px] text-amber-600 font-bold tracking-tight inline-flex items-center gap-0.5">
                              <AlertTriangle className="h-2.5 w-2.5 shrink-0" /> Low Stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 pr-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1 px-2 border border-slate-200 rounded-lg hover:bg-white hover:border-slate-300 text-slate-600 transition-colors cursor-pointer"
                            title="Edit details"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1 px-2 border border-red-100 rounded-lg hover:bg-red-50 text-red-500 transition-colors cursor-pointer"
                            title="Delete Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Product Multi-purpose Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-100">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {isEdit ? 'Update Inventory Item' : 'New Catalog Product'}
                </h3>
                <p className="text-[10px] text-slate-500">Configure item descriptions, purchase cost, and taxation indexes</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 font-sans text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Salt Premium 1kg"
                  className="w-full rounded-xl border border-slate-200 outline-none p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">SKU Identifier *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SKU-TTS-001"
                    className="w-full rounded-xl border border-slate-200 outline-none p-2.5 font-mono focus:border-indigo-500 text-xs"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Unit of Measure *</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 outline-none p-2.5 bg-white text-xs"
                  >
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="kg">kg (Kilograms)</option>
                    <option value="box">box (Boxes)</option>
                    <option value="ltr">ltr (Liters)</option>
                    <option value="pkt">pkt (Packets)</option>
                    <option value="bag">bag (Bags)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 col-span-2">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Product Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Groceries"
                    className="w-full rounded-xl border border-slate-200 outline-none p-2.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50"
                    disabled={isEdit} // Block stock editing of existing product to force Sale/Purchase operations audit trail.
                    className="w-full rounded-xl border border-slate-200 outline-none p-2.5 disabled:bg-slate-100 text-xs"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                  />
                  {isEdit && <span className="text-[9px] text-slate-400 font-medium">Restricted. Use purchases or sales panels to change stock levels.</span>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Cost Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="20"
                    className="w-full rounded-xl border border-slate-200 outline-none p-2.5 text-xs focus:border-indigo-500"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="25"
                    className="w-full rounded-xl border border-slate-200 outline-none p-2.5 text-xs focus:border-indigo-500"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">GST Rate (%) *</label>
                  <select
                    value={gstPercent}
                    onChange={(e) => setGstPercent(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 outline-none p-2.5 bg-white text-xs"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold disabled:opacity-55 cursor-pointer"
                >
                  {saveLoading ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
