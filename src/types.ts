/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  gstPercent: number; // e.g. 18 for 18%
  stockQuantity: number;
  unit: string; // e.g. 'pcs', 'kg', 'ltr', 'box'
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  gstNo?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  gstNo?: string;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  invoiceNo: string;
  totalAmount: number;
  items: PurchaseItem[];
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  rate: number;
  gstPercent: number;
  discountPercent: number; // e.g. 5 for 5%
  amount: number; // Calculated as: (rate * quantity - discount) * (1 + gst/100) or structured
}

export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGstNo?: string;
  date: string;
  invoiceNo: string; // Auto-generated e.g. INV-0001
  subtotal: number; // Sum of (rate * quantity)
  discountTotal: number; // Sum of discounts
  gstTotal: number; // Sum of GST amount
  grandTotal: number; // Subtotal - Discount + GST
  items: SaleItem[];
  createdAt: string;
}

export interface DashboardStats {
  salesToday: number;
  salesThisMonth: number;
  purchasesToday: number;
  purchasesThisMonth: number;
  totalRevenue: number;
  lowStockCount: number;
  recentTransactions: {
    id: string;
    type: 'sale' | 'purchase';
    partyName: string;
    amount: number;
    date: string;
    invoiceNo: string;
  }[];
  lowStockProducts: Product[];
}
