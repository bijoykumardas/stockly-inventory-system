/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { 
  User, Product, Customer, Supplier, Purchase, Sale, DashboardStats 
} from './src/types.js'; // Ensure file exists or use types directly
import { supabase, isSupabaseConfigured, SUPABASE_SQL_SCHEMA } from './supabase.js';

const app = express();
const PORT = 3000;
const DB_DIR = process.env.VERCEL 
  ? '/tmp' 
  : path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'db.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom lightweight CORS middleware to prevent cross-origin issues across environments
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Database initialization
interface LocalDB {
  users: Array<User & { passwordHash: string }>;
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  purchases: Purchase[];
  sales: Sale[];
}

function initializeDB() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // Ensure DB_PATH is writable if it already exists to prevent EACCES issues under Vercel
  if (fs.existsSync(DB_PATH)) {
    try {
      fs.chmodSync(DB_PATH, 0o666);
    } catch (e) {
      console.warn('Cannot check or change DB permissions, attempting recreate:', e);
      try {
        fs.unlinkSync(DB_PATH);
      } catch (err) {
        console.error('Failed to remove potentially locked database file:', err);
      }
    }
  }

  if (!fs.existsSync(DB_PATH)) {
    const seedPath = path.join(process.cwd(), 'data', 'db.json');
    if (process.env.VERCEL && fs.existsSync(seedPath)) {
      try {
        const data = fs.readFileSync(seedPath, 'utf-8');
        fs.writeFileSync(DB_PATH, data, { encoding: 'utf-8', mode: 0o666 });
        console.log('Seeded database from template db.json successfully on Vercel.');
        return;
      } catch (e) {
        console.error('Failed to copy seed database on Vercel:', e);
      }
    }
    const defaultData: LocalDB = {
      users: [
        {
          id: 'u-1',
          name: 'Aman Sharma',
          email: 'admin@inventory.com',
          role: 'admin',
          passwordHash: 'admin', // Simple plan text for development ease
          createdAt: new Date().toISOString()
        },
        {
          id: 'u-2',
          name: 'Rahul Patel',
          email: 'staff@inventory.com',
          role: 'staff',
          passwordHash: 'staff',
          createdAt: new Date().toISOString()
        }
      ],
      products: [
        {
          id: 'p-1',
          name: 'Tata Salt Premium 1kg',
          sku: 'SKU-TTS-001',
          category: 'Grocery',
          purchasePrice: 20,
          sellingPrice: 28,
          gstPercent: 5,
          stockQuantity: 150,
          unit: 'pcs',
          createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 'p-2',
          name: 'Parle-G Biscuits 250g',
          sku: 'SKU-PGB-002',
          category: 'Spices & Snacks',
          purchasePrice: 8,
          sellingPrice: 12,
          gstPercent: 18,
          stockQuantity: 320,
          unit: 'pcs',
          createdAt: new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 'p-3',
          name: 'Amul Butter 500g',
          sku: 'SKU-AMB-003',
          category: 'Dairy',
          purchasePrice: 220,
          sellingPrice: 260,
          gstPercent: 12,
          stockQuantity: 4, // Low Stock! (thresh < 10)
          unit: 'pcs',
          createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 'p-4',
          name: 'Fortune Mustard Oil 1L',
          sku: 'SKU-FMO-004',
          category: 'Grocery',
          purchasePrice: 140,
          sellingPrice: 175,
          gstPercent: 5,
          stockQuantity: 8, // Low Stock! (thresh < 10)
          unit: 'pcs',
          createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 'p-5',
          name: 'India Gate Basmati Rice 5kg',
          sku: 'SKU-IGR-005',
          category: 'Grocery',
          purchasePrice: 480,
          sellingPrice: 580,
          gstPercent: 5,
          stockQuantity: 65,
          unit: 'pcs',
          createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
        }
      ],
      customers: [
        {
          id: 'c-1',
          name: 'Amit Kumar',
          phone: '9876543210',
          email: 'amit@gmail.com',
          address: 'Shop No 14, Karol Bagh Market, New Delhi',
          gstNo: '07AAAAA1111A1Z1',
          createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 'c-2',
          name: 'Priya Sharma',
          phone: '9988776655',
          email: 'priya.sharma@yahoo.com',
          address: 'Apartment 402, Sector 15, Noida, UP',
          createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
        }
      ],
      suppliers: [
        {
          id: 's-1',
          name: 'National Distributors',
          phone: '9111222333',
          address: 'G-2 Ground Floor, Connaught Place, New Delhi',
          gstNo: '07BBBBB2222B2Z2',
          createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 's-2',
          name: 'Metro Foods Wholesale',
          phone: '9818273645',
          address: 'Shed 42, Azadpur Fruits & Veg Mandi, Delhi',
          gstNo: '07CCCCC3333C3Z3',
          createdAt: new Date(Date.now() - 22 * 24 * 3600 * 1000).toISOString()
        }
      ],
      purchases: [
        {
          id: 'pur-1',
          supplierId: 's-1',
          supplierName: 'National Distributors',
          date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
          invoiceNo: 'N-4201',
          totalAmount: 18500,
          items: [
            { productId: 'p-5', productName: 'India Gate Basmati Rice 5kg', quantity: 30, rate: 480, amount: 14400 },
            { productId: 'p-4', productName: 'Fortune Mustard Oil 1L', quantity: 20, rate: 140, amount: 2800 },
            { productId: 'p-3', productName: 'Amul Butter 500g', quantity: 5, rate: 220, amount: 1100 }
          ],
          createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
        }
      ],
      sales: [
        {
          id: 'sale-1',
          customerId: 'c-1',
          customerName: 'Amit Kumar',
          customerPhone: '9876543210',
          customerEmail: 'amit@gmail.com',
          customerAddress: 'Shop No 14, Karol Bagh Market, New Delhi',
          customerGstNo: '07AAAAA1111A1Z1',
          date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
          invoiceNo: 'INV-0001',
          subtotal: 1540,
          discountTotal: 40,
          gstTotal: 104,
          grandTotal: 1604,
          items: [
            { productId: 'p-1', productName: 'Tata Salt Premium 1kg', quantity: 10, rate: 28, gstPercent: 5, discountPercent: 0, amount: 294 }, // (280)*1.05
            { productId: 'p-5', productName: 'India Gate Basmati Rice 5kg', quantity: 2, rate: 580, gstPercent: 5, discountPercent: 3, amount: 1182.3 } // Sub=(1160 - 34.8)*1.05 = 1181.4~
          ],
          createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 'sale-2',
          customerId: 'c-2',
          customerName: 'Priya Sharma',
          customerPhone: '9988776655',
          customerEmail: 'priya.sharma@yahoo.com',
          customerAddress: 'Apartment 402, Sector 15, Noida, UP',
          date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString().split('T')[0],
          invoiceNo: 'INV-0002',
          subtotal: 700,
          discountTotal: 0,
          gstTotal: 35,
          grandTotal: 735,
          items: [
            { productId: 'p-4', productName: 'Fortune Mustard Oil 1L', quantity: 4, rate: 175, gstPercent: 5, discountPercent: 0, amount: 735 }
          ],
          createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
        }
      ]
    };
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write initial db.json database on startup:', e);
    }
  }
}

