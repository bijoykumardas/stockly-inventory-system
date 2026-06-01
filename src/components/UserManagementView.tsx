/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  UserCog, 
  Trash2, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  Clock, 
  Plus, 
  X,
  Mail
} from 'lucide-react';
import { User, UserRole } from '../types.js';
import { useConfirm } from '../context/ConfirmationContext.js';

interface UserManagementViewProps {
  token: string;
}

export default function UserManagementView({ token }: UserManagementViewProps) {
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('staff');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error('Access Denied. Only system administrators can pull team registry fields.');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Error pulling team rosters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      alert('All credentials are required to onboard new team members.');
      return;
    }

    setSaveLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, password, role })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Team enrollment failed');
      }

      setUsers([...users, data]);
      setShowAddModal(false);
      alert('Staff user registered successfully!');
    } catch (err: any) {
      alert(err.message || 'Error occurred during staff registration');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdateRole = async (id: string, currentRole: UserRole) => {
    const nextRole: UserRole = currentRole === 'admin' ? 'staff' : 'admin';
    const isConfirmed = await confirm({
      title: 'Modify Access Privileges',
      message: `Do you want to switch user role to "${nextRole}"?`,
      confirmText: 'Change Role',
      cancelText: 'Cancel',
      variant: 'warning'
    });
    if (!isConfirmed) return;

    try {
      const response = await fetch(`/api/auth/users/${id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: nextRole })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Role update rejected');
      }

      const updatedUser = await response.json();
      setUsers(users.map(u => u.id === id ? updatedUser : u));
    } catch (err: any) {
      alert(err.message || 'Error updating user role');
    }
  };

  const handleDeleteUser = async (id: string, uName: string) => {
    const isConfirmed = await confirm({
      title: 'Terminate Team License',
      message: `Are you absolutely sure you want to delete user "${uName}"? All access licenses will be instantly terminated.`,
      confirmText: 'Terminate Access',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (!isConfirmed) return;

    try {
      const response = await fetch(`/api/auth/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Deactivation failed.');
      }

      setUsers(users.filter(u => u.id !== id));
      alert('Team profile successfully de-provisioned.');
    } catch (err: any) {
      alert(err.message || 'Error de-registering user');
    }
  };

  return (
    <div className="p-8 space-y-6 overflow-y-auto max-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Onboard & Permissions</h2>
          <p className="text-xs text-slate-500">Configure administrator access, register warehouse staff, and view access limits</p>
        </div>
        <button
          onClick={() => {
            setName('');
            setEmail('');
            setPassword('');
            setRole('staff');
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-bold shadow-lg shadow-indigo-100 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Onboard Team Member
        </button>
      </div>

      {loading ? (
        <div className="p-10 space-y-4">
          <div className="h-6 w-full bg-slate-100 animate-pulse rounded" />
          <div className="h-6 w-full bg-slate-100 animate-pulse rounded" />
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-red-50 text-red-700 rounded-xl border border-red-100 max-w-lg mx-auto space-y-3">
          <ShieldAlert className="h-10 w-10 text-red-500 mx-auto" />
          <p className="font-bold text-xs">{error}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  <th className="py-3.5 pl-6">Profile Identity</th>
                  <th className="py-3.5">Email Address</th>
                  <th className="py-3.5">Auth Role</th>
                  <th className="py-3.5">Onboard Date</th>
                  <th className="py-3.5 pr-6 text-center">Permit Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/40 transition-colors text-xs text-slate-600">
                    <td className="py-4 pl-6 font-bold text-slate-900">{u.name}</td>
                    <td className="py-4 font-semibold text-slate-700">{u.email}</td>
                    <td className="py-4 font-mono font-bold">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] ${
                        u.role === 'admin' 
                          ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 text-slate-400 font-mono">
                      {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 pr-6">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleUpdateRole(u.id, u.role)}
                          className="flex items-center gap-1 p-1 px-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-bold hover:text-slate-800 text-[10px] transition-colors cursor-pointer"
                        >
                          <UserCheck className="h-3.5 w-3.5" /> Promotion
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1 px-1.5 border border-red-50 text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Revoke access"
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
        </div>
      )}

      {/* Onboard User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Provision Team Credentials</h3>
                <p className="text-[10px] text-slate-500">Configure new user profile access nodes</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 outline-none p-2.5 text-xs focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="ramesh@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 outline-none p-2.5 text-xs focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Set Temporary Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 outline-none p-2.5 text-xs focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Account Access Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full rounded-xl border border-slate-200 outline-none p-2.5 text-xs bg-white focus:border-indigo-500"
                >
                  <option value="staff">Staff/User (Read, Sale, Purchase)</option>
                  <option value="admin">Admin (Full Access & Accounts Control)</option>
                </select>
              </div>

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
                  {saveLoading ? 'Enrolling...' : 'Onboard User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
