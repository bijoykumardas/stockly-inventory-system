/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import AuthView from './components/AuthView.js';
import Sidebar from './components/Sidebar.js';
import DashboardView from './components/DashboardView.js';
import InventoryView from './components/InventoryView.js';
import SalesView from './components/SalesView.js';
import PurchasesView from './components/PurchasesView.js';
import CustomersView from './components/CustomersView.js';
import SuppliersView from './components/SuppliersView.js';
import UserManagementView from './components/UserManagementView.js';
import { User } from './types.js';
import { ConfirmationProvider } from './context/ConfirmationContext.js';

const tabTitles: Record<string, string> = {
  dashboard: 'Overview',
  inventory: 'Inventory Catalog',
  sales: 'Sales & Invoices',
  purchases: 'Stock Purchases',
  customers: 'Customers Directory',
  suppliers: 'Suppliers Directory',
  users: 'User Operations',
};

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Authenticated state validation on boot
  useEffect(() => {
    const storedToken = localStorage.getItem('stockly_session_token');
    const storedUser = localStorage.getItem('stockly_session_user');

    if (storedToken && storedUser) {
      // Validate token with back-end active session
      fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      })
      .then(res => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error('Session Expired');
        }
      })
      .then((verifiedUser: User) => {
        setToken(storedToken);
        setUser(verifiedUser);
      })
      .catch(() => {
        // Clear corrupt storage
        localStorage.removeItem('stockly_session_token');
        localStorage.removeItem('stockly_session_user');
      })
      .finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = (newToken: string, loggedInUser: User) => {
    localStorage.setItem('stockly_session_token', newToken);
    localStorage.setItem('stockly_session_user', JSON.stringify(loggedInUser));
    setToken(newToken);
    setUser(loggedInUser);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('stockly_session_token');
    localStorage.removeItem('stockly_session_user');
    setToken(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col justify-center items-center gap-4">
        <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase">
          Validating active ERP session...
        </p>
      </div>
    );
  }

  // Not Authenticated
  if (!token || !user) {
    return <AuthView onSuccess={handleLoginSuccess} />;
  }

  // Authenticated Dashboard Layout
  return (
    <ConfirmationProvider>
      <div className="h-screen flex bg-slate-50 overflow-hidden font-sans relative">
        {/* Sidebar Navigation Panel */}
        <Sidebar 
          currentTab={activeTab} 
          onChangeTab={setActiveTab} 
          user={user} 
          onLogout={handleLogout} 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Panel Viewport */}
        <main className="flex-1 overflow-hidden flex flex-col min-w-0 bg-slate-50">
          {/* Mobile Top App Bar */}
          <header className="flex md:hidden items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors"
                id="mobile-menu-toggle"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400">Stockly ERP</span>
                <h1 className="text-xs font-black tracking-tight -mt-0.5">{tabTitles[activeTab] || 'Active Tab'}</h1>
              </div>
            </div>
            
            <div className="h-7 w-7 rounded-full bg-indigo-600 border border-indigo-500 flex items-center justify-center font-extrabold text-[10px] text-white">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
          </header>

          <div className="flex-1 relative overflow-auto min-w-0">
            {activeTab === 'dashboard' && <DashboardView token={token} />}
            {activeTab === 'inventory' && <InventoryView token={token} />}
            {activeTab === 'sales' && <SalesView token={token} />}
            {activeTab === 'purchases' && <PurchasesView token={token} />}
            {activeTab === 'customers' && <CustomersView token={token} />}
            {activeTab === 'suppliers' && <SuppliersView token={token} />}
            {activeTab === 'users' && user.role === 'admin' && <UserManagementView token={token} />}
          </div>
        </main>
      </div>
    </ConfirmationProvider>
  );
}