initializeDB();

// --- SUPABASE SYNC AND MIRROR ENGINE ---

// Supabase Status Tracker
let supabaseStatus = {
  connected: false,
  configured: isSupabaseConfigured,
  missingTables: [] as string[],
  error: isSupabaseConfigured ? '' : 'Supabase is not configured yet. Add SUPABASE_URL and SUPABASE_ANON_KEY to your .env file.'
};

async function checkSupabaseStatus() {
  if (!supabase) {
    return {
      connected: false,
      configured: false,
      missingTables: [],
      error: 'Supabase URL or Anonymous Key is missing in environment variables (.env).'
    };
  }

  const missingTables: string[] = [];
  const tables = ['users', 'products', 'customers', 'suppliers', 'purchases', 'sales'];
  let anySuccess = false;
  let connectionError = '';

  for (const table of tables) {
    try {
      console.log(`[Supabase Status] Checking table "${table}"...`);
      const { data, error } = await supabase.from(table).select('id').limit(1);
      if (error) {
        console.error(`[Supabase Status] Error checking "${table}":`, error);
        
        // Let's check for specific PostgreSQL / PostgREST error codes:
        const isMsgNotExist = error.message && error.message.toLowerCase().includes('does not exist');
        if (error.code === '42P01' || isMsgNotExist) {
          // Table definitely does not exist
          missingTables.push(table);
        } else if (error.code === '42501' || (error.message && error.message.toLowerCase().includes('permission denied'))) {
          // Table exists! But SELECT privilege is denied due to RLS or missing GRANT permissions.
          console.log(`[Supabase Status] Table "${table}" exists, but permission is denied (42501)`);
          anySuccess = true;
        } else if (error.code === 'PGRST116' || (error.message && error.message.toLowerCase().includes('no rows'))) {
          // PGRST116 means the table exists, but query failed because filtering issues (or just empty)
          console.log(`[Supabase Status] Table "${table}" exists but is empty/unavailable (PGRST116)`);
          anySuccess = true;
        } else {
          // General connection, auth, or query error (e.g. invalid API key, fetch error, invalid host)
          connectionError = error.message;
        }
      } else {
        console.log(`[Supabase Status] Table "${table}" check succeeded. Found elements count:`, data?.length);
        anySuccess = true;
      }
    } catch (err: any) {
      console.error(`[Supabase Status] Exception checking table "${table}":`, err);
      connectionError = err.message || String(err);
    }
  }

  // If there's a general connection error (like invalid API key) and no table actually succeeded, it's a connection failure
  const isConnected = anySuccess && connectionError === '';

  console.log(`[Supabase Status Summary] anySuccess: ${anySuccess}, isConnected: ${isConnected}, connectionError: "${connectionError}", missingTables:`, missingTables);

  return {
    connected: isConnected || (anySuccess && !connectionError),
    configured: true,
    missingTables,
    error: connectionError || (missingTables.length > 0 ? 'Some database tables are missing in Supabase.' : ''),
    url: process.env.SUPABASE_URL || ''
  };
}

