/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  ShoppingCart, 
  AlertTriangle, 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw,
  ShoppingBag,
  Cloud,
  Database,
  Check,
  Copy,
  ExternalLink,
  Code,
  AlertCircle,
  Terminal,
  ArrowRight
} from 'lucide-react';
import { DashboardStats } from '../types.js';
import { formatINR, formatDate } from '../utils.js';

interface DashboardViewProps {
  token: string;
}

export default function DashboardView({ token }: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Supabase Integration States
  const [supabaseStatus, setSupabaseStatus] = useState<{
    connected: boolean;
    configured: boolean;
    missingTables: string[];
    error: string;
    schema: string;
    url?: string;
  } | null>(null);
  const [checkingSupabase, setCheckingSupabase] = useState(false);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [showSchemaModal, setShowSchemaModal] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState('');
  const [syncError, setSyncError] = useState('');

  const fetchSupabaseStatus = async () => {
    setCheckingSupabase(true);
    try {
      const response = await fetch(`/api/supabase/status?_=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSupabaseStatus(data);
      }
    } catch (err) {
      console.error('Error loading Supabase status', err);
    } finally {
      setCheckingSupabase(false);
    }
  };

  const syncSupabaseData = async () => {
    setSyncingSupabase(true);
    setSyncSuccess('');
    setSyncError('');
    try {
      const response = await fetch('/api/supabase/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setSyncSuccess(data.message || 'Successfully synced data to Supabase!');
        await fetchSupabaseStatus();
        await fetchStats();
      } else {
        setSyncError(data.error || 'Failed to sync data.');
      }
    } catch (err: any) {
      setSyncError(err.message || 'External sync failed.');
    } finally {
      setSyncingSupabase(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to load dashboard metrics');
      }
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Server error loading stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSupabaseStatus();
  }, [token]);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-lg" />
          <div className="h-10 w-24 bg-slate-200 animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-200 animate-pulse rounded-2xl" />
          <div className="h-96 bg-slate-200 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-xl p-6">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-semibold">{error || 'Unable to fetch dashboard statistics'}</p>
          <button 
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-bold"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 overflow-y-auto max-h-screen">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Active Overview</h2>
          <p className="text-xs text-slate-500">Live indicators, stock alerts and Indian GST accounting metrics</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-all cursor-pointer shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Stats
        </button>
      </div>

      {/* Supabase Status Banner */}
      {supabaseStatus && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 border border-slate-850 shadow-lg relative overflow-hidden transition-all duration-300">
          <div className="absolute right-0 top-0 opacity-10 transform translate-x-10 -translate-y-10 pointer-events-none">
            <Cloud className="h-64 w-64 text-indigo-500" />
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="p-1.5 bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 rounded-lg">
                  <Database className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Supabase Cloud Sync Ledger</span>
                
                {/* Indicator Beacon */}
                {supabaseStatus.connected && supabaseStatus.missingTables.length === 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
                    CONNECTED & SYNCED
                  </span>
                ) : supabaseStatus.missingTables.length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/30 animate-pulse">
                    <span className="h-1.5 w-1.5 bg-amber-400 rounded-full animate-ping" />
                    SCHEMA SETUP PENDING
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[9px] font-bold border border-red-500/30">
                    <span className="h-1.5 w-1.5 bg-red-450 rounded-full" />
                    DISCONNECTED
                  </span>
                )}
              </div>
              
              <div>
                <h3 className="text-base font-extrabold tracking-tight">Active Supabase Workspace</h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed mt-1">
                  {supabaseStatus.connected && supabaseStatus.missingTables.length === 0 ? (
                    "Your cloud database is connected. All inventory catalog lists, registered accounts, client details, purchases, and sales ledgers are synced in real-time."
                  ) : supabaseStatus.missingTables.length > 0 ? (
                    `Credentials verified, but some tables are missing: ${supabaseStatus.missingTables.join(', ')}. Click "Configure SQL Tables" to view and run the SQL migration script.`
                  ) : (
                    "Database credentials are valid, but connection validation failed. Please check your Supabase dashboard or check your credentials."
                  )}
                </p>
                {supabaseStatus.error && (
                  <div className="mt-1.5 text-[11px] text-amber-300/90 font-mono bg-amber-500/10 inline-block px-2.5 py-1 rounded-lg border border-amber-500/20 max-w-full overflow-x-auto whitespace-pre-wrap">
                    Error trace: {supabaseStatus.error}
                  </div>
                )}
              </div>

              {/* Service URL and Project details */}
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1">
                <span className="font-mono text-[10px] text-zinc-400">
                  <strong className="text-indigo-300">URL:</strong> {supabaseStatus.url || "https://xsvuwgqsfmpiqdkopvtw.supabase.co"}
                </span>
                <span className="font-mono text-[10px] text-zinc-400">
                  <strong className="text-indigo-300">Project ID:</strong> {(() => {
                    const displayUrl = supabaseStatus.url || "https://xsvuwgqsfmpiqdkopvtw.supabase.co";
                    try {
                      const match = displayUrl.match(/https?:\/\/([^.]+)\.supabase/);
                      return (match && match[1]) ? match[1] : displayUrl;
                    } catch (e) {
                      return "unknown";
                    }
                  })()}
                </span>
              </div>
              
              {syncSuccess && (
                <div className="text-xs text-emerald-400 font-bold bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/10 flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" /> {syncSuccess}
                </div>
              )}
              {syncError && (
                <div className="text-xs text-red-400 font-bold bg-red-500/10 p-2.5 rounded-xl border border-red-500/10 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {syncError}
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-3 shrink-0">
              {supabaseStatus.missingTables.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSchemaModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-400 font-black text-xs transition-colors cursor-pointer shadow-md shadow-amber-500/15"
                >
                  <Code className="h-4 w-4" />
                  Configure SQL Tables
                </button>
              )}
              
              <button
                type="button"
                onClick={syncSupabaseData}
                disabled={syncingSupabase || supabaseStatus.missingTables.length > 0}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-950 rounded-xl font-black text-xs transition-all cursor-pointer shadow-lg hover:bg-slate-100 ${
                  syncingSupabase || supabaseStatus.missingTables.length > 0
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {syncingSupabase ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <Cloud className="h-4 w-4" />
                    Sync Local Data to Cloud
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supabase Schema Modal Instructions */}
      {showSchemaModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden text-white animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-800">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Supabase SQL Editor Setup Instructions</h3>
                    <p className="text-xs text-slate-400 font-semibold">Install tables to connect with the Inventory Management System</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSchemaModal(false)}
                  className="p-1 px-2.5 text-xs font-bold border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 transition cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 select-text">
              {/* Instructions Text */}
              <div className="space-y-3 bg-slate-950 p-4 border border-slate-800 rounded-xl text-xs text-slate-300">
                <p className="font-bold text-amber-400 uppercase tracking-widest text-[10px]">Follow these Steps:</p>
                <ol className="list-decimal list-inside space-y-2 font-medium">
                  <li>
                    Open your Supabase active workspace dashboard at{" "}
                    <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-indigo-300 font-bold">
                      supabase.com
                    </a>.
                  </li>
                  <li>
                    Navigate to the <span className="font-bold text-white bg-slate-850 px-1.5 py-0.5 rounded">SQL Editor</span> tab from the left navigation rail.
                  </li>
                  <li>
                    Create a <span className="font-bold text-white bg-slate-850 px-1.5 py-0.5 rounded">New Query</span>.
                  </li>
                  <li>
                    Copy all the PostgreSQL database commands from the terminal box below, paste it into the editor box, and click <span className="font-bold text-emerald-400 bg-emerald-950 border border-emerald-900 px-1.5 py-0.5 rounded">Run</span>.
                  </li>
                  <li>
                    That's it! Once executed, close this window and refresh the dashboard.
                  </li>
                </ol>
              </div>

              {/* Code Box container */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono text-zinc-400 text-[10px] uppercase font-bold flex items-center gap-1">
                    <Terminal className="h-3 w-3" /> postgres_schema.sql
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(supabaseStatus?.schema || "")}
                    className="flex items-center gap-1 font-bold text-[10px] text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    {copiedSchema ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Copied Schema Code!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-4 rounded-xl border border-slate-850 bg-slate-950 font-mono text-xs text-indigo-200 overflow-x-auto max-h-60 overflow-y-auto select-all selection:bg-indigo-500/30 text-left">
                  {supabaseStatus?.schema}
                </pre>
              </div>
            </div>

            {/* Modal footers */}
            <div className="p-4 border-t border-slate-850 flex justify-end gap-3 bg-slate-950/20">
              <button
                type="button"
                onClick={() => setShowSchemaModal(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-xl cursor-pointer transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Sales Counter */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sales Today</span>
            <h3 className="text-2xl font-black text-slate-900">{formatINR(stats.salesToday)}</h3>
            <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
              Month to date: <span className="text-slate-900 font-bold">{formatINR(stats.salesThisMonth)}</span>
            </p>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        {/* Stock Purchases Counter */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Purchases Today</span>
            <h3 className="text-2xl font-black text-slate-900">{formatINR(stats.purchasesToday)}</h3>
            <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
              Month to date: <span className="text-slate-900 font-bold">{formatINR(stats.purchasesThisMonth)}</span>
            </p>
          </div>
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
            <ShoppingCart className="h-6 w-6" />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Turnover</span>
            <h3 className="text-2xl font-black text-slate-900">{formatINR(stats.totalRevenue)}</h3>
            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              All-time cumulative total
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <IndianRupee className="h-6 w-6" />
          </div>
        </div>

        {/* Low Stock Watch */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Critical Stock Risk</span>
            <h3 className="text-2xl font-black text-slate-900">{stats.lowStockCount} Items</h3>
            <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
              Stock quantity &lt; 10 units
            </p>
          </div>
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Stats Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG Sales Trend Chart & Visual Comparison */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Current Sales vs Stock Purchases Comparison</h3>
              <p className="text-[11px] text-slate-500">Visualization of monthly and daily operations</p>
            </div>
          </div>

          <div className="relative h-60 w-full flex items-end gap-10 pt-6">
            {/* Visual Balance Bar */}
            <div className="w-full h-full flex flex-col justify-end space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span className="font-semibold flex items-center gap-1"><span className="h-2 w-2 bg-indigo-600 rounded-full inline-block"></span> Sales Ledger</span>
                  <span className="font-bold">{formatINR(stats.salesThisMonth)}</span>
                </div>
                <div className="w-full bg-slate-100 h-6.5 rounded-lg overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-lg transition-all duration-1000" 
                    style={{ width: `${stats.salesThisMonth === 0 ? 0 : Math.min(100, (stats.salesThisMonth / (stats.salesThisMonth + stats.purchasesThisMonth || 1)) * 100)}%` }} 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span className="font-semibold flex items-center gap-1"><span className="h-2 w-2 bg-sky-500 rounded-full inline-block"></span> Stock Purchases</span>
                  <span className="font-bold">{formatINR(stats.purchasesThisMonth)}</span>
                </div>
                <div className="w-full bg-slate-100 h-6.5 rounded-lg overflow-hidden">
                  <div 
                    className="bg-sky-500 h-full rounded-lg transition-all duration-1000" 
                    style={{ width: `${stats.purchasesThisMonth === 0 ? 0 : Math.min(100, (stats.purchasesThisMonth / (stats.salesThisMonth + stats.purchasesThisMonth || 1)) * 100)}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* Accent Illustration representing Growth */}
            <div className="hidden sm:flex flex-col justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-xl shrink-0 w-44 h-full">
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">Cash Margin Ratio</span>
              <div className="h-10 text-center flex flex-col justify-center">
                <span className="text-lg font-black text-slate-800">
                  {stats.salesThisMonth > 0 
                    ? `${(((stats.salesThisMonth - stats.purchasesThisMonth) / stats.salesThisMonth) * 100).toFixed(0)}%`
                    : '100%'}
                </span>
                <span className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase">Operating Margin</span>
              </div>
              <div className="w-full bg-slate-200 h-1 rounded">
                <div 
                  className="bg-emerald-500 h-1 rounded" 
                  style={{ width: stats.salesThisMonth > 0 ? `${Math.max(5, Math.min(100, ((stats.salesThisMonth - stats.purchasesThisMonth) / stats.salesThisMonth) * 100))}%` : '100%' }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Extreme Risk Stock alert tracking panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Low Stock Triggers</h3>
              <p className="text-[11px] text-slate-500">Inventory items needing immediate top-up</p>
            </div>
            <span className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-xl font-bold border border-red-100">ALERT</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-52">
            {stats.lowStockProducts.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center text-slate-400 py-10">
                <ShoppingBag className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-xs font-semibold text-slate-500">All products have efficient stock levels.</p>
              </div>
            ) : (
              stats.lowStockProducts.map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="overflow-hidden pr-2">
                    <p className="text-xs font-bold text-slate-800 truncate" title={p.name}>{p.name}</p>
                    <span className="text-[10px] text-slate-500 font-semibold">{p.sku} • {p.unit}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-1 rounded">
                      {p.stockQuantity} Left
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Ledger Entries Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-1.5">Recent Operational Ledger</h3>
        <p className="text-[11px] text-slate-500 mb-5">Audit of Sales invoices and Supplier purchase receipts</p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                <th className="pb-3 pl-3">Transaction</th>
                <th className="pb-3">Reference No</th>
                <th className="pb-3">Counter-party</th>
                <th className="pb-3">Transaction Date</th>
                <th className="pb-3 text-right pr-3">Invoice Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs font-semibold text-slate-400">
                    No transactions captured in this ledger yet.
                  </td>
                </tr>
              ) : (
                stats.recentTransactions.map(txn => (
                  <tr key={txn.id} className="hover:bg-slate-50 transition-colors text-slate-600 text-xs">
                    <td className="py-3.5 pl-3">
                      {txn.type === 'sale' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-100">
                          <ArrowUpRight className="h-3 w-3 shrink-0" />
                          SALE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 text-[10px] font-bold border border-sky-100">
                          <ArrowDownLeft className="h-3 w-3 shrink-0" />
                          PURCHASE
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 font-mono text-slate-800 font-semibold">{txn.invoiceNo}</td>
                    <td className="py-3.5 font-bold text-slate-900">{txn.partyName}</td>
                    <td className="py-3.5">{formatDate(txn.date)}</td>
                    <td className={`py-3.5 text-right font-bold pr-3 ${txn.type === 'sale' ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {txn.type === 'sale' ? '+' : '-'} {formatINR(txn.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
