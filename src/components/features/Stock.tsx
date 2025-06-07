import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Search, Filter, Plus, RotateCw, RotateCcw, Edit, Trash2, AlertTriangle, History, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { StockItem, StockMovement, StockFilterOptions } from '../../types';
import { getStock, getStockMovements, saveStock, addStockMovement, addStockItem, updateStockItem, deleteStockItem } from '../../utils/storage';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { useNotification } from '../ui/NotificationContainer';
import { DataContext } from '../../App';
import ProductForm from './ProductForm';
import StockFilters from './StockFilters';

const Stock: React.FC = () => {
  const { showNotification } = useNotification();
  const { refreshData, loading } = useContext(DataContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMovements, setShowMovements] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StockItem | undefined>(undefined);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [filters, setFilters] = useState<StockFilterOptions>({
    productName: '',
    category: '',
    subcategory: '',
    register: '',
    seller: '',
    startDate: '',
    endDate: '',
    minQuantity: '',
    maxQuantity: '',
    minAmount: '',
    maxAmount: '',
    stockStatus: '',
  });

  const loadData = async () => {
    try {
      const [stockData, movementsData] = await Promise.all([
        getStock(),
        getStockMovements()
      ]);
      setStockItems(stockData);
      setMovements(movementsData);
    } catch (error) {
      console.error('Error loading stock data:', error);
      showNotification('error', 'Erreur lors du chargement des données');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter stock items based on search and filters
  const filteredItems = useMemo(() => {
    let filtered = stockItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.subcategory.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply filters
    if (filters.productName) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(filters.productName.toLowerCase())
      );
    }

    if (filters.category) {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    if (filters.subcategory) {
      filtered = filtered.filter(item => item.subcategory === filters.subcategory);
    }

    if (filters.stockStatus) {
      filtered = filtered.filter(item => {
        const isLowStock = item.currentStock <= item.alertThreshold;
        const isHighStock = item.currentStock > item.initialStock * 0.8;
        
        switch (filters.stockStatus) {
          case 'low':
            return isLowStock;
          case 'normal':
            return !isLowStock && !isHighStock;
          case 'high':
            return isHighStock;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [stockItems, searchTerm, filters]);

  // Filter movements based on filters
  const filteredMovements = useMemo(() => {
    let filtered = movements;

    if (filters.startDate) {
      filtered = filtered.filter(movement => movement.date >= filters.startDate);
    }

    if (filters.endDate) {
      filtered = filtered.filter(movement => movement.date <= filters.endDate);
    }

    if (filters.register) {
      filtered = filtered.filter(movement => movement.register === filters.register);
    }

    if (filters.seller) {
      filtered = filtered.filter(movement => movement.seller === filters.seller);
    }

    if (filters.productName) {
      filtered = filtered.filter(movement => {
        const product = stockItems.find(item => item.id === movement.productId);
        return product?.name.toLowerCase().includes(filters.productName.toLowerCase());
      });
    }

    if (filters.minQuantity && !isNaN(parseFloat(filters.minQuantity))) {
      filtered = filtered.filter(movement => movement.quantity >= parseFloat(filters.minQuantity));
    }

    if (filters.maxQuantity && !isNaN(parseFloat(filters.maxQuantity))) {
      filtered = filtered.filter(movement => movement.quantity <= parseFloat(filters.maxQuantity));
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [movements, filters, stockItems]);

  const handleRestock = async (item: StockItem) => {
    const restockQuantity = item.initialStock - item.currentStock;
    if (restockQuantity <= 0) {
      showNotification('warning', 'Le stock est déjà au maximum');
      return;
    }

    try {
      const updatedItem = {
        ...item,
        currentStock: item.initialStock
      };

      await updateStockItem(updatedItem);

      await addStockMovement({
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        productId: item.id,
        type: 'in',
        quantity: restockQuantity,
        reason: 'Réapprovisionnement manuel',
      });

      showNotification('success', 'Stock mis à jour avec succès');
      await loadData();
      await refreshData();
    } catch (error) {
      console.error('Error restocking item:', error);
      showNotification('error', 'Erreur lors du réapprovisionnement');
    }
  };

  const handleRestockAll = async () => {
    const lowStockItems = stockItems.filter(item => item.currentStock < item.alertThreshold);
    
    if (lowStockItems.length === 0) {
      showNotification('info', 'Aucun produit en alerte');
      return;
    }

    try {
      for (const item of lowStockItems) {
        const restockQuantity = item.initialStock - item.currentStock;
        
        const updatedItem = { ...item, currentStock: item.initialStock };
        await updateStockItem(updatedItem);
        
        // Add stock movement
        await addStockMovement({
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          productId: item.id,
          type: 'in',
          quantity: restockQuantity,
          reason: 'Réapprovisionnement automatique',
        });
      }

      showNotification('success', `${lowStockItems.length} produits rechargés`);
      await loadData();
      await refreshData();
    } catch (error) {
      console.error('Error restocking all items:', error);
      showNotification('error', 'Erreur lors du réapprovisionnement');
    }
  };

  const handleResetAll = async () => {
    if (confirm('Voulez-vous vraiment réinitialiser tous les stocks ?')) {
      try {
        for (const item of stockItems) {
          const resetQuantity = item.initialStock - item.currentStock;
          
          if (resetQuantity !== 0) {
            await addStockMovement({
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              productId: item.id,
              type: resetQuantity > 0 ? 'in' : 'out',
              quantity: Math.abs(resetQuantity),
              reason: 'Réinitialisation manuelle',
            });
          }

          const updatedItem = { ...item, currentStock: item.initialStock };
          await updateStockItem(updatedItem);
        }
        
        showNotification('success', 'Tous les stocks ont été réinitialisés');
        await loadData();
        await refreshData();
      } catch (error) {
        console.error('Error resetting all stocks:', error);
        showNotification('error', 'Erreur lors de la réinitialisation');
      }
    }
  };

  const handleProductSubmit = async (product: StockItem) => {
    try {
      if (editingProduct) {
        await updateStockItem(product);
        showNotification('success', 'Produit mis à jour avec succès');
      } else {
        await addStockItem(product);
        showNotification('success', 'Produit créé avec succès');
        
        // Add initial stock movement
        await addStockMovement({
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          productId: product.id,
          type: 'in',
          quantity: product.initialStock,
          reason: 'Stock initial',
        });
      }
      
      setShowProductForm(false);
      setEditingProduct(undefined);
      await loadData();
      await refreshData();
    } catch (error) {
      console.error('Error saving product:', error);
      showNotification('error', 'Erreur lors de la sauvegarde du produit');
    }
  };

  const handleEditProduct = (product: StockItem) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce produit ?')) {
      try {
        await deleteStockItem(id);
        showNotification('success', 'Produit supprimé avec succès');
        await loadData();
        await refreshData();
      } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('error', 'Erreur lors de la suppression du produit');
      }
    }
  };

  const lowStockCount = stockItems.filter(item => item.currentStock <= item.alertThreshold).length;

  if (showProductForm) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
          </h1>
          <Button
            variant="outline"
            onClick={() => {
              setShowProductForm(false);
              setEditingProduct(undefined);
            }}
            icon={<X className="h-4 w-4" />}
          >
            Retour au stock
          </Button>
        </div>
        <ProductForm
          product={editingProduct}
          onSubmit={handleProductSubmit}
          onCancel={() => {
            setShowProductForm(false);
            setEditingProduct(undefined);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Gestion du Stock</h1>
        <div className="flex gap-3">
          <Button
            variant="outline"
            icon={<History className="h-5 w-5" />}
            onClick={() => setShowMovements(!showMovements)}
          >
            Historique
          </Button>
          <Button
            variant="primary"
            icon={<Plus className="h-5 w-5" />}
            onClick={() => setShowProductForm(true)}
          >
            Nouveau produit
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              fullWidth
            />
          </div>
        </div>
        
        <Button
          variant="outline"
          icon={<Filter className="h-5 w-5" />}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filtres
        </Button>
      </div>

      {showFilters && (
        <StockFilters
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      <div className="flex gap-3 flex-wrap">
        <Button
          variant="outline"
          icon={<RotateCw className="h-5 w-5" />}
          className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
          onClick={handleRestockAll}
          disabled={lowStockCount === 0 || loading}
        >
          Recharger tous les produits en alerte ({lowStockCount})
        </Button>
        
        <Button
          variant="outline"
          icon={<RotateCcw className="h-5 w-5" />}
          className="text-red-600 border-red-600 hover:bg-red-50"
          onClick={handleResetAll}
          disabled={loading}
        >
          Réinitialiser
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sous-catégorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Initial
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Actuel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix Unitaire
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => {
                  const isLowStock = item.currentStock <= item.alertThreshold;
                  const isNegativeStock = item.currentStock < 0;
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-gray-50 ${isLowStock ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {isLowStock && (
                            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.subcategory}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.initialStock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${isNegativeStock ? 'bg-red-200 text-red-900' : 
                            isLowStock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {item.currentStock}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Edit className="h-4 w-4" />}
                            aria-label="Modifier"
                            onClick={() => handleEditProduct(item)}
                            disabled={loading}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<RotateCw className="h-4 w-4 text-emerald-500" />}
                            aria-label="Recharger"
                            onClick={() => handleRestock(item)}
                            disabled={item.currentStock >= item.initialStock || loading}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 className="h-4 w-4 text-red-500" />}
                            aria-label="Supprimer"
                            onClick={() => handleDeleteProduct(item.id)}
                            disabled={loading}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                      {loading ? 'Chargement...' : 'Aucun produit trouvé'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showMovements && (
        <Card>
          <CardHeader>
            <CardTitle>Historique des mouvements ({filteredMovements.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Raison
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Caisse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendeur
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMovements.map((movement) => {
                    const product = stockItems.find(item => item.id === movement.productId);
                    return (
                      <tr key={movement.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(movement.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product?.name || 'Produit supprimé'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${movement.type === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {movement.type === 'in' ? 'Entrée' : 'Sortie'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {movement.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {movement.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {movement.register || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {movement.seller || '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMovements.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        {loading ? 'Chargement...' : 'Aucun mouvement trouvé'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Stock;