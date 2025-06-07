import { supabase, handleSupabaseError } from '../lib/supabase'
import { Sale, StockItem, StockMovement } from '../types'

// Sales operations
export const getSalesFromSupabase = async (): Promise<Sale[]> => {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false })

    if (error) throw error

    return data.map(row => ({
      id: row.id,
      date: row.date,
      clientName: row.client_name,
      productName: row.product_name,
      quantity: row.quantity,
      unitPrice: row.unit_price,
      totalAmount: row.total_amount,
      paymentMethod: row.payment_method,
      notes: row.notes,
      seller: row.seller,
      register: row.register,
      category: row.category,
    }))
  } catch (error) {
    console.error('Error fetching sales:', error)
    throw new Error(handleSupabaseError(error))
  }
}

export const addSaleToSupabase = async (sale: Sale): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('sales')
      .insert({
        id: sale.id,
        date: sale.date,
        client_name: sale.clientName,
        product_name: sale.productName,
        quantity: sale.quantity,
        unit_price: sale.unitPrice,
        total_amount: sale.totalAmount,
        payment_method: sale.paymentMethod,
        notes: sale.notes,
        seller: sale.seller,
        register: sale.register,
        category: sale.category,
        user_id: user.id,
      })

    if (error) throw error
  } catch (error) {
    console.error('Error adding sale:', error)
    throw new Error(handleSupabaseError(error))
  }
}

export const updateSaleInSupabase = async (sale: Sale): Promise<void> => {
  try {
    const { error } = await supabase
      .from('sales')
      .update({
        date: sale.date,
        client_name: sale.clientName,
        product_name: sale.productName,
        quantity: sale.quantity,
        unit_price: sale.unitPrice,
        total_amount: sale.totalAmount,
        payment_method: sale.paymentMethod,
        notes: sale.notes,
        seller: sale.seller,
        register: sale.register,
        category: sale.category,
      })
      .eq('id', sale.id)

    if (error) throw error
  } catch (error) {
    console.error('Error updating sale:', error)
    throw new Error(handleSupabaseError(error))
  }
}

export const deleteSaleFromSupabase = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting sale:', error)
    throw new Error(handleSupabaseError(error))
  }
}

// Stock operations
export const getStockFromSupabase = async (): Promise<StockItem[]> => {
  try {
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .order('name')

    if (error) throw error

    return data.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      subcategory: row.subcategory,
      currentStock: row.current_stock,
      alertThreshold: row.alert_threshold,
      initialStock: row.initial_stock,
      unitPrice: row.unit_price,
    }))
  } catch (error) {
    console.error('Error fetching stock:', error)
    throw new Error(handleSupabaseError(error))
  }
}

export const addStockItemToSupabase = async (item: StockItem): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('stock_items')
      .insert({
        id: item.id,
        name: item.name,
        category: item.category,
        subcategory: item.subcategory,
        current_stock: item.currentStock,
        alert_threshold: item.alertThreshold,
        initial_stock: item.initialStock,
        unit_price: item.unitPrice,
        user_id: user.id,
      })

    if (error) throw error
  } catch (error) {
    console.error('Error adding stock item:', error)
    throw new Error(handleSupabaseError(error))
  }
}

export const updateStockItemInSupabase = async (item: StockItem): Promise<void> => {
  try {
    const { error } = await supabase
      .from('stock_items')
      .update({
        name: item.name,
        category: item.category,
        subcategory: item.subcategory,
        current_stock: item.currentStock,
        alert_threshold: item.alertThreshold,
        initial_stock: item.initialStock,
        unit_price: item.unitPrice,
      })
      .eq('id', item.id)

    if (error) throw error
  } catch (error) {
    console.error('Error updating stock item:', error)
    throw new Error(handleSupabaseError(error))
  }
}

export const deleteStockItemFromSupabase = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('stock_items')
      .delete()
      .eq('id', id)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting stock item:', error)
    throw new Error(handleSupabaseError(error))
  }
}

// Stock movements operations
export const getStockMovementsFromSupabase = async (): Promise<StockMovement[]> => {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .order('date', { ascending: false })

    if (error) throw error

    return data.map(row => ({
      id: row.id,
      date: row.date,
      productId: row.product_id,
      type: row.type,
      quantity: row.quantity,
      reason: row.reason,
      register: row.register,
      seller: row.seller,
    }))
  } catch (error) {
    console.error('Error fetching stock movements:', error)
    throw new Error(handleSupabaseError(error))
  }
}

