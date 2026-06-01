/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useId } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  Truck, 
  UserCog, 
  LogOut, 
  ShoppingBag,
  Clock
} from 'lucide-react';
import { User } from '../types.js';
import { useConfirm } from '../context/ConfirmationContext.js';

interface SidebarProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
  user: User;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ currentTab, onChangeTab, user, onLogout, isOpen = false, onClose }: SidebarProps) {
  const sidebarId = useId();
  const confirm = useConfirm();

  const handleLogoutClick = async () => {
    const isConfirmed = await confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to log out of the Stockly GST ERP System?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    if (isConfirmed) {
      if (onClose) onClose();
      onLogout();
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'sales', label: 'Sales & Invoices', icon: TrendingUp },
    { id: 'purchases', label: 'Stock Purchases', icon: ShoppingCart },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
  ];

  // User management only for admin
  if (user.role === 'admin') {
    menuItems.push({ id: 'users', label: 'User Operations', icon: UserCog });
  }

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Main Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col h-screen select-none z-50 border-r border-slate-800 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:flex`}>
        {/* Brand Header */}
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white tracking-wide uppercase font-sans">
                Stockly Admin
              </h1>
              <p className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">
                GST ERP SYSTEM
              </p>
            </div>
          </div>
          
          {/* Close button on mobile */}
          {onClose && (
            <button 
              onClick={onClose}
              type="button"
              className="md:hidden p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* User Card */}
        <div className="px-6 py-4 bg-slate-950/40 border-b border-slate-800/40 flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-800 text-sm">
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-white truncate">{user.name}</h4>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-950/55 px-1.5 py-0.5 rounded border border-indigo-900/40">
              {user.role}
            </span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav id={`${sidebarId}-nav`} className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onChangeTab(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/25' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-400 hover:text-white'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer Details */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-950/20 p-2 rounded-lg font-mono">
            <Clock className="h-3 w-3 shrink-0" />
            <span>UTC: 2026-06-01 11:13</span>
          </div>
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/25 hover:text-red-300 transition-all cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
