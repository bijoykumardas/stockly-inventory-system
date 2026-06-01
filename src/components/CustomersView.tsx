/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  FileText 
} from 'lucide-react';
import { Customer } from '../types.js';
import { useConfirm } from '../context/ConfirmationContext.js';

interface CustomersViewProps {
  token: string;
}

export default function CustomersView({ token }: CustomersViewProps) {
  const confirm = useConfirm();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState('');

  // Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstNo, setGstNo] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load customers');
      const data = await response.json();
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred pulling customer logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [token]);

  const handleOpenAdd = () => {
    setIsEdit(false);
    setCurrentId('');
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setGstNo('');
    setShowModal(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setIsEdit(true);
    setCurrentId(c.id);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email);
    setAddress(c.address);
    setGstNo(c.gstNo || '');
    setShowModal(true);
  };

  const handleDelete = async (id: string, custName: string) => {
    const isConfirmed = await confirm({
      title: 'Remove Customer',
      message: `Are you sure you want to remove customer "${custName}"?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!isConfirmed) return;
    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Could not delete customer');
      }
      setCustomers(customers.filter(c => c.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error deleting customer');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Name & phone are mandatory details.');
      return;
    }

    setSaveLoading(true);
    const payload = { name, phone, email, address, gstNo };
    const endpoint = isEdit ? `/api/customers/${currentId}` : '/api/customers';
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
        setCustomers(customers.map(c => c.id === currentId ? data : c));
      } else {
        setCustomers([...customers, data]);
      }
      setShowModal(false);
    } catch (err: any) {
      alert(err.message || 'Error occurred while saving customer');
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.gstNo && c.gstNo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 space-y-6 overflow-y-auto max-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Customer Database</h2>
          <p className="text-xs text-slate-500">Manage client identities, billing details, and active GST registration numbers</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-bold shadow-lg shadow-indigo-100 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add New Customer
        </button>
      </div>

      {/* Filters */}
      <div className="relative max-w-md bg-white rounded-xl border border-slate-100 shadow-sm p-2 flex items-center">
        <Search className="absolute left-4 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search customers by name, phone, or GSTIN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 w-full outline-none text-xs text-slate-600 font-medium py-1"
        />
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-44 bg-slate-100 rounded-2xl animate-pulse" />
          ))
        ) : error ? (
          <div className="col-span-full p-6 text-center text-red-600 bg-red-50 rounded-xl text-xs">{error}</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="col-span-full p-16 text-center text-slate-400">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-bold">No customers listed.</p>
          </div>
        ) : (
          filteredCustomers.map(c => (
            <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
              {/* Top Row: Initial and name */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 font-black flex items-center justify-center text-sm">
                    {c.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
                    <p className="text-[10px] text-slate-400 font-mono">ID: {c.id}</p>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(c)}
                    className="p-1 px-1.5 border border-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer text-xs"
                    title="Edit Customer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id, c.name)}
                    className="p-1 px-1.5 border border-red-50 rounded text-red-500 hover:bg-red-50 transition-colors cursor-pointer text-xs"
                    title="Delete Customer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Data Rows */}
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-800">+91 {c.phone}</span>
                </div>
                {c.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.address ? (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-tight truncate-3-lines text-slate-500">{c.address}</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-slate-400 italic">
                    <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>No address added</span>
                  </div>
                )}
              </div>

              {/* GST Indicator */}
              <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-bold uppercase tracking-wider">GSTIN Identifier</span>
                {c.gstNo ? (
                  <span className="bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded font-mono font-bold text-indigo-700 uppercase">
                    {c.gstNo}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Unregistered Consumer</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Customer Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">{isEdit ? 'Update Client Record' : 'Enroll New Client'}</h3>
                <p className="text-[10px] text-slate-500">Configure client profiles and tax identifiers</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amit Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 outline-none p-2.5 text-xs focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Contact Phone (+91) *</label>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    title="10 digit phone number"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 outline-none p-2.5 text-xs focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">GSTIN No (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 07AAAAA1111A1Z1"
                  value={gstNo}
                  maxLength={15}
                  onChange={(e) => setGstNo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 outline-none p-2.5 text-xs focus:border-indigo-500 font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="amit@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 outline-none p-2.5 text-xs focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Physical Address / Shipping Address</label>
                <textarea
                  placeholder="Enter full premises/shipping address details..."
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
                  {saveLoading ? 'Enrolling...' : 'Submit Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