// Function to pull all data from Supabase into our local db.json cache on startup
async function importFromSupabase() {
  if (!supabase) return;
  try {
    const status = await checkSupabaseStatus();
    supabaseStatus = status;
    if (!status.connected || status.missingTables.length > 0) {
      console.log('[Supabase Engine] Schema not ready or disconnected. Ready to sync when SQL schema is applied.');
      return;
    }

    console.log('[Supabase Engine] Schema matched! Authenticating and pulling cloud records...');
    const db = loadDB();

    const { data: users } = await supabase.from('users').select('*');
    const { data: products } = await supabase.from('products').select('*');
    const { data: customers } = await supabase.from('customers').select('*');
    const { data: suppliers } = await supabase.from('suppliers').select('*');
    const { data: purchases } = await supabase.from('purchases').select('*');
    const { data: sales } = await supabase.from('sales').select('*');

    let updated = false;
    if (users && users.length > 0) { db.users = users as any; updated = true; }
    if (products && products.length > 0) { db.products = products as any; updated = true; }
    if (customers && customers.length > 0) { db.customers = customers as any; updated = true; }
    if (suppliers && suppliers.length > 0) { db.suppliers = suppliers as any; updated = true; }
    if (purchases && purchases.length > 0) { db.purchases = purchases as any; updated = true; }
    if (sales && sales.length > 0) { db.sales = sales as any; updated = true; }

    if (updated) {
      saveDB(db);
      console.log('[Supabase Engine] Sync Completed: Cloud data loaded into local cache successfully!');
    } else {
      console.log('[Supabase Engine] Connected, but cloud database is empty. Ready to sync local data.');
    }
  } catch (err) {
    console.error('[Supabase Engine] Failed to import cloud data:', err);
  }
}

// Push local db.json cache into Supabase
async function exportToSupabase() {
  if (!supabase) throw new Error('Supabase is not configured yet.');
  const status = await checkSupabaseStatus();
  if (status.missingTables.length > 0) {
    throw new Error(`Database tables [${status.missingTables.join(', ')}] do not exist in your Supabase project. Make sure you run the SQL schema in your SQL Editor first.`);
  }

  const db = loadDB();

  // Users
  if (db.users && db.users.length > 0) {
    const { error } = await supabase.from('users').upsert(db.users);
    if (error) throw new Error(`Users sync error: ${error.message}`);
  }
  // Products
  if (db.products && db.products.length > 0) {
    const { error } = await supabase.from('products').upsert(db.products);
    if (error) throw new Error(`Products sync error: ${error.message}`);
  }
  // Customers
  if (db.customers && db.customers.length > 0) {
    const { error } = await supabase.from('customers').upsert(db.customers);
    if (error) throw new Error(`Customers sync error: ${error.message}`);
  }
  // Suppliers
  if (db.suppliers && db.suppliers.length > 0) {
    const { error } = await supabase.from('suppliers').upsert(db.suppliers);
    if (error) throw new Error(`Suppliers sync error: ${error.message}`);
  }
  // Purchases
  if (db.purchases && db.purchases.length > 0) {
    const { error } = await supabase.from('purchases').upsert(db.purchases);
    if (error) throw new Error(`Purchases sync error: ${error.message}`);
  }
  // Sales
  if (db.sales && db.sales.length > 0) {
    const { error } = await supabase.from('sales').upsert(db.sales);
    if (error) throw new Error(`Sales sync error: ${error.message}`);
  }

  supabaseStatus = { ...status, connected: true };
  return { message: 'All local records successfully synced to Supabase!' };
}

