/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useId } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Trash2, 
  X, 
  Calendar, 
  FileText, 
  User, 
  AlertCircle,
  Eye,
  Trash
} from 'lucide-react';
import { Purchase, Supplier, Product } from '../types.js';
import { formatINR, formatDate } from '../utils.js';
import { useConfirm } from '../context/ConfirmationContext.js';

interface PurchasesViewProps {
  token: string;
}

interface SelectedItem {
  productId: string;
  quantity: number;
  rate: number;
}

export default function PurchasesView({ token }: PurchasesViewProps) {
  const selectSupplierId = useId();
  const selectProductId = useId();
  const confirm = useConfirm();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [items, setItems] = useState<SelectedItem[]>([]);

  // Item selector helpers
  const [currentProductId, setCurrentProductId] = useState('');
  const [currentQty, setCurrentQty] = useState('');
  const [currentRate, setCurrentRate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [purRes, supRes, prodRes] = await Promise.all([
        fetch('/api/purchases', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/suppliers', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!purRes.ok || !supRes.ok || !prodRes.ok) {
        throw new Error('Failed to load dependent operational data');
      }

      const [purData, supData, prodData] = await Promise.all([
        purRes.json(),
        supRes.json(),
        prodRes.json()
      ]);

      setPurchases(purData);
      setSuppliers(supData);
      setProducts(prodData);
    } catch (err: any) {
      setError(err.message || 'Error pulling core indices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleOpenAdd = () => {
    if (suppliers.length === 0) {
      alert('Please add a supplier partner first prior to logging stock purchases.');
      return;
    }
    if (products.length === 0) {
      alert('Please add a product catalog entry first prior to managing stock purchases.');
      return;
    }

    setSupplierId(suppliers[0].id);
    setDate(new Date().toISOString().split('T')[0]);
    setInvoiceNo(`PUR-${Math.floor(1000 + Math.random() * 9000)}`);
    setItems([]);
    setCurrentProductId(products[0].id);
    // Suggest product's actual purchase price
    setCurrentRate(products[0].purchasePrice.toString());
    setCurrentQty('10');
    setShowAddModal(true);
  };

  const handleProductSelectChange = (id: string) => {
    setCurrentProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setCurrentRate(prod.purchasePrice.toString());
    }
  };

  const handleAddItem = () => {
    if (!currentProductId) return;
    const qtyNum = parseInt(currentQty, 10);
    const rateNum = parseFloat(currentRate);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert('Please enter a valid stock quantity.');
      return;
    }
    if (isNaN(rateNum) || rateNum <= 0) {
      alert('Please enter a valid cost price.');
      return;
    }

    // Check if duplicate product
    if (items.some(item => item.productId === currentProductId)) {
      alert('Product already added to item list. Adjust quantity inside table list instead.');
      return;
    }

    setItems([...items, { productId: currentProductId, quantity: qtyNum, rate: rateNum }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleOpenDetail = (p: Purchase) => {
    setSelectedPurchase(p);
    setShowDetailModal(true);
  };

  const handleDeletePurchase = async (id: string, invNo: string) => {
    const isConfirmed = await confirm({
      title: 'Rollback Purchase Invoice',
      message: `Warning: Canceling purchase ${invNo} will ROLLBACK stock quantities (reduce product stock by quantity purchased). Proceed?`,
      confirmText: 'Rollback & Decrease stock',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`/api/purchases/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Rolling back stock purchase failed.');
      
      setPurchases(purchases.filter(p => p.id !== id));
      alert('Purchase entry canceled and stock levels decreased back successfully.');
    } catch (err: any) {
      alert(err.message || 'Error rolling back purchase');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Stock purchases requires at least one product batch line item.');
      return;
    }

    setSaveLoading(true);
    const payload = {
      supplierId,
      date,
      invoiceNo,
      items
    };

    try {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed saving stock purchase');

      // Update Local State lists
      setPurchases([data, ...purchases]);
      setShowAddModal(false);
      alert('Products purchased successfully! Stock levels auto-increased.');
    } catch (err: any) {
      alert(err.message || 'Error saving purchase entry');
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(p => 
    p.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6 overflow-y-auto max-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Stock Acquisitions</h2>
          <p className="text-xs text-slate-500">Record inventory intake from wholesalers. Stock quantities automatically increase on receipt</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-bold shadow-lg shadow-indigo-100 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Log Batch Acquisition
        </button>
      </div>

      {/* Searched filter */}
      <div className="relative max-w-md bg-white rounded-xl border border-slate-100 shadow-sm p-2 flex items-center">
        <Search className="absolute left-4 h-4 w-4 text-slate-400 m-auto" />
        <input
          type="text"
          placeholder="Search acquisitions by supplier name or bill reference..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 w-full outline-none text-xs text-slate-600 font-medium py-1"
        />
      </div>

      {/* Main acquisitions table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 space-y-4">
            <div className="h-6 w-full bg-slate-100 animate-pulse rounded" />
            <div className="h-6 w-full bg-slate-100 animate-pulse rounded" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 bg-red-50 text-xs font-medium">{error}</div>
        ) : filteredPurchases.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <ShoppingCart className="h-12 w-12 mx-auto text-slate-300" />
            <p className="font-bold text-slate-600">No acquisition logs available.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  <th className="py-3.5 pl-6">Purchase Code</th>
                  <th className="py-3.5">Supplier Name</th>
                  <th className="py-3.5">Acquisition Date</th>
                  <th className="py-3.5 text-center">Batch Items</th>
                  <th className="py-3.5 text-right font-bold pr-12">Turnover Amount</th>
                  <th className="py-3.5 pr-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredPurchases.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/40 transition-colors text-xs text-slate-600">
                    <td className="py-4 pl-6 font-mono font-bold text-slate-900">{p.invoiceNo}</td>
                    <td className="py-4 font-bold text-slate-800">{p.supplierName}</td>
                    <td className="py-4">{formatDate(p.date)}</td>
                    <td className="py-4 text-center">
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-lg">
                        {p.items.length} Batch products
                      </span>
                    </td>
                    <td className="py-4 text-right font-black text-slate-900 pr-12">{formatINR(p.totalAmount)}</td>
                    <td className="py-4 pr-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenDetail(p)}
                          className="flex items-center gap-1 p-1 px-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold hover:text-slate-800 text-[10px] transition-colors cursor-pointer"
                        >
                          <Eye className="h-3 w-3" /> View Detail
                        </button>
                        <button
                          onClick={() => handleDeletePurchase(p.id, p.invoiceNo)}
                          className="p-1 px-1.5 border border-red-50 text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Rollback purchase"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Purchase entry slide/modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Record Stock Intake</h3>
                <p className="text-[10px] text-slate-500">Log wholesale consignments. This increases total quantities available</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs font-sans">
              
              {/* Form details top row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label htmlFor={selectSupplierId} className="block font-bold text-slate-700">Counter-Wholesaler *</label>
                  <select
                    id={selectSupplierId}
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 outline-none p-2 bg-white"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (GST: {s.gstNo})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Acquisition Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 outline-none p-2"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Bill Invoice Ref *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WH-4029"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 outline-none p-2 font-mono"
                  />
                </div>
              </div>

              {/* Dynamic Item Add Sub-section */}
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3">
                <h4 className="font-extrabold text-[11px] text-slate-900 uppercase tracking-widest">Select Consignment Item</h4>
                
                <div className="grid grid-cols-4 gap-3 items-end">
                  <div className="col-span-2 space-y-1">
                    <label htmlFor={selectProductId} className="block font-bold text-slate-600">Product</label>
                    <select
                      id={selectProductId}
                      value={currentProductId}
                      onChange={(e) => handleProductSelectChange(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 outline-none p-1.5 bg-white"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Stock: {p.stockQuantity} {p.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-600">Buy Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Rate"
                      value={currentRate}
                      onChange={(e) => setCurrentRate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 outline-none p-1.5"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-600">Qty purchased</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Quantity"
                        value={currentQty}
                        onChange={(e) => setCurrentQty(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 outline-none p-1.5"
                      />
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg font-bold shrink-0 shadow cursor-pointer"
                        title="Add Item Batch"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List Table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-inner max-h-48 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 pl-4">Product Name</th>
                      <th className="py-2.5 text-right">Cost Price (₹)</th>
                      <th className="py-2.5 text-center">Acquired Weight/Qty</th>
                      <th className="py-2.5 text-right">Subtotal</th>
                      <th className="py-2.5 pr-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                          Consignment list currently empty. Include a product batch above.
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => {
                        const pName = products.find(p => p.id === it.productId)?.name || 'Unknown item';
                        const pUnit = products.find(p => p.id === it.productId)?.unit || 'pcs';
                        return (
                          <tr key={idx} className="text-xs text-slate-600 leading-normal">
                            <td className="py-2.5 pl-4 font-bold text-slate-850">{pName}</td>
                            <td className="py-2.5 text-right">{formatINR(it.rate)}</td>
                            <td className="py-2.5 text-center font-bold text-slate-900">{it.quantity} {pUnit}</td>
                            <td className="py-2.5 text-right font-bold">{formatINR(it.rate * it.quantity)}</td>
                            <td className="py-2.5 pr-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bottom calculations */}
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-700">Consignment Gross Total:</span>
                <span className="text-base font-black text-slate-900">
                  {formatINR(items.reduce((acc, current) => acc + (current.rate * current.quantity), 0))}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-55 cursor-pointer"
                >
                  {saveLoading ? 'Saving...' : 'Saves Consignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details modal view */}
      {showDetailModal && selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Purchase Reference Detail</h3>
                <p className="text-[10px] text-slate-500">Invoice: {selectedPurchase.invoiceNo}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Wholesaler Company</span>
                  <p className="font-bold text-slate-800 text-xs">{selectedPurchase.supplierName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Acquisition Date</span>
                  <p className="font-bold text-slate-800 text-xs">{formatDate(selectedPurchase.date)}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Itemized Batches Received</h4>
                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/70 text-[10px] text-slate-400 uppercase tracking-widest font-extrabold border-b border-slate-100">
                      <tr>
                        <th className="py-2 pl-4">Product</th>
                        <th className="py-2 text-right">Cost Price (₹)</th>
                        <th className="py-2 text-center">Batch Quantity</th>
                        <th className="py-2 pr-4 text-right">Total Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-600">
                      {selectedPurchase.items.map((it, i) => (
                        <tr key={i}>
                          <td className="py-2 pl-4 font-bold">{it.productName}</td>
                          <td className="py-2 text-right">{formatINR(it.rate)}</td>
                          <td className="py-2 text-center font-bold text-slate-900">{it.quantity}</td>
                          <td className="py-2 pr-4 text-right font-bold">{formatINR(it.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between items-center font-bold bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span>Consignment Bill Gross:</span>
                <span className="text-sm font-black text-slate-900">{formatINR(selectedPurchase.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
