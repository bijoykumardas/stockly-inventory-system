import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Clean SQL Schema representing the tables of the Inventory Management System
export const SUPABASE_SQL_SCHEMA = `-- Inventory Management System Schema Setup for Supabase
-- Place this code in the SQL Editor of your Supabase dashboard (https://supabase.com) and click "Run".

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'staff',
  "passwordHash" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Default',
  "purchasePrice" NUMERIC NOT NULL DEFAULT 0,
  "sellingPrice" NUMERIC NOT NULL DEFAULT 0,
  "gstPercent" NUMERIC NOT NULL DEFAULT 0,
  "stockQuantity" NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  "createdAt" TEXT NOT NULL
);

-- 3. Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  "gstNo" TEXT NOT NULL DEFAULT '',
  "createdAt" TEXT NOT NULL
);

-- 4. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  "gstNo" TEXT NOT NULL DEFAULT '',
  "createdAt" TEXT NOT NULL
);

-- 5. Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  "supplierId" TEXT NOT NULL,
  "supplierName" TEXT NOT NULL,
  date TEXT NOT NULL,
  "invoiceNo" TEXT NOT NULL UNIQUE,
  "totalAmount" NUMERIC NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TEXT NOT NULL
);

-- 6. Sales Table
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  "customerId" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL DEFAULT '',
  "customerAddress" TEXT NOT NULL DEFAULT '',
  "customerGstNo" TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  "invoiceNo" TEXT NOT NULL UNIQUE,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  "discountTotal" NUMERIC NOT NULL DEFAULT 0,
  "gstTotal" NUMERIC NOT NULL DEFAULT 0,
  "grandTotal" NUMERIC NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TEXT NOT NULL
);

-- Disable Row Level Security (RLS) for testing ease, or you can manage custom policies manually.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
`;