// Real-time background sync wrappers
function mirrorUpsertBackground(table: string, records: any | any[]) {
  if (!supabase || !supabaseStatus.connected || supabaseStatus.missingTables.includes(table)) return;
  const items = Array.isArray(records) ? records : [records];
  supabase.from(table).upsert(items).then(({ error }) => {
    if (error) {
      console.error(`[Supabase Background Sync] Failed to upsert on table "${table}":`, error.message);
    }
  });
}

function mirrorDeleteBackground(table: string, id: string) {
  if (!supabase || !supabaseStatus.connected || supabaseStatus.missingTables.includes(table)) return;
  supabase.from(table).delete().eq('id', id).then(({ error }) => {
    if (error) {
      console.error(`[Supabase Background Sync] Failed to delete from table "${table}" where id "${id}":`, error.message);
    }
  });
}

// Trigger initial migration or import
setTimeout(() => {
  importFromSupabase();
}, 2000);

// Safe Database File I/O
function loadDB(): LocalDB {
  try {
    const rawData = fs.readFileSync(DB_PATH, 'utf-8');
    const db = JSON.parse(rawData);
    return {
      users: Array.isArray(db?.users) ? db.users : [],
      products: Array.isArray(db?.products) ? db.products : [],
      customers: Array.isArray(db?.customers) ? db.customers : [],
      suppliers: Array.isArray(db?.suppliers) ? db.suppliers : [],
      purchases: Array.isArray(db?.purchases) ? db.purchases : [],
      sales: Array.isArray(db?.sales) ? db.sales : []
    };
  } catch (error) {
    console.error('Error reading DB:', error);
    return { users: [], products: [], customers: [], suppliers: [], purchases: [], sales: [] };
  }
}

function saveDB(data: LocalDB) {
  try {
    const serialized = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_PATH, serialized, { encoding: 'utf-8', mode: 0o666 });
  } catch (error) {
    console.error('Error saving DB:', error);
  }
}

// Session Auth Middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No session token found.' });
  }

  const userId = authHeader.split(' ')[1];
  const db = loadDB();
  const user = db.users.find(u => u.id === userId);

  if (!user) {
    return res.status(401).json({ error: 'User session invalid. Please log in again.' });
  }

  req.user = user;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Admin privileges required for this action.' });
    }
    next();
  });
}

// Extend Request Type for Express
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// API Routes

//--- Auth Endpoints ---

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password' });
    }

    const db = loadDB();
    if (!db || !db.users) {
      return res.status(500).json({ error: 'Local database is not initialized correctly.' });
    }

    const user = db.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.passwordHash !== password) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate User package (simulate token with user's ID)
    const { passwordHash, ...userResponse } = user;
    res.json({
      token: user.id,
      user: userResponse
    });
  } catch (error: any) {
    console.error('Login routing exception caught:', error);
    res.status(500).json({ error: error.message || 'Internal server error occurred during login authentication.' });
  }
});

// Register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const db = loadDB();
  const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  const newUser = {
    id: 'u-' + Math.random().toString(36).substr(2, 9),
    name,
    email,
    role: (role === 'admin' || role === 'staff') ? role : 'staff', // Protect default role unless user self-claims and we allow
    passwordHash: password,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDB(db);
  mirrorUpsertBackground('users', newUser);

  const { passwordHash, ...userResponse } = newUser;
  res.status(210).json(userResponse); // Standard success
});

// Get self info
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// Get all users (Admin only)
app.get('/api/auth/users', requireAdmin, (req, res) => {
  const db = loadDB();
  const usersResponse = db.users.map(({ passwordHash, ...u }) => u);
  res.json(usersResponse);
});

