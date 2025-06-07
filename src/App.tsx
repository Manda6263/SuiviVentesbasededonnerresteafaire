import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/layout/Header';
import SaleForm from './components/features/SaleForm';
import SalesList from './components/features/SalesList';
import Dashboard from './components/features/Dashboard';
import Stock from './components/features/Stock';
import Stats from './components/features/Stats';
import Import from './components/features/Import';
import Admin from './components/features/Admin';
import AuthForm from './components/auth/AuthForm';
import { NotificationProvider, useNotification } from './components/ui/NotificationContainer';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Sale, StockItem, StockMovement } from './types';
import { getSales, getStock, getStockMovements, addSale, updateSale, deleteSale, initializeStorage, migrateDataToSupabase } from './utils/storage';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Create a context for real-time data
export const DataContext = React.createContext<{
  sales: Sale[];
  stock: StockItem[];
  stockMovements: StockMovement[];
  refreshData: () => Promise<void>;
  loading: boolean;
}>({
  sales: [],
  stock: [],
  stockMovements: [],
  refreshData: async () => {},
  loading: false,
});

const AppContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [sales, setSales] = useState<Sale[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [migrationAttempted, setMigrationAttempted] = useState(false);
  const { showNotification } = useNotification();

  const refreshData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [salesData, stockData, movementsData] = await Promise.all([
        getSales(),
        getStock(),
        getStockMovements()
      ]);
      
      setSales(salesData);
      setStock(stockData);
      setStockMovements(movementsData);
    } catch (error) {
      console.error('Error refreshing data:', error);
      showNotification('error', 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [user, showNotification]);

  // Initialize data and attempt migration when user logs in
  useEffect(() => {
    const initializeApp = async () => {
      if (!user) {
        // Clear data when user logs out
        setSales([]);
        setStock([]);
        setStockMovements([]);
        setMigrationAttempted(false);
        return;
      }

      try {
        await initializeStorage();
        
        // Attempt data migration from localStorage to Supabase (only once per session)
        if (!migrationAttempted) {
          try {
            await migrateDataToSupabase();
            showNotification('success', 'Données migrées vers Supabase avec succès');
          } catch (error) {
            console.warn('Migration failed or not needed:', error);
          }
          setMigrationAttempted(true);
        }
        
        await refreshData();
      } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('error', 'Erreur lors de l\'initialisation');
      }
    };

    initializeApp();
  }, [user, refreshData, migrationAttempted, showNotification]);

  const handleAddSale = async (sale: Sale) => {
    try {
      await addSale(sale);
      await refreshData();
      setCurrentPage('sales');
      showNotification('success', 'Vente ajoutée avec succès');
    } catch (error) {
      console.error('Error adding sale:', error);
      showNotification('error', 'Erreur lors de l\'ajout de la vente');
    }
  };

  const handleUpdateSale = async (sale: Sale) => {
    try {
      await updateSale(sale);
      await refreshData();
      setSelectedSale(undefined);
      setCurrentPage('sales');
      showNotification('success', 'Vente mise à jour avec succès');
    } catch (error) {
      console.error('Error updating sale:', error);
      showNotification('error', 'Erreur lors de la mise à jour de la vente');
    }
  };

  const handleDeleteSale = async (id: string) => {
    try {
      await deleteSale(id);
      await refreshData();
      showNotification('success', 'Vente supprimée avec succès');
    } catch (error) {
      console.error('Error deleting sale:', error);
      showNotification('error', 'Erreur lors de la suppression de la vente');
    }
  };

  const handleEditSale = (sale: Sale) => {
    setSelectedSale(sale);
    setCurrentPage('edit-sale');
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'sales':
        return (
          <SalesList
            onEdit={handleEditSale}
            onDelete={handleDeleteSale}
          />
        );
      case 'stock':
        return <Stock />;
      case 'stats':
        return <Stats />;
      case 'import':
        return <Import onImportComplete={refreshData} />;
      case 'admin':
        return <Admin />;
      case 'add-sale':
        return (
          <SaleForm
            onSubmit={handleAddSale}
            onCancel={() => setCurrentPage('sales')}
          />
        );
      case 'edit-sale':
        return (
          <SaleForm
            sale={selectedSale}
            onSubmit={handleUpdateSale}
            onCancel={() => {
              setSelectedSale(undefined);
              setCurrentPage('sales');
            }}
          />
        );
      default:
        return <Dashboard />;
    }
  };

  // Show loading spinner while auth is loading
  if (authLoading) {
    return <LoadingSpinner />;
  }

  // Show auth form if user is not logged in
  if (!user) {
    return <AuthForm />;
  }

  return (
    <DataContext.Provider value={{ sales, stock, stockMovements, refreshData, loading }}>
      <div className="min-h-screen bg-gray-100">
        <Header currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="ml-64 p-8">
          {loading && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Chargement...
              </div>
            </div>
          )}
          {renderCurrentPage()}
        </main>
      </div>
    </DataContext.Provider>
  );
};

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;