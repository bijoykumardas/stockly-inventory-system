/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  X, 
  Phone, 
  MapPin, 
  FileText 
} from 'lucide-react';
import { Supplier } from '../types.js';
import { useConfirm } from '../context/ConfirmationContext.js';

interface SuppliersViewProps {
  token: string;
}

export default function SuppliersView({ token }: SuppliersViewProps) {
  const confirm = useConfirm();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Filter Search
  const [searchTerm, setSearchTerm] = useState('');

  // Modal Control
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState('');

  // Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstNo, setGstNo] = useState('');

  const fetchSuppliers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/suppliers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load supplier catalogs');
      const data = await response.json();
      setSuppliers(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred while loading suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [token]);

  const handleOpenAdd = () => {
    setIsEdit(false);
    setCurrentId('');
    setName('');
    setPhone('');
    setAddress('');
    setGstNo('');
    setShowModal(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setIsEdit(true);
    setCurrentId(s.id);
    setName(s.name);
    setPhone(s.phone);
    setAddress(s.address);
    setGstNo(s.gstNo || '');
    setShowModal(true);
  };

  const handleDelete = async (id: string, sName: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Supplier',
      message: `Are you absolutely sure you want to delete supplier "${sName}"?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!isConfirmed) return;
    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Could not delete supplier record');
      setSuppliers(suppliers.filter(s => s.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error deleting supplier');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim() || !gstNo.trim()) {
      alert('All supplier details including GSTIN, address, and contact phone are mandatory.');
      return;
    }

    setSaveLoading(true);
    const payload = { name, phone, address, gstNo };
    const endpoint = isEdit ? `/api/suppliers/${currentId}` : '/api/suppliers';
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
      if (!response.ok) throw new Error(data.error || 'Operation failed');

      if (isEdit) {
        setSuppliers(suppliers.map(s => s.id === currentId ? data : s));
      } else {
        setSuppliers([...suppliers, data]);
      }
      setShowModal(false);
    } catch (err: any) {
      alert(err.message || 'Error saving supplier');
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm) ||
    s.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.gstNo && s.gstNo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8 space-y-6 overflow-y-auto max-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Suppliers Network</h2>
          <p className="text-xs text-slate-500">Record suppliers profiles, contact numbers & wholesaler taxation structures</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-bold shadow-lg shadow-indigo-100 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Supplier Partner
        </button>
      </div>

      {/* Searched filter */}
      <div className="relative max-w-md bg-white rounded-xl border border-slate-100 shadow-sm p-2 flex items-center">
        <Search className="absolute left-4 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search suppliers by name, phone, address, or GSTIN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 w-full outline-none text-xs text-slate-600 font-medium py-1"
        />
      </div>

      {/* Supplier Grid list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
          ))
        ) : error ? (
          <div className="col-span-full p-6 text-center text-red-600 bg-red-50 rounded-xl text-xs">{error}</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="col-span-full p-16 text-center text-slate-400">
            <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-bold">No suppliers registered.</p>
          </div>
        ) : (
          filteredSuppliers.map(s => (
            <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
              {/* Profile Top */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-700 font-black flex items-center justify-center text-sm">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm truncate max-w-[140px]" title={s.name}>{s.name}</h3>
                    <p className="text-[10px] text-slate-400 font-mono">SUP ID: {s.id}</p>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="p-1 px-1.5 border border-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer text-xs"
                    title="Edit Supplier details"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    className="p-1 px-1.5 border border-red-50 rounded text-red-500 hover:bg-red-50 transition-colors cursor-pointer text-xs"
                    title="Delete Supplier Record"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Supp info body */}
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-800">+91 {s.phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-tight truncate-3-lines text-slate-500">{s.address}</span>
                </div>
              </div>

              {/* Taxation details */}
              <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Wholesaler GSTIN</span>
                <span className="bg-sky-50 border border-sky-100 px-2 py-0.5 rounded font-mono font-bold text-sky-700 uppercase">
                  {s.gstNo || 'No GSTIN Record'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Dialogue */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">{isEdit ? 'Update Supplier Record' : 'Enroll Supplier Wholesaler'}</h3>
                <p className="text-[10px] text-slate-500">Configure delivery channels and taxation inputs</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Company Name / Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Distributors"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 outline-none p-2.5 text-xs focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="block font-bold text-slate-700">Contact Phone Number (+91) *</label>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    title="10 digit phone number"
                    placeholder="e.g. 9111222333"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 outline-none p-2.5 text-xs focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Supplier GSTIN Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 07BBBBB2222B2Z2"
                  value={gstNo}
                  maxLength={15}
                  onChange={(e) => setGstNo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 outline-none p-2.5 text-xs focus:border-indigo-500 font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Registered Office Address *</label>
                <textarea
                  required
                  placeholder="Enter supplier office/warehouse premises details..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 outline-none p-2.5 text-xs focus:border-indigo-500 font-sans"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold disabled:opacity-55 cursor-pointer"
                >
                  {saveLoading ? 'EnrollingWholesaler...' : 'enroll supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