// Update User Role (Admin only)
app.put('/api/auth/users/:id/role', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (role !== 'admin' && role !== 'staff') {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const db = loadDB();
  const userIdx = db.users.findIndex(u => u.id === id);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.users[userIdx].role = role;
  saveDB(db);
  mirrorUpsertBackground('users', db.users[userIdx]);

  const { passwordHash, ...userResponse } = db.users[userIdx];
  res.json(userResponse);
});

// Delete User (Admin only)
app.delete('/api/auth/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  const userIndex = db.users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent self-deletion of final admin
  const toDelete = db.users[userIndex];
  if (toDelete.id === req.user?.id) {
    return res.status(400).json({ error: 'Cannot delete your own active admin account.' });
  }

  db.users.splice(userIndex, 1);
  saveDB(db);
  mirrorDeleteBackground('users', id);
  res.json({ message: 'User deleted successfully' });
});


//--- Products (Inventory) CRUD ---

app.get('/api/products', requireAuth, (req, res) => {
  const db = loadDB();
  res.json(db.products);
});

app.post('/api/products', requireAuth, (req, res) => {
  const { name, sku, category, purchasePrice, sellingPrice, gstPercent, stockQuantity, unit } = req.body;
  if (!name || !sku || purchasePrice === undefined || sellingPrice === undefined || gstPercent === undefined || stockQuantity === undefined || !unit) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const db = loadDB();
  if (db.products.some(p => p.sku.toLowerCase() === sku.toLowerCase())) {
    return res.status(400).json({ error: `Product with SKU ${sku} already exists` });
  }

  const newProduct: Product = {
    id: 'p-' + Math.random().toString(36).substr(2, 9),
    name,
    sku,
    category: category || 'Default',
    purchasePrice: Number(purchasePrice),
    sellingPrice: Number(sellingPrice),
    gstPercent: Number(gstPercent),
    stockQuantity: Number(stockQuantity),
    unit,
    createdAt: new Date().toISOString()
  };

  db.products.push(newProduct);
  saveDB(db);
  mirrorUpsertBackground('products', newProduct);
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { name, sku, category, purchasePrice, sellingPrice, gstPercent, stockQuantity, unit } = req.body;

  const db = loadDB();
  const productIndex = db.products.findIndex(p => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // SKU unique validation
  if (sku && db.products.some(p => p.id !== id && p.sku.toLowerCase() === sku.toLowerCase())) {
    return res.status(400).json({ error: `Sku ${sku} is already assigned to another product.` });
  }

  db.products[productIndex] = {
    ...db.products[productIndex],
    name: name !== undefined ? name : db.products[productIndex].name,
    sku: sku !== undefined ? sku : db.products[productIndex].sku,
    category: category !== undefined ? category : db.products[productIndex].category,
    purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : db.products[productIndex].purchasePrice,
    sellingPrice: sellingPrice !== undefined ? Number(sellingPrice) : db.products[productIndex].sellingPrice,
    gstPercent: gstPercent !== undefined ? Number(gstPercent) : db.products[productIndex].gstPercent,
    stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : db.products[productIndex].stockQuantity,
    unit: unit !== undefined ? unit : db.products[productIndex].unit
  };

  saveDB(db);
  mirrorUpsertBackground('products', db.products[productIndex]);
  res.json(db.products[productIndex]);
});

app.delete('/api/products/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  const productIdx = db.products.findIndex(p => p.id === id);
  if (productIdx === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  db.products.splice(productIdx, 1);
  saveDB(db);
  mirrorDeleteBackground('products', id);
  res.json({ message: 'Product deleted' });
});


//--- Customers CRUD ---

app.get('/api/customers', requireAuth, (req, res) => {
  const db = loadDB();
  res.json(db.customers);
});

app.post('/api/customers', requireAuth, (req, res) => {
  const { name, phone, email, address, gstNo } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and Phone are required' });
  }

  const db = loadDB();
  const newCustomer: Customer = {
    id: 'c-' + Math.random().toString(36).substr(2, 9),
    name,
    phone,
    email: email || '',
    address: address || '',
    gstNo: gstNo || '',
    createdAt: new Date().toISOString()
  };

  db.customers.push(newCustomer);
  saveDB(db);
  mirrorUpsertBackground('customers', newCustomer);
  res.status(201).json(newCustomer);
});

app.put('/api/customers/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address, gstNo } = req.body;

  const db = loadDB();
  const index = db.customers.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  db.customers[index] = {
    ...db.customers[index],
    name: name !== undefined ? name : db.customers[index].name,
    phone: phone !== undefined ? phone : db.customers[index].phone,
    email: email !== undefined ? email : db.customers[index].email,
    address: address !== undefined ? address : db.customers[index].address,
    gstNo: gstNo !== undefined ? gstNo : db.customers[index].gstNo
  };

  saveDB(db);
  mirrorUpsertBackground('customers', db.customers[index]);
  res.json(db.customers[index]);
});

