import React, { useState, useMemo, useContext } from 'react';
import { Edit, Trash2, Search, Filter, ArrowUp, ArrowDown, Download, ExternalLink } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { Sale, SortConfig, FilterOptions } from '../../types';
import { formatCurrency, formatDate, copyToClipboard, generateCSVFromSales } from '../../utils/formatters';
import { useNotification } from '../ui/NotificationContainer';
import { DataContext } from '../../App';
import { exportToZip, generateExportFileName } from '../../utils/export';

interface SalesListProps {
  onEdit: (sale: Sale) => void;
  onDelete: (id: string) => void;
}

const SalesList: React.FC<SalesListProps> = ({ onEdit, onDelete }) => {
  const { sales, loading } = useContext(DataContext);
  const { showNotification } = useNotification();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'date', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    startDate: '',
    endDate: '',
    clientName: '',
    productName: '',
    minAmount: '',
    maxAmount: '',
  });
  
  // Sort and filter sales
  const filteredSales = useMemo(() => {
    let filtered = [...sales];
    
    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(sale => 
        sale.clientName.toLowerCase().includes(term) ||
        sale.productName.toLowerCase().includes(term) ||
        sale.notes?.toLowerCase().includes(term)
      );
    }
    
    // Apply filters
    if (filters.startDate) {
      filtered = filtered.filter(sale => sale.date >= filters.startDate);
    }
    
    if (filters.endDate) {
      filtered = filtered.filter(sale => sale.date <= filters.endDate);
    }
    
    if (filters.clientName) {
      const clientTerm = filters.clientName.toLowerCase();
      filtered = filtered.filter(sale => sale.clientName.toLowerCase().includes(clientTerm));
    }
    
    if (filters.productName) {
      const productTerm = filters.productName.toLowerCase();
      filtered = filtered.filter(sale => sale.productName.toLowerCase().includes(productTerm));
    }
    
    if (filters.minAmount && !isNaN(parseFloat(filters.minAmount))) {
      filtered = filtered.filter(sale => sale.totalAmount >= parseFloat(filters.minAmount));
    }
    
    if (filters.maxAmount && !isNaN(parseFloat(filters.maxAmount))) {
      filtered = filtered.filter(sale => sale.totalAmount <= parseFloat(filters.maxAmount));
    }
    
    // Sort
    return filtered.sort((a, b) => {
      const fieldA = a[sortConfig.field];
      const fieldB = b[sortConfig.field];
      
      if (fieldA < fieldB) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (fieldA > fieldB) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [sales, sortConfig, searchTerm, filters]);
  
  const handleSort = (field: keyof Sale) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      clientName: '',
      productName: '',
      minAmount: '',
      maxAmount: '',
    });
  };

  const handleExport = async (format: 'csv' | 'json' | 'excel') => {
    if (filteredSales.length === 0) {
      showNotification('warning', 'Aucune donnée à exporter');
      return;
    }

    try {
      const zipBlob = await exportToZip(filteredSales, filters, format);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateExportFileName('ventes');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showNotification('success', 'Export réussi');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('error', 'Erreur lors de l\'export');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cette vente ?')) {
      try {
        await onDelete(id);
      } catch (error) {
        console.error('Error deleting sale:', error);
        showNotification('error', 'Erreur lors de la suppression');
      }
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <CardTitle>Liste des ventes</CardTitle>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto mt-2 md:mt-0">
          <div className="relative w-full md:w-64">
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              fullWidth
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
          <Button
            variant="outline"
            icon={<Filter className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
            className="ml-0 md:ml-2"
          >
            Filtres
          </Button>
          <div className="relative">
            <Button
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              onClick={() => handleExport('csv')}
              className="ml-0 md:ml-2"
            >
              Exporter
            </Button>
            <div className="absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
              <div className="py-1">
                <button
                  onClick={() => handleExport('csv')}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Exporter en CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Exporter en JSON
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Exporter en Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      {showFilters && (
        <div className="px-6 py-3 bg-gray-50 border-t border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Date début"
                name="startDate"
                type="date"
                value={filters.startDate}
                onChange={handleFilterChange}
                fullWidth
              />
              <Input
                label="Date fin"
                name="endDate"
                type="date"
                value={filters.endDate}
                onChange={handleFilterChange}
                fullWidth
              />
            </div>
            <Input
              label="Client"
              name="clientName"
              value={filters.clientName}
              onChange={handleFilterChange}
              fullWidth
            />
            <Input
              label="Produit"
              name="productName"
              value={filters.productName}
              onChange={handleFilterChange}
              fullWidth
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Montant min"
                name="minAmount"
                type="number"
                value={filters.minAmount}
                onChange={handleFilterChange}
                fullWidth
              />
              <Input
                label="Montant max"
                name="maxAmount"
                type="number"
                value={filters.maxAmount}
                onChange={handleFilterChange}
                fullWidth
              />
            </div>
            <div className="col-span-1 md:col-span-2 flex items-end">
              <Button
                variant="outline"
                onClick={resetFilters}
                className="mb-1"
              >
                Réinitialiser les filtres
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center">
                    Date
                    {sortConfig.field === 'date' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'asc' ? 
                          <ArrowUp className="h-3 w-3" /> : 
                          <ArrowDown className="h-3 w-3" />
                        }
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('clientName')}
                >
                  <div className="flex items-center">
                    Client
                    {sortConfig.field === 'clientName' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'asc' ? 
                          <ArrowUp className="h-3 w-3" /> : 
                          <ArrowDown className="h-3 w-3" />
                        }
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('productName')}
                >
                  <div className="flex items-center">
                    Produit
                    {sortConfig.field === 'productName' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'asc' ? 
                          <ArrowUp className="h-3 w-3" /> : 
                          <ArrowDown className="h-3 w-3" />
                        }
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center">
                    Qté
                    {sortConfig.field === 'quantity' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'asc' ? 
                          <ArrowUp className="h-3 w-3" /> : 
                          <ArrowDown className="h-3 w-3" />
                        }
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('totalAmount')}
                >
                  <div className="flex items-center">
                    Montant
                    {sortConfig.field === 'totalAmount' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'asc' ? 
                          <ArrowUp className="h-3 w-3" /> : 
                          <ArrowDown className="h-3 w-3" />
                        }
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDate(sale.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {sale.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {sale.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {sale.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(sale)}
                          icon={<Edit className="h-4 w-4" />}
                          aria-label="Modifier"
                          disabled={loading}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(sale.id)}
                          icon={<Trash2 className="h-4 w-4 text-red-500" />}
                          aria-label="Supprimer"
                          disabled={loading}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const detailsWindow = window.open('', '_blank');
                            if (detailsWindow) {
                              detailsWindow.document.write(`
                                <html>
                                <head>
                                  <title>Détails de la vente</title>
                                  <style>
                                    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
                                    h1 { color: #3b82f6; }
                                    .details { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
                                    .row { display: flex; margin-bottom: 10px; }
                                    .label { font-weight: bold; width: 150px; }
                                  </style>
                                </head>
                                <body>
                                  <h1>Détails de la vente</h1>
                                  <div class="details">
                                    <div class="row">
                                      <div class="label">ID:</div>
                                      <div>${sale.id}</div>
                                    </div>
                                    <div class="row">
                                      <div class="label">Date:</div>
                                      <div>${formatDate(sale.date)}</div>
                                    </div>
                                    <div class="row">
                                      <div class="label">Client:</div>
                                      <div>${sale.clientName}</div>
                                    </div>
                                    <div class="row">
                                      <div class="label">Produit:</div>
                                      <div>${sale.productName}</div>
                                    </div>
                                    <div class="row">
                                      <div class="label">Quantité:</div>
                                      <div>${sale.quantity}</div>
                                    </div>
                                    <div class="row">
                                      <div class="label">Prix unitaire:</div>
                                      <div>${formatCurrency(sale.unitPrice)}</div>
                                    </div>
                                    <div class="row">
                                      <div class="label">Montant total:</div>
                                      <div>${formatCurrency(sale.totalAmount)}</div>
                                    </div>
                                    <div class="row">
                                      <div class="label">Méthode de paiement:</div>
                                      <div>${sale.paymentMethod}</div>
                                    </div>
                                    ${sale.notes ? `
                                      <div class="row">
                                        <div class="label">Notes:</div>
                                        <div>${sale.notes}</div>
                                      </div>
                                    ` : ''}
                                  </div>
                                  <button onclick="window.print()" style="margin-top: 20px; padding: 8px 16px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                    Imprimer
                                  </button>
                                </body>
                                </html>
                              `);
                              detailsWindow.document.close();
                            }
                          }}
                          icon={<ExternalLink className="h-4 w-4" />}
                          aria-label="Voir les détails"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    {loading ? 'Chargement...' : 'Aucune vente trouvée'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t border-gray-200 px-6 py-4">
        <div className="text-sm text-gray-500">
          {filteredSales.length} {filteredSales.length > 1 ? 'ventes' : 'vente'} trouvée{filteredSales.length > 1 ? 's' : ''}
        </div>
        <div className="text-sm text-gray-700 font-medium">
          Total: {formatCurrency(filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0))}
        </div>
      </CardFooter>
    </Card>
  );
};

export default SalesList;