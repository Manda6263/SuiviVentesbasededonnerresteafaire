import { Sale, StockItem, StockMovement } from '../types';
import { 
  getSalesFromSupabase, 
  addSaleToSupabase, 
  updateSaleInSupabase, 
  deleteSaleFromSupabase,
  getStockFromSupabase,
  addStockItemToSupabase,
  updateStockItemInSupabase,
  deleteStockItemFromSupabase,
  getStockMovementsFromSupabase,
  addStockMovementToSupabase,
  addMultipleSalesToSupabase,
  migrateLocalStorageToSupabase
} from './supabaseStorage';
import { isAuthenticated } from '../lib/supabase';

const STORAGE_KEY = 'suiviventes-data';
const STOCK_KEY = 'suiviventes-stock';
const STOCK_MOVEMENTS_KEY = 'suiviventes-stock-movements';
const READ_ONLY_KEY = 'suiviventes-readonly';
const MIGRATION_KEY = 'suiviventes-migrated';

// Check if we should use Supabase or localStorage
const shouldUseSupabase = async (): Promise<boolean> => {
  try {
    return await isAuthenticated();
  } catch {
    return false;
  }
};

// Sales operations
export const getSales = async (): Promise<Sale[]> => {
  try {
    if (await shouldUseSupabase()) {
      return await getSalesFromSupabase();
    }
  } catch (error) {
    console.warn('Failed to fetch from Supabase, falling back to localStorage:', error);
  }
  
  // Fallback to localStorage
  const storedData = localStorage.getItem(STORAGE_KEY);
  if (!storedData) return [];
  
  try {
    return JSON.parse(storedData);
  } catch (error) {
    console.error('Error parsing stored sales data:', error);
    return [];
  }
};

export const saveSales = async (sales: Sale[]): Promise<void> => {
  if (isReadOnlyMode()) {
    throw new Error('Application en mode lecture seule');
  }
  
  try {
    if (await shouldUseSupabase()) {
      // For batch operations, we'll handle this differently
      // This function is mainly used for localStorage compatibility
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
      return;
    }
  } catch (error) {
    console.warn('Failed to save to Supabase, falling back to localStorage:', error);
  }
  
  // Fallback to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
  } catch (error) {
    console.error('Error saving sales data:', error);
  }
};

export const addSale = async (sale: Sale): Promise<void> => {
  if (isReadOnlyMode()) {
    throw new Error('Application en mode lecture seule');
  }

  try {
    if (await shouldUseSupabase()) {
      await addSaleToSupabase(sale);
      return;
    }
  } catch (error) {
    console.warn('Failed to add sale to Supabase, falling back to localStorage:', error);
  }

  // Fallback to localStorage
  const sales = await getSales();
  await saveSales([...sales, sale]);
  
  // Update stock when sale is added
  await updateStockFromSale(sale);
};

export const updateSale = async (updatedSale: Sale): Promise<void> => {
  if (isReadOnlyMode()) {
    throw new Error('Application en mode lecture seule');
  }

  try {
    if (await shouldUseSupabase()) {
      await updateSaleInSupabase(updatedSale);
      return;
    }
  } catch (error) {
    console.warn('Failed to update sale in Supabase, falling back to localStorage:', error);
  }

  // Fallback to localStorage
  const sales = await getSales();
  const updatedSales = sales.map(sale => 
    sale.id === updatedSale.id ? updatedSale : sale
  );
  await saveSales(updatedSales);
};

export const deleteSale = async (id: string): Promise<void> => {
  if (isReadOnlyMode()) {
    throw new Error('Application en mode lecture seule');
  }

  try {
    if (await shouldUseSupabase()) {
      await deleteSaleFromSupabase(id);
      return;
    }
  } catch (error) {
    console.warn('Failed to delete sale from Supabase, falling back to localStorage:', error);
  }

  // Fallback to localStorage
  const sales = await getSales();
  const filteredSales = sales.filter(sale => sale.id !== id);
  await saveSales(filteredSales);
};

// Stock management
export const getStock = async (): Promise<StockItem[]> => {
  try {
    if (await shouldUseSupabase()) {
      return await getStockFromSupabase();
    }
  } catch (error) {
    console.warn('Failed to fetch stock from Supabase, falling back to localStorage:', error);
  }
  
  // Fallback to localStorage
  const storedData = localStorage.getItem(STOCK_KEY);
  if (!storedData) return [];
  
  try {
    return JSON.parse(storedData);
  } catch (error) {
    console.error('Error parsing stored stock data:', error);
    return [];
  }
};