app.delete('/api/customers/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  const idx = db.customers.findIndex(c => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  db.customers.splice(idx, 1);
  saveDB(db);
  mirrorDeleteBackground('customers', id);
  res.json({ message: 'Customer deleted successfully' });
});


//--- Suppliers CRUD ---

app.get('/api/suppliers', requireAuth, (req, res) => {
  const db = loadDB();
  res.json(db.suppliers);
});

app.post('/api/suppliers', requireAuth, (req, res) => {
  const { name, phone, address, gstNo } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and Phone are required' });
  }

  const db = loadDB();
  const newSupplier: Supplier = {
    id: 's-' + Math.random().toString(36).substr(2, 9),
    name,
    phone,
    address: address || '',
    gstNo: gstNo || '',
    createdAt: new Date().toISOString()
  };

  db.suppliers.push(newSupplier);
  saveDB(db);
  mirrorUpsertBackground('suppliers', newSupplier);
  res.status(201).json(newSupplier);
});

app.put('/api/suppliers/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { name, phone, address, gstNo } = req.body;

  const db = loadDB();
  const index = db.suppliers.findIndex(s => s.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Supplier not found' });
  }

  db.suppliers[index] = {
    ...db.suppliers[index],
    name: name !== undefined ? name : db.suppliers[index].name,
    phone: phone !== undefined ? phone : db.suppliers[index].phone,
    address: address !== undefined ? address : db.suppliers[index].address,
    gstNo: gstNo !== undefined ? gstNo : db.suppliers[index].gstNo
  };

  saveDB(db);
  mirrorUpsertBackground('suppliers', db.suppliers[index]);
  res.json(db.suppliers[index]);
});

app.delete('/api/suppliers/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  const idx = db.suppliers.findIndex(s => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Supplier not found' });
  }

  db.suppliers.splice(idx, 1);
  saveDB(db);
  mirrorDeleteBackground('suppliers', id);
  res.json({ message: 'Supplier deleted successfully' });
});


//--- Purchases Management (Restricted / Modifies Stocks) ---

app.get('/api/purchases', requireAuth, (req, res) => {
  const db = loadDB();
  res.json(db.purchases);
});

app.post('/api/purchases', requireAuth, (req, res) => {
  const { supplierId, date, invoiceNo, items } = req.body;
  if (!supplierId || !date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Supplier, date, and items are required' });
  }

  const db = loadDB();
  const supplier = db.suppliers.find(s => s.id === supplierId);
  if (!supplier) {
    return res.status(404).json({ error: 'Selected supplier was not found' });
  }

  let calculatedTotal = 0;
  const purchaseItemsFormatted = [];

  // Verify and update stocks
  for (const item of items) {
    const { productId, quantity, rate } = item;
    if (!productId || !quantity || !rate) {
      return res.status(400).json({ error: 'Each item must have a product, quantity, and rate' });
    }

    const prod = db.products.find(p => p.id === productId);
    if (!prod) {
      return res.status(404).json({ error: `Product with ID ${productId} not found` });
    }

    const itemTotal = Number(quantity) * Number(rate);
    calculatedTotal += itemTotal;

    // Increase stock!
    prod.stockQuantity = Number(prod.stockQuantity) + Number(quantity);

    purchaseItemsFormatted.push({
      productId,
      productName: prod.name,
      quantity: Number(quantity),
      rate: Number(rate),
      amount: itemTotal
    });
  }

  const newPurchase: Purchase = {
    id: 'pur-' + Math.random().toString(36).substr(2, 9),
    supplierId,
    supplierName: supplier.name,
    date,
    invoiceNo: invoiceNo || `PUR-${Math.floor(1000 + Math.random() * 9000)}`,
    totalAmount: calculatedTotal,
    items: purchaseItemsFormatted,
    createdAt: new Date().toISOString()
  };

  db.purchases.push(newPurchase);
  saveDB(db);
  mirrorUpsertBackground('purchases', newPurchase);
  for (const item of items) {
    const prod = db.products.find(p => p.id === item.productId);
    if (prod) {
      mirrorUpsertBackground('products', prod);
    }
  }
  res.status(201).json(newPurchase);
});

