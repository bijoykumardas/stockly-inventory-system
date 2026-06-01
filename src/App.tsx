/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
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

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

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
      <div className="h-screen flex bg-slate-50 overflow-hidden font-sans">
        {/* Sidebar Navigation Panel */}
        <Sidebar 
          currentTab={activeTab} 
          onChangeTab={setActiveTab} 
          user={user} 
          onLogout={handleLogout} 
        />

        {/* Main Panel Viewport */}
        <main className="flex-1 overflow-hidden flex flex-col min-w-0 bg-slate-50">
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