export const addStockMovementToSupabase = async (movement: StockMovement): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('stock_movements')
      .insert({
        id: movement.id,
        date: movement.date,
        product_id: movement.productId,
        type: movement.type,
        quantity: movement.quantity,
        reason: movement.reason,
        register: movement.register,
        seller: movement.seller,
        user_id: user.id,
      })

    if (error) throw error
  } catch (error) {
    console.error('Error adding stock movement:', error)
    throw new Error(handleSupabaseError(error))
  }
}

// Batch operations for imports
export const addMultipleSalesToSupabase = async (sales: Sale[]): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const salesData = sales.map(sale => ({
      id: sale.id,
      date: sale.date,
      client_name: sale.clientName,
      product_name: sale.productName,
      quantity: sale.quantity,
      unit_price: sale.unitPrice,
      total_amount: sale.totalAmount,
      payment_method: sale.paymentMethod,
      notes: sale.notes,
      seller: sale.seller,
      register: sale.register,
      category: sale.category,
      user_id: user.id,
    }))

    const { error } = await supabase
      .from('sales')
      .insert(salesData)

    if (error) throw error
  } catch (error) {
    console.error('Error adding multiple sales:', error)
    throw new Error(handleSupabaseError(error))
  }
}

export const addMultipleStockItemsToSupabase = async (items: StockItem[]): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const stockData = items.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      current_stock: item.currentStock,
      alert_threshold: item.alertThreshold,
      initial_stock: item.initialStock,
      unit_price: item.unitPrice,
      user_id: user.id,
    }))

    const { error } = await supabase
      .from('stock_items')
      .insert(stockData)

    if (error) throw error
  } catch (error) {
    console.error('Error adding multiple stock items:', error)
    throw new Error(handleSupabaseError(error))
  }
}

// Migration helper to move localStorage data to Supabase
export const migrateLocalStorageToSupabase = async (): Promise<void> => {
  try {
    // Get data from localStorage
    const salesData = localStorage.getItem('suiviventes-data')
    const stockData = localStorage.getItem('suiviventes-stock')
    const movementsData = localStorage.getItem('suiviventes-stock-movements')

    if (salesData) {
      const sales: Sale[] = JSON.parse(salesData)
      if (sales.length > 0) {
        await addMultipleSalesToSupabase(sales)
        console.log(`Migrated ${sales.length} sales to Supabase`)
      }
    }

    if (stockData) {
      const stock: StockItem[] = JSON.parse(stockData)
      if (stock.length > 0) {
        await addMultipleStockItemsToSupabase(stock)
        console.log(`Migrated ${stock.length} stock items to Supabase`)
      }
    }

    if (movementsData) {
      const movements: StockMovement[] = JSON.parse(movementsData)
      if (movements.length > 0) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const movementsWithUserId = movements.map(movement => ({
          id: movement.id,
          date: movement.date,
          product_id: movement.productId,
          type: movement.type,
          quantity: movement.quantity,
          reason: movement.reason,
          register: movement.register,
          seller: movement.seller,
          user_id: user.id,
        }))

        const { error } = await supabase
          .from('stock_movements')
          .insert(movementsWithUserId)

        if (error) throw error
        console.log(`Migrated ${movements.length} stock movements to Supabase`)
      }
    }
  } catch (error) {
    console.error('Error migrating data:', error)
    throw new Error(handleSupabaseError(error))
  }
}
/**
 * Importe un lot de ventes dans Supabase.
 * @param {Sale[]} sales - Liste de ventes à importer.
 * @returns {Promise<void>}
 */
export const importSalesToSupabase = async (sales: Sale[]): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const salesData = sales.map(sale => ({
      id: sale.id,
      date: sale.date,
      client_name: sale.clientName,
      product_name: sale.productName,
      quantity: sale.quantity,
      unit_price: sale.unitPrice,
      total_amount: sale.totalAmount,
      payment_method: sale.paymentMethod,
      notes: sale.notes,
      seller: sale.seller,
      register: sale.register,
      category: sale.category,
      user_id: user.id,
    }));

    const { error } = await supabase.from('sales').insert(salesData);

    if (error) throw error;
    // Log optionnel :
    console.log(`Import de ${sales.length} ventes terminé`);
  } catch (error) {
    console.error('Erreur lors de l\'import des ventes :', error);
    throw new Error(handleSupabaseError(error));
  }
};