export const saveStock = async (stock: StockItem[]): Promise<void> => {
  if (isReadOnlyMode()) {
    throw new Error('Application en mode lecture seule');
  }

  try {
    if (await shouldUseSupabase()) {
      // For batch operations, we'll handle this differently
      localStorage.setItem(STOCK_KEY, JSON.stringify(stock));
      return;
    }
  } catch (error) {
    console.warn('Failed to save stock to Supabase, falling back to localStorage:', error);
  }

  // Fallback to localStorage
  try {
    localStorage.setItem(STOCK_KEY, JSON.stringify(stock));
  } catch (error) {
    console.error('Error saving stock data:', error);
  }
};

export const addStockItem = async (item: StockItem): Promise<void> => {
  if (isReadOnlyMode()) {
    throw new Error('Application en mode lecture seule');
  }

  try {
    if (await shouldUseSupabase()) {
      await addStockItemToSupabase(item);
      return;
    }
  } catch (error) {
    console.warn('Failed to add stock item to Supabase, falling back to localStorage:', error);
  }

  // Fallback to localStorage
  const stock = await getStock();
  await saveStock([...stock, item]);
};

export const updateStockItem = async (updatedItem: StockItem): Promise<void> => {
  if (isReadOnlyMode()) {
    throw new Error('Application en mode lecture seule');
  }

  try {
    if (await shouldUseSupabase()) {
      await updateStockItemInSupabase(updatedItem);
      return;
    }
  } catch (error) {
    console.warn('Failed to update stock item in Supabase, falling back to localStorage:', error);
  }

  // Fallback to localStorage
  const stock = await getStock();
  const updatedStock = stock.map(item => 
    item.id === updatedItem.id ? updatedItem : item
  );
  await saveStock(updatedStock);
};

export const deleteStockItem = async (id: string): Promise<void> => {
  if (isReadOnlyMode()) {
    throw new Error('Application en mode lecture seule');
  }

  try {
    if (await shouldUseSupabase()) {
      await deleteStockItemFromSupabase(id);
      return;
    }
  } catch (error) {
    console.warn('Failed to delete stock item from Supabase, falling back to localStorage:', error);
  }

  // Fallback to localStorage
  const stock = await getStock();
  const filteredStock = stock.filter(item => item.id !== id);
  await saveStock(filteredStock);
};

// Stock movements
export const getStockMovements = async (): Promise<StockMovement[]> => {
  try {
    if (await shouldUseSupabase()) {
      return await getStockMovementsFromSupabase();
    }
  } catch (error) {
    console.warn('Failed to fetch stock movements from Supabase, falling back to localStorage:', error);
  }
  
  // Fallback to localStorage
  const storedData = localStorage.getItem(STOCK_MOVEMENTS_KEY);
  if (!storedData) return [];
  
  try {
    return JSON.parse(storedData);
  } catch (error) {
    console.error('Error parsing stored stock movements:', error);
    return [];
  }
};

export const addStockMovement = async (movement: StockMovement): Promise<void> => {
  if (isReadOnlyMode()) {
    throw new Error('Application en mode lecture seule');
  }

  try {
    if (await shouldUseSupabase()) {
      await addStockMovementToSupabase(movement);
      return;
    }
  } catch (error) {
    console.warn('Failed to add stock movement to Supabase, falling back to localStorage:', error);
  }

  // Fallback to localStorage
  const movements = await getStockMovements();
  try {
    localStorage.setItem(STOCK_MOVEMENTS_KEY, JSON.stringify([...movements, movement]));
  } catch (error) {
    console.error('Error saving stock movement:', error);
  }
};

// Function to update stock from a single sale
export const updateStockFromSale = async (sale: Sale): Promise<void> => {
  const stock = await getStock();
  const stockItem = stock.find(item => 
    item.name.toLowerCase() === sale.productName.toLowerCase()
  );
  
  if (stockItem) {
    stockItem.currentStock -= sale.quantity;
    await saveStock(stock);
    
    // Add stock movement
    await addStockMovement({
      id: crypto.randomUUID(),
      date: sale.date,
      productId: stockItem.id,
      type: 'out',
      quantity: sale.quantity,
      reason: `Vente #${sale.id}`,
      register: sale.register,
      seller: sale.seller,
    });
  }
};

