import React, { useState, useMemo, useContext } from 'react';
import {
  TrendingUp, Package, CreditCard, AlertTriangle,
  Calendar, Filter, RefreshCw
} from 'lucide-react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Sale, DashboardStats, DashboardFilters } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { calculateDashboardStats } from '../../utils/calculations';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { DataContext } from '../../App';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const Dashboard: React.FC = () => {
  const { sales, refreshData, loading } = useContext(DataContext);
  const [filters, setFilters] = useState<DashboardFilters>({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const [showFilters, setShowFilters] = useState(false);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');

  // Filter sales based on selected date range and other filters
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.date);
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      
      let matches = saleDate >= startDate && saleDate <= endDate;
      
      if (filters.seller && sale.seller) {
        matches = matches && sale.seller === filters.seller;
      }
      
      if (filters.register && sale.register) {
        matches = matches && sale.register === filters.register;
      }
      
      if (filters.category && sale.category) {
        matches = matches && sale.category === filters.category;
      }
      
      if (filters.product) {
        matches = matches && sale.productName.toLowerCase().includes(filters.product.toLowerCase());
      }
      
      return matches;
    });
  }, [sales, filters]);

  const stats = useMemo(() => calculateDashboardStats(filteredSales), [filteredSales]);

  const uniqueValues = useMemo(() => ({
    sellers: Array.from(new Set(sales.map(s => s.seller).filter(Boolean))),
    registers: Array.from(new Set(sales.map(s => s.register).filter(Boolean))),
    categories: Array.from(new Set(sales.map(s => s.category).filter(Boolean))),
  }), [sales]);

  // Prepare data for charts
  const salesTrendData = {
    labels: stats.salesByDate.map(item => item.date),
    datasets: [
      {
        label: 'Chiffre d\'affaires',
        data: stats.salesByDate.map(item => item.amount),
        fill: true,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const topProductsData = {
    labels: stats.topProducts.map(item => item.name),
    datasets: [
      {
        label: 'Ventes',
        data: stats.topProducts.map(item => item.amount),
        backgroundColor: 'rgb(59, 130, 246)',
      },
    ],
  };

  const salesByCategoryData = {
    labels: uniqueValues.categories,
    datasets: [
      {
        data: uniqueValues.categories.map(category => {
          return filteredSales
            .filter(sale => sale.category === category)
            .reduce((sum, sale) => sum + sale.totalAmount, 0);
        }),
        backgroundColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgb(139, 92, 246)',
        ],
      },
    ],
  };

  const lowStockProducts = useMemo(() => {
    return stats.topProducts.filter(product => {
      const stockInfo = product as any; // Add proper typing
      return stockInfo.currentStock <= stockInfo.alertThreshold;
    });
  }, [stats.topProducts]);

  const handleRefresh = async () => {
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>
        <div className="flex gap-3">
          <Button
            variant="outline"
            icon={<Filter className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filtres
          </Button>
          <Button
            variant="outline"
            icon={<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Actualiser
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Date début"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  fullWidth
                />
                <Input
                  label="Date fin"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  fullWidth
                />
              </div>
              
              <Select
                label="Vendeur"
                value={filters.seller || ''}
                onChange={(value) => setFilters(prev => ({ ...prev, seller: value }))}
                options={[
                  { value: '', label: 'Tous les vendeurs' },
                  ...uniqueValues.sellers.map(s => ({ value: s, label: s }))
                ]}
                fullWidth
              />
              
              <Select
                label="Caisse"
                value={filters.register || ''}
                onChange={(value) => setFilters(prev => ({ ...prev, register: value }))}
                options={[
                  { value: '', label: 'Toutes les caisses' },
                  ...uniqueValues.registers.map(r => ({ value: r, label: r }))
                ]}
                fullWidth
              />
              
              <Select
                label="Catégorie"
                value={filters.category || ''}
                onChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                options={[
                  { value: '', label: 'Toutes les catégories' },
                  ...uniqueValues.categories.map(c => ({ value: c, label: c }))
                ]}
                fullWidth
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="rounded-full p-3 bg-blue-100 text-blue-600 mr-4">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">CA Total</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {formatCurrency(stats.totalRevenue)}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="rounded-full p-3 bg-green-100 text-green-600 mr-4">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Quantité vendue</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {stats.totalQuantity}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center">
            <div className="rounded-full p-3 bg-amber-100 text-amber-600 mr-4">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Panier moyen</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {formatCurrency(stats.averageSaleValue)}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className={lowStockProducts.length > 0 ? 'bg-red-50' : ''}>
          <CardContent className="p-6 flex items-center">
            <div className="rounded-full p-3 bg-red-100 text-red-600 mr-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Produits en alerte</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {lowStockProducts.length}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Évolution des ventes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Line
                data={salesTrendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 produits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar
                data={topProductsData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Pie
                data={salesByCategoryData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right' as const,
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Produits en alerte</CardTitle>
              <span className="text-sm text-red-600 font-medium">
                {lowStockProducts.length} produits
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-200">
              {lowStockProducts.map((product: any) => (
                <div key={product.name} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">
                      Stock: {product.currentStock} / Seuil: {product.alertThreshold}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Critique
                  </span>
                </div>
              ))}
              {lowStockProducts.length === 0 && (
                <p className="py-3 text-sm text-gray-500 text-center">
                  Aucun produit en alerte
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;