app.delete('/api/purchases/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  const purchaseIndex = db.purchases.findIndex(p => p.id === id);
  if (purchaseIndex === -1) {
    return res.status(404).json({ error: 'Purchase record not found' });
  }

  const purchase = db.purchases[purchaseIndex];

  // Rollback stock increases!
  for (const item of purchase.items) {
    const prod = db.products.find(p => p.id === item.productId);
    if (prod) {
      prod.stockQuantity = Math.max(0, Number(prod.stockQuantity) - Number(item.quantity));
    }
  }

  db.purchases.splice(purchaseIndex, 1);
  saveDB(db);
  mirrorDeleteBackground('purchases', id);
  for (const item of purchase.items) {
    const prod = db.products.find(p => p.id === item.productId);
    if (prod) {
      mirrorUpsertBackground('products', prod);
    }
  }
  res.json({ message: 'Purchase record deleted and stocks rolled back successfully' });
});


//--- Sales Management (Deducts Stocks / Invoices with GST) ---

app.get('/api/sales', requireAuth, (req, res) => {
  const db = loadDB();
  res.json(db.sales);
});

app.post('/api/sales', requireAuth, (req, res) => {
  const { customerId, date, items, discountTotal = 0 } = req.body;
  if (!customerId || !date || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Customer, date, and items are required' });
  }

  const db = loadDB();
  const customer = db.customers.find(c => c.id === customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  let subtotal = 0;
  let gstTotal = 0;
  const salesItemsFormatted = [];

  // Stock check first to ensure transaction safety (All-or-nothing stock update)
  for (const item of items) {
    const { productId, quantity } = item;
    const prod = db.products.find(p => p.id === productId);
    if (!prod) {
      return res.status(404).json({ error: `Product ID ${productId} not found` });
    }
    if (Number(prod.stockQuantity) < Number(quantity)) {
      return res.status(400).json({ 
        error: `Insufficient stock for product "${prod.name}". Available: ${prod.stockQuantity} ${prod.unit}, Requested: ${quantity}` 
      });
    }
  }

  // Stock decreases and computations
  for (const item of items) {
    const { productId, quantity, rate, discountPercent = 0 } = item;
    const prod = db.products.find(p => p.id === productId)!;

    const qty = Number(quantity);
    const price = Number(rate || prod.sellingPrice);
    const discPct = Number(discountPercent);
    const gstPct = Number(prod.gstPercent);

    // Calculation: Base = Quantity * Price
    const baseAmount = qty * price;
    const discountAmt = baseAmount * (discPct / 100);
    const taxableAmount = baseAmount - discountAmt;
    const itemGst = taxableAmount * (gstPct / 100);
    const totalItemAmount = taxableAmount + itemGst;

    subtotal += baseAmount;
    gstTotal += itemGst;

    // Deduct stock!
    prod.stockQuantity = Number(prod.stockQuantity) - qty;

    salesItemsFormatted.push({
      productId,
      productName: prod.name,
      quantity: qty,
      rate: price,
      gstPercent: gstPct,
      discountPercent: discPct,
      amount: Number(totalItemAmount.toFixed(2))
    });
  }

  // Invoice numbering system (INV-0001, etc.)
  let nextInvSeq = 1;
  if (db.sales.length > 0) {
    const invNumbers = db.sales
      .map(s => {
        const parts = s.invoiceNo.split('-');
        return parts.length > 1 ? parseInt(parts[1], 10) : 0;
      })
      .filter(num => !isNaN(num));
    if (invNumbers.length > 0) {
      nextInvSeq = Math.max(...invNumbers) + 1;
    }
  }
  const formattedInvoiceNo = `INV-${String(nextInvSeq).padStart(4, '0')}`;

  const discTotal = Number(discountTotal);
  const grandTotal = subtotal - discTotal + gstTotal;

  const newSale: Sale = {
    id: 'sale-' + Math.random().toString(36).substr(2, 9),
    customerId,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: customer.email,
    customerAddress: customer.address,
    customerGstNo: customer.gstNo,
    date,
    invoiceNo: formattedInvoiceNo,
    subtotal: Number(subtotal.toFixed(2)),
    discountTotal: Number(discTotal.toFixed(2)),
    gstTotal: Number(gstTotal.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
    items: salesItemsFormatted,
    createdAt: new Date().toISOString()
  };

  db.sales.push(newSale);
  saveDB(db);
  mirrorUpsertBackground('sales', newSale);
  for (const item of items) {
    const prod = db.products.find(p => p.id === item.productId);
    if (prod) {
      mirrorUpsertBackground('products', prod);
    }
  }
  res.status(201).json(newSale);
});

app.delete('/api/sales/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  const saleIdx = db.sales.findIndex(s => s.id === id);
  if (saleIdx === -1) {
    return res.status(404).json({ error: 'Sale record not found' });
  }

  const sale = db.sales[saleIdx];

  // Restock items!
  for (const item of sale.items) {
    const prod = db.products.find(p => p.id === item.productId);
    if (prod) {
      prod.stockQuantity = Number(prod.stockQuantity) + Number(item.quantity);
    }
  }

  db.sales.splice(saleIdx, 1);
  saveDB(db);
  mirrorDeleteBackground('sales', id);
  for (const item of sale.items) {
    const prod = db.products.find(p => p.id === item.productId);
    if (prod) {
      mirrorUpsertBackground('products', prod);
    }
  }
  res.json({ message: 'Sale deleted and inventory quantities restored successfully.' });
});


//--- Dashboard Stats Endpoint ---

app.get('/api/dashboard/stats', requireAuth, (req, res) => {
  const db = loadDB();
  const sales = db.sales;
  const purchases = db.purchases;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Helpers to test if a ISO/date string match month/year
  const inCurrentMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  const isToday = (dateStr: string) => {
    return dateStr.includes(todayStr); // Simple check
  };

  let salesToday = 0;
  let salesThisMonth = 0;
  let totalRevenue = 0;

  sales.forEach(s => {
    totalRevenue += s.grandTotal;
    if (s.date === todayStr || isToday(s.createdAt)) {
      salesToday += s.grandTotal;
    }
    if (inCurrentMonth(s.date) || inCurrentMonth(s.createdAt)) {
      salesThisMonth += s.grandTotal;
    }
  });

  let purchasesToday = 0;
  let purchasesThisMonth = 0;

  purchases.forEach(p => {
    if (p.date === todayStr || isToday(p.createdAt)) {
      purchasesToday += p.totalAmount;
    }
    if (inCurrentMonth(p.date) || inCurrentMonth(p.createdAt)) {
      purchasesThisMonth += p.totalAmount;
    }
  });

  const lowStockProducts = db.products.filter(p => p.stockQuantity < 10);
  const lowStockCount = lowStockProducts.length;

  // Build top 7 transactions
  const combinedTransactions: any[] = [];
  sales.forEach(s => {
    combinedTransactions.push({
      id: s.id,
      type: 'sale',
      partyName: s.customerName,
      amount: s.grandTotal,
      date: s.date,
      invoiceNo: s.invoiceNo,
      timestamp: new Date(s.createdAt).getTime()
    });
  });

  purchases.forEach(p => {
    combinedTransactions.push({
      id: p.id,
      type: 'purchase',
      partyName: p.supplierName,
      amount: p.totalAmount,
      date: p.date,
      invoiceNo: p.invoiceNo,
      timestamp: new Date(p.createdAt).getTime()
    });
  });

  // Sort by date newest first
  combinedTransactions.sort((a, b) => b.timestamp - a.timestamp);
  const recentTransactions = combinedTransactions.slice(0, 8).map(({ timestamp, ...rest }) => rest);

  const stats: DashboardStats = {
    salesToday,
    salesThisMonth,
    purchasesToday,
    purchasesThisMonth,
    totalRevenue,
    lowStockCount,
    recentTransactions,
    lowStockProducts
  };

  res.json(stats);
});


//--- Supabase Setup Endpoints ---

// Check connection status & tables existence + fetch SQL migration schema
app.get('/api/supabase/status', requireAuth, async (req, res) => {
  try {
    const status = await checkSupabaseStatus();
    supabaseStatus = status;
    
    // Disable any potential caching on CDN, Vercel, or browser layers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.json({
      ...status,
      schema: SUPABASE_SQL_SCHEMA
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check Supabase status' });
  }
});

// Sync/Export all local database records to Supabase tables
app.post('/api/supabase/sync', requireAuth, async (req, res) => {
  try {
    const result = await exportToSupabase();
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Migration sync failed.' });
  }
});


// Vite middleware for integrated frontend development
const setupVite = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
};

if (!process.env.VERCEL) {
  setupVite().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Inventory Management System server live at http://localhost:${PORT}`);
    });
  });
}

export default app;