// Function to update stock from multiple sales (for imports)
export const updateStockFromSales = async (sales: Sale[]): Promise<void> => {
  if (sales.length === 0) return;
  
  const stock = await getStock();
  const stockUpdates: Record<string, { quantity: number; sales: Sale[] }> = {};
  const movements: StockMovement[] = [];

  // Group sales by product name (case-insensitive)
  sales.forEach(sale => {
    const productKey = sale.productName.toLowerCase();
    if (!stockUpdates[productKey]) {
      stockUpdates[productKey] = { quantity: 0, sales: [] };
    }
    stockUpdates[productKey].quantity += sale.quantity;
    stockUpdates[productKey].sales.push(sale);
  });

  // Update stock and create movements for each product
  for (const [productName, { quantity: totalQuantity, sales: productSales }] of Object.entries(stockUpdates)) {
    const stockItem = stock.find(item => 
      item.name.toLowerCase() === productName
    );
    
    if (stockItem) {
      // Update stock quantity
      stockItem.currentStock -= totalQuantity;
      
      // Create a consolidated movement for this product
      const firstSale = productSales[0];
      movements.push({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        productId: stockItem.id,
        type: 'out',
        quantity: totalQuantity,
        reason: `Import: ${productSales.length} vente(s)`,
        register: firstSale.register,
        seller: firstSale.seller,
      });
    }
  }

  // Save all changes at once
  await saveStock(stock);
  for (const movement of movements) {
    await addStockMovement(movement);
  }
  
  console.log(`Stock updated for ${Object.keys(stockUpdates).length} products from ${sales.length} sales`);
};

// Batch import for Supabase
export const importSalesToSupabase = async (sales: Sale[]): Promise<void> => {
  if (sales.length === 0) return;
  
  try {
    if (await shouldUseSupabase()) {
      await addMultipleSalesToSupabase(sales);
      // Stock will be updated automatically by database triggers
      return;
    }
  } catch (error) {
    console.warn('Failed to import sales to Supabase, falling back to localStorage:', error);
  }

  // Fallback to localStorage
  const existingSales = await getSales();
  await saveSales([...existingSales, ...sales]);
  await updateStockFromSales(sales);
};

// Migration function
export const migrateDataToSupabase = async (): Promise<void> => {
  const migrated = localStorage.getItem(MIGRATION_KEY);
  if (migrated === 'true') {
    console.log('Data already migrated to Supabase');
    return;
  }

  try {
    if (await shouldUseSupabase()) {
      await migrateLocalStorageToSupabase();
      localStorage.setItem(MIGRATION_KEY, 'true');
      console.log('Data migration to Supabase completed');
    }
  } catch (error) {
    console.error('Failed to migrate data to Supabase:', error);
    throw error;
  }
};

// Read-only mode
export const isReadOnlyMode = (): boolean => {
  return localStorage.getItem(READ_ONLY_KEY) === 'true';
};

export const setReadOnlyMode = (enabled: boolean): void => {
  localStorage.setItem(READ_ONLY_KEY, enabled.toString());
};

// Clear all data
export const clearAllData = async (): Promise<void> => {
  if (isReadOnlyMode()) {
    throw new Error('Application en mode lecture seule');
  }

  // Clear localStorage
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STOCK_KEY);
  localStorage.removeItem(STOCK_MOVEMENTS_KEY);
  localStorage.removeItem(MIGRATION_KEY);

  // Note: We don't clear Supabase data here as it would require
  // individual delete operations for each user's data
};

// Sample data generation
const generateSampleStock = (): StockItem[] => {
  return [
    {
      id: '1',
      name: 'Fanta Orange',
      category: 'Boissons',
      subcategory: 'Sodas',
      currentStock: 48,
      alertThreshold: 5,
      initialStock: 100,
      unitPrice: 1.5,
    },
    {
      id: '2',
      name: 'Coca-Cola',
      category: 'Boissons',
      subcategory: 'Sodas',
      currentStock: 77,
      alertThreshold: 5,
      initialStock: 150,
      unitPrice: 1.5,
    },
    {
      id: '3',
      name: 'Sandwich Jambon',
      category: 'Alimentation',
      subcategory: 'Sandwichs',
      currentStock: 35,
      alertThreshold: 5,
      initialStock: 80,
      unitPrice: 3.5,
    },
    {
      id: '4',
      name: 'Eau Minérale',
      category: 'Boissons',
      subcategory: 'Eaux',
      currentStock: 113,
      alertThreshold: 5,
      initialStock: 200,
      unitPrice: 1.0,
    },
  ];
};

// Initialize with sample data if storage is empty
export const initializeStorage = async (): Promise<void> => {
  try {
    const sales = await getSales();
    if (sales.length === 0) {
      await saveSales([]);
    }
    
    const stock = await getStock();
    if (stock.length === 0) {
      await saveStock(generateSampleStock());
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
};