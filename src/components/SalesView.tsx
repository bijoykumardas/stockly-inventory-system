/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useId } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Search, 
  Trash2, 
  X, 
  Eye, 
  Printer, 
  Download, 
  Share2, 
  FileText, 
  AlertTriangle,
  Settings
} from 'lucide-react';
import { Sale, Customer, Product } from '../types.js';
import { formatINR, formatDate, getWhatsAppShareUrl } from '../utils.js';
import { jsPDF } from 'jspdf';
import { useConfirm } from '../context/ConfirmationContext.js';

interface SalesViewProps {
  token: string;
}

interface SelectedSaleItem {
  productId: string;
  quantity: number;
  rate: number;
  discountPercent: number;
}

export default function SalesView({ token }: SalesViewProps) {
  const selectCustomerId = useId();
  const selectProductId = useId();
  const confirm = useConfirm();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Search Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Sale form factors
  const [customerId, setCustomerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<SelectedSaleItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState<string>('0');

  // Input helpers
  const [currentProductId, setCurrentProductId] = useState('');
  const [currentQty, setCurrentQty] = useState('');
  const [currentRate, setCurrentRate] = useState('');
  const [currentDiscount, setCurrentDiscount] = useState('0');

  // Load datasets
  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const [salesRes, custRes, prodRes] = await Promise.all([
        fetch('/api/sales', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/customers', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!salesRes.ok || !custRes.ok || !prodRes.ok) throw new Error('Failed to load transaction indices');

      const [salesData, custData, prodData] = await Promise.all([
        salesRes.json(),
        custRes.json(),
        prodRes.json()
      ]);

      setSales(salesData);
      setCustomers(custData);
      setProducts(prodData);
    } catch (err: any) {
      setError(err.message || 'Error occurred while fetching billing logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  const handleOpenAddSale = () => {
    if (customers.length === 0) {
      alert('Please catalog an active customer partner first before building checkout sales.');
      return;
    }
    if (products.length === 0) {
      alert('Your inventory has no active catalogs. Register products in inventory first.');
      return;
    }

    setCustomerId(customers[0].id);
    setDate(new Date().toISOString().split('T')[0]);
    setItems([]);
    setGlobalDiscount('0');
    setCurrentProductId(products[0].id);
    setCurrentRate(products[0].sellingPrice.toString());
    setCurrentQty('2');
    setCurrentDiscount('0');
    setShowAddModal(true);
  };

  const handleProductSelectChange = (id: string) => {
    setCurrentProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setCurrentRate(prod.sellingPrice.toString());
    }
  };

  const handleAddItem = () => {
    if (!currentProductId) return;
    const qtyNum = parseInt(currentQty, 10);
    const rateNum = parseFloat(currentRate);
    const discNum = parseFloat(currentDiscount);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert('Quantity must be greater than zero.');
      return;
    }
    if (isNaN(rateNum) || rateNum <= 0) {
      alert('Selling unit cost must be correct.');
      return;
    }
    if (isNaN(discNum) || discNum < 0 || discNum > 100) {
      alert('Discounts must represent valid percentages (0-100%).');
      return;
    }

    // Stock level warning on front-end
    const selectedProd = products.find(p => p.id === currentProductId);
    if (selectedProd && selectedProd.stockQuantity < qtyNum) {
      alert(`Warning: Requested quantity (${qtyNum} ${selectedProd.unit}) exceeds currently available stock (${selectedProd.stockQuantity} ${selectedProd.unit}). Please adjust requirements.`);
      return;
    }

    if (items.some(it => it.productId === currentProductId)) {
      alert('Item is already in checkout list. Delete first if you want to update price or quantity.');
      return;
    }

    setItems([...items, {
      productId: currentProductId,
      quantity: qtyNum,
      rate: rateNum,
      discountPercent: discNum
    }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('A sale entry needs at least one billed product.');
      return;
    }

    setSaveLoading(true);
    const payload = {
      customerId,
      date,
      items,
      discountTotal: Number(globalDiscount) || 0
    };

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Server rejected checkouts');

      // Update states
      setSales([data, ...sales]);
      setShowAddModal(false);
      // Reload products catalog database to sync down decreases stocks
      const prodRes = await fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } });
      const pData = await prodRes.json();
      setProducts(pData);

      // Open the invoice modal for immediate download/print!
      setSelectedSale(data);
      setShowInvoiceModal(true);
    } catch (err: any) {
      alert(err.message || 'Checkout failed');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteSale = async (id: string, invNo: string) => {
    const isConfirmed = await confirm({
      title: 'Rollback Sales Invoice',
      message: `Crucial: Removing transaction ${invNo} will restock item inventories (+ quantity returned to items). Proceed?`,
      confirmText: 'Rollback & Restock',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!isConfirmed) return;
    try {
      const response = await fetch(`/api/sales/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Rollback invoice failed.');

      setSales(sales.filter(s => s.id !== id));
      // Re-update stocks
      const prodRes = await fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } });
      const pData = await prodRes.json();
      setProducts(pData);
      alert('Invoice canceled and item inventories successfully restocked.');
    } catch (err: any) {
      alert(err.message || 'Error occurred while deleting transaction');
    }
  };

  const handleOpenInvoice = (s: Sale) => {
    setSelectedSale(s);
    setShowInvoiceModal(true);
  };

  // --- GST calculations preview for current list ---
  const getSelectionsPreview = () => {
    let sub = 0;
    let gst = 0;
    let disc = 0;

    items.forEach(it => {
      const p = products.find(prod => prod.id === it.productId);
      if (p) {
        const base = it.quantity * it.rate;
        const itemDisc = base * (it.discountPercent / 100);
        const taxable = base - itemDisc;
        const itemGst = taxable * (p.gstPercent / 100);

        sub += base;
        disc += itemDisc;
        gst += itemGst;
      }
    });

    const flatDisc = parseFloat(globalDiscount) || 0;
    const finalGrand = sub - disc - flatDisc + gst;

    return {
      subtotal: sub,
      discountTotal: disc + flatDisc,
      gstTotal: gst,
      grandTotal: Math.max(0, finalGrand)
    };
  };

  const currentPreview = getSelectionsPreview();

  // --- Invoice Export to jsPDF ---
  const handleDownloadPDF = (sale: Sale) => {
    const doc = new jsPDF();
    
    // Core brand styling
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Brand Indigo
    doc.text('STOCKLY GST ERP SYSTEM', 14, 20);
    
    doc.setFontSize(9);
    doc.setTextColor(115, 115, 115);
    doc.setFont('Helvetica', 'normal');
    doc.text('12 Karol Bagh Market, Central Delhi, 110005', 14, 26);
    doc.text('GSTIN Provider: 07SAMPLE1234F1Z9 • stockly-erp@company.in', 14, 30);
    
    // Header partition
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(14, 35, 196, 35);
    
    // Bill details row
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('GST TAX INVOICE', 14, 45);
    
    // Invoice details column
    doc.setFontSize(10);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Invoice No: ${sale.invoiceNo}`, 130, 45);
    doc.text(`Billing Date: ${formatDate(sale.date)}`, 130, 50);
    doc.text(`Created System Time: ${formatDate(sale.createdAt)}`, 130, 55);
    
    // Customer profile column
    doc.setFont('Helvetica', 'bold');
    doc.text('Billed Receiver Details:', 14, 55);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Name: ${sale.customerName}`, 14, 60);
    doc.text(`Contact: +91 ${sale.customerPhone || 'N/A'}`, 14, 65);
    doc.text(`Email: ${sale.customerEmail || 'No Email Registered'}`, 14, 70);
    if (sale.customerAddress) {
      doc.text(`Address: ${sale.customerAddress.substring(0, 45)}`, 14, 75);
    }
    if (sale.customerGstNo) {
      doc.text(`Client GSTIN: ${sale.customerGstNo}`, 14, 80);
    }
    
    // Items Grid Header
    const tableTop = 90;
    doc.setDrawColor(15, 23, 42);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, tableTop, 182, 8, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('SL', 16, tableTop + 5);
    doc.text('Description of Product', 25, tableTop + 5);
    doc.text('Qty', 95, tableTop + 5);
    doc.text('Rate', 115, tableTop + 5);
    doc.text('GST %', 135, tableTop + 5);
    doc.text('Disc %', 155, tableTop + 5);
    doc.text('Amount (INR)', 172, tableTop + 5);
    
    // Draw item rows
    doc.setFont('Helvetica', 'normal');
    let currentY = tableTop + 14;
    sale.items.forEach((it, idx) => {
      doc.text(String(idx + 1), 16, currentY);
      doc.text(it.productName.substring(0, 35), 25, currentY);
      doc.text(String(it.quantity), 95, currentY);
      doc.text(formatINR(it.rate), 115, currentY);
      doc.text(`${it.gstPercent}%`, 135, currentY);
      doc.text(`${it.discountPercent}%`, 155, currentY);
      doc.setFont('Helvetica', 'bold');
      doc.text(formatINR(it.amount), 172, currentY);
      doc.setFont('Helvetica', 'normal');
      currentY += 8;
    });
    
    doc.line(14, currentY, 196, currentY);
    currentY += 10;
    
    // Summary balances
    doc.text('Calculated Subtotal:', 120, currentY);
    doc.text(formatINR(sale.subtotal), 172, currentY);
    currentY += 6;
    
    doc.text('Computed GST tax:', 120, currentY);
    doc.text(formatINR(sale.gstTotal), 172, currentY);
    currentY += 6;
    
    doc.text('Promotional Discounts:', 120, currentY);
    doc.text(`- ${formatINR(sale.discountTotal)}`, 172, currentY);
    currentY += 8;
    
    // Grand Total Highlight box
    doc.setFillColor(238, 242, 255);
    doc.rect(118, currentY - 4, 78, 10, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(67, 56, 202);
    doc.text('GRAND TOTAL BILL:', 120, currentY + 2);
    doc.text(formatINR(sale.grandTotal), 171, currentY + 2);
    
    // Footer declaration row
    currentY += 24;
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(115, 115, 115);
    doc.text('Declarations: This represents computer-generated tax values. Certified true copy.', 14, currentY);
    doc.text('STOCKLY ERP © • Thank you for your continued operations and business.', 14, currentY + 4);
    
    doc.save(`Invoice_${sale.invoiceNo}.pdf`);
  };

  // --- Form WhatsApp share content ---
  const handleWhatsAppShare = (sale: Sale) => {
    const textMsg = `*TAX INVOICE GENERATED - ${sale.invoiceNo}*\n\n` +
      `*Buyer Group:* ${sale.customerName}\n` +
      `*Invoicing Date:* ${formatDate(sale.date)}\n` +
      `*Subtotal:* ${formatINR(sale.subtotal)}\n` +
      `*GST Taxes:* ${formatINR(sale.gstTotal)}\n` +
      `*Promotional Credits:* - ${formatINR(sale.discountTotal)}\n` +
      `*Grand Payable Amount:* *${formatINR(sale.grandTotal)}*\n\n` +
      `*Generated through Stockly GST ERP System™*`;
    
    const url = getWhatsAppShareUrl(sale.customerPhone || '', textMsg);
    window.open(url, '_blank');
  };

  // --- Browser dialogue print action ---
  const handlePrint = () => {
    window.print();
  };

  const filteredSales = sales.filter(s => 
    s.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6 overflow-y-auto max-h-screen">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sales Registers</h2>
          <p className="text-xs text-slate-500">Log client bills and checkout items. Deducts inventory stock instantly with automated GST formulas</p>
        </div>
        <button
          onClick={handleOpenAddSale}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-bold shadow-lg shadow-indigo-100 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create Sales Invoice
        </button>
      </div>

      {/* Filter panel */}
      <div className="relative max-w-md bg-white rounded-xl border border-slate-100 shadow-sm p-2 flex items-center print:hidden">
        <Search className="absolute left-4 h-4 w-4 text-slate-400 m-auto" />
        <input
          type="text"
          placeholder="Search sales ledger by client name or INV invoice sequence..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 w-full outline-none text-xs text-slate-600 font-medium py-1"
        />
      </div>

      {/* Billing Ledger list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden print:hidden">
        {loading ? (
          <div className="p-10 space-y-4">
            <div className="h-6 w-full bg-slate-100 animate-pulse rounded" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 bg-red-50 text-xs font-medium">{error}</div>
        ) : filteredSales.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <TrendingUp className="h-12 w-12 mx-auto text-slate-300" />
            <p className="font-bold text-slate-600">No checkout sales logged yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  <th className="py-3.5 pl-6">Invoice Number</th>
                  <th className="py-3.5">Client Buyer</th>
                  <th className="py-3.5">Date Added</th>
                  <th className="py-3.5 text-right">Tax Total (GST)</th>
                  <th className="py-3.5 text-right">Grand Payable</th>
                  <th className="py-3.5 pr-6 text-center">Invoicing Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50/40 transition-colors text-xs text-slate-600">
                    <td className="py-4 pl-6 font-mono font-bold text-slate-900">{sale.invoiceNo}</td>
                    <td className="py-4 font-bold text-slate-800">{sale.customerName}</td>
                    <td className="py-4">{formatDate(sale.date)}</td>
                    <td className="py-4 text-right font-medium text-slate-500">{formatINR(sale.gstTotal)}</td>
                    <td className="py-4 text-right font-black text-indigo-700">{formatINR(sale.grandTotal)}</td>
                    <td className="py-4 pr-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenInvoice(sale)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-150 rounded-xl bg-indigo-50/30 text-indigo-700 font-bold hover:bg-indigo-50 hover:text-indigo-800 transition-colors cursor-pointer text-[10px]"
                        >
                          <Eye className="h-3 w-3" /> View & Print Invoice
                        </button>
                        <button
                          onClick={() => handleDeleteSale(sale.id, sale.invoiceNo)}
                          className="p-1 px-1.5 border border-red-50 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                          title="Rollback Sales"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      {/* Create Sale checkout Slide Panel */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 font-sans">Establish Checkout Invoice</h3>
                <p className="text-[10px] text-slate-500">Calculate item weights, tax percentages and discounts instantly</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs font-sans">
              
              {/* Checkout details top row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label htmlFor={selectCustomerId} className="block font-bold text-slate-700">Buyer Client *</label>
                  <select
                    id={selectCustomerId}
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 outline-none p-2 bg-white text-xs"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (Phone: {c.phone})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 outline-none p-2 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Flat Special Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Discount amount"
                    value={globalDiscount}
                    onChange={(e) => setGlobalDiscount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 outline-none p-2 text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Product Adding interface */}
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3">
                <h4 className="font-extrabold text-[10px] text-indigo-700 uppercase tracking-widest flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Billed Items Selection
                </h4>
                
                <div className="grid grid-cols-4 gap-3 items-end">
                  <div className="col-span-2 space-y-11">
                    <label htmlFor={selectProductId} className="block font-bold text-slate-650 mb-1">Catalog Product</label>
                    <select
                      id={selectProductId}
                      value={currentProductId}
                      onChange={(e) => handleProductSelectChange(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 outline-none p-1.5 bg-white text-xs"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Sell: {p.sellingPrice} • Stock: {p.stockQuantity} {p.unit})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-11">
                    <label className="block font-bold text-slate-650 mb-1">Sell Value (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Rate"
                      value={currentRate}
                      onChange={(e) => setCurrentRate(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 outline-none p-1.5 text-xs"
                    />
                  </div>
                  <div className="space-y-11">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block font-bold text-slate-650">Billed Weight/Qty</label>
                      <span className="text-[9px] text-indigo-600 font-bold">Disc %</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1 shrink-0 w-24">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={currentQty}
                          onChange={(e) => setCurrentQty(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 outline-none p-1.5 text-xs text-center"
                        />
                        <input
                          type="number"
                          min="0"
                          max="95"
                          placeholder="0%"
                          value={currentDiscount}
                          onChange={(e) => setCurrentDiscount(e.target.value)}
                          className="w-12 rounded-lg border border-slate-200 outline-none p-1.5 text-xs text-center text-indigo-800 font-bold bg-indigo-50/50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg font-bold shrink-0 shadow flex-1 cursor-pointer"
                      >
                        Billed
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items grid selection list */}
              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-inner max-h-48 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider font-extrabold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 pl-4">Product Name</th>
                      <th className="py-2.5 text-right">Selling Rate</th>
                      <th className="py-2.5 text-center">Billed Qty</th>
                      <th className="py-2.5 text-center">GST Tax %</th>
                      <th className="py-2.5 text-center">Item Discount</th>
                      <th className="py-2.5 text-right pr-4">Line Net</th>
                      <th className="py-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                          Billing checkout is empty. Include structured products.
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => {
                        const prodDetails = products.find(p => p.id === it.productId);
                        const pName = prodDetails?.name || 'Unknown Item';
                        const pUnit = prodDetails?.unit || 'pcs';
                        const pGst = prodDetails?.gstPercent || 0;
                        
                        const baseAmt = it.rate * it.quantity;
                        const lineDisc = baseAmt * (it.discountPercent / 100);
                        const finalNet = (baseAmt - lineDisc) * (1 + pGst / 100);

                        return (
                          <tr key={idx} className="text-xs text-slate-600 font-sans">
                            <td className="py-2.5 pl-4 font-bold text-slate-900">{pName}</td>
                            <td className="py-2.5 text-right">{formatINR(it.rate)}</td>
                            <td className="py-2.5 text-center font-bold text-slate-800">{it.quantity} {pUnit}</td>
                            <td className="py-2.5 text-center font-bold text-slate-500">{pGst}%</td>
                            <td className="py-2.5 text-center font-medium bg-red-50/20 text-red-600">{it.discountPercent}% OFF</td>
                            <td className="py-2.5 text-right font-black text-slate-950 pr-4">{formatINR(finalNet)}</td>
                            <td className="py-2.5 text-center">
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

              {/* Invoicing summary display */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest">Base cost subtotal</span>
                  <p className="font-bold text-slate-800 text-xs">{formatINR(currentPreview.subtotal)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest">Promotions Discount</span>
                  <p className="font-bold text-red-600 text-xs">- {formatINR(currentPreview.discountTotal)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest">Computed GST</span>
                  <p className="font-bold text-slate-800 text-xs">{formatINR(currentPreview.gstTotal)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-widest">Grand total bill</span>
                  <p className="font-black text-indigo-700 text-sm">{formatINR(currentPreview.grandTotal)}</p>
                </div>
              </div>

              {/* Buttons */}
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
                  {saveLoading ? 'Billed Processing...' : 'Authorize PDF Invoices'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extreme Detail GST Invoice Display Modal */}
      {showInvoiceModal && selectedSale && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            
            {/* Modal Header Controls */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center print:hidden">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Indian GST e-Invoice Panel
                </h3>
                <p className="text-[10px] text-slate-500">Invoice: {selectedSale.invoiceNo} • print, download, or share with WhatsApp</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleWhatsAppShare(selectedSale)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-150 bg-emerald-50 text-emerald-800 font-bold text-[10px] hover:bg-emerald-100 cursor-pointer"
                >
                  <Share2 className="h-3.5 w-3.5" /> WhatsApp Share
                </button>
                <button
                  onClick={() => handleDownloadPDF(selectedSale)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold text-[10px] hover:bg-slate-100 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" /> Save PDF file
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-800 font-bold text-[10px] hover:bg-indigo-100 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Direct Print (Ctrl+P)
                </button>
                <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer ml-3">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* The Visual Printable Invoice Layout */}
            <div className="p-8 space-y-6 bg-white overflow-y-auto max-h-[75vh]" id="printable-gst-invoice">
              {/* Top Row: Provider identity */}
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-indigo-700 font-sans tracking-wide">STOCKLY GST ERP</h1>
                  <p className="text-[10px] text-slate-500">12 Karol Bagh Market, Central Delhi, New Delhi, Pin-110005</p>
                  <p className="text-[10px] text-slate-500">Email: stockly-erp@company.in • Contacts: 011-28392742</p>
                  <div className="mt-2 text-[10px] font-mono text-indigo-950 font-bold">
                    STORE GSTIN: <span className="bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">07SAMPLE1234F1Z9</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block text-xs uppercase tracking-widest font-black text-indigo-700 bg-indigo-50 p-2 py-1 rounded-lg border border-indigo-100">
                    TAX GST INVOICE
                  </span>
                  <p className="text-xs font-mono font-bold mt-2 text-slate-800">Invoice: {selectedSale.invoiceNo}</p>
                  <p className="text-[10px] text-slate-500">Date: {formatDate(selectedSale.date)}</p>
                </div>
              </div>

              {/* Demarcation Divider line */}
              <div className="border-b border-dashed border-slate-200 w-full" />

              {/* Secondary Row: Customer identity */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest mb-2">Invoice To (Billed Party)</h4>
                  <p className="font-extrabold text-slate-900 text-xs">{selectedSale.customerName}</p>
                  <p className="text-[11px] text-slate-500">Phone Contact: +91 {selectedSale.customerPhone || 'N/A'}</p>
                  {selectedSale.customerEmail && <p className="text-[11px] text-slate-500">Email: {selectedSale.customerEmail}</p>}
                </div>
                <div>
                  <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest mb-2">Location & Tax Details</h4>
                  {selectedSale.customerAddress && <p className="text-[11px] text-slate-500 leading-normal mb-1.5">{selectedSale.customerAddress}</p>}
                  <div className="text-[10px]">
                    {selectedSale.customerGstNo ? (
                      <div>
                        <span className="text-slate-400 font-bold">BUYER GSTIN:</span>{' '}
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">
                          {selectedSale.customerGstNo}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unregistered Consumer</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left font-sans">
                  <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 pl-4">SL</th>
                      <th className="py-2.5">Description</th>
                      <th className="py-2.5 text-center">Qty / Weight</th>
                      <th className="py-2.5 text-right">Selling Rate</th>
                      <th className="py-2.5 text-center">Tax (GST)</th>
                      <th className="py-2.5 text-center">Line Disc</th>
                      <th className="py-2.5 pr-4 text-right">Gross Total Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-650">
                    {selectedSale.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-3 pl-4 text-slate-400 font-mono font-semibold">{idx + 1}</td>
                        <td className="py-3 font-bold text-slate-900">{it.productName}</td>
                        <td className="py-3 text-center">{it.quantity}</td>
                        <td className="py-3 text-right">{formatINR(it.rate)}</td>
                        <td className="py-3 text-center font-bold text-slate-550">{it.gstPercent}%</td>
                        <td className="py-3 text-center text-red-600 font-semibold">{it.discountPercent}% OFF</td>
                        <td className="py-3 pr-4 text-right font-bold text-slate-950">{formatINR(it.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom calculations */}
              <div className="flex flex-col items-end pr-4 space-y-1.5">
                <div className="flex justify-between w-64 text-slate-600 text-[11px]">
                  <span>Subtotal sum:</span>
                  <span className="font-bold">{formatINR(selectedSale.subtotal)}</span>
                </div>
                <div className="flex justify-between w-64 text-slate-600 text-[11px]">
                  <span>Total flat GST index:</span>
                  <span className="font-bold">{formatINR(selectedSale.gstTotal)}</span>
                </div>
                <div className="flex justify-between w-64 text-slate-600 text-[11px]">
                  <span>Promotional Deductions:</span>
                  <span className="font-bold text-red-600">- {formatINR(selectedSale.discountTotal)}</span>
                </div>
                <div className="border-t border-dashed border-slate-200 w-64 my-1" />
                <div className="flex justify-between w-64 text-base font-black text-indigo-700 bg-indigo-50/55 p-2 rounded-xl">
                  <span>Grand Total Net:</span>
                  <span>{formatINR(selectedSale.grandTotal)}</span>
                </div>
              </div>

              {/* Declarations and signatures */}
              <div className="border-t border-dashed border-slate-100 pt-6 flex justify-between items-end">
                <div className="space-y-1 text-[10px] text-slate-400 font-mono">
                  <p>Declaration: Certified computer-generated invoice duplicate copy.</p>
                  <p>Thank you for your business. For refunds, preserve bill copy.</p>
                </div>
                <div className="text-center w-48 border-t border-slate-200 pt-2 shrink-0">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Authorized Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
