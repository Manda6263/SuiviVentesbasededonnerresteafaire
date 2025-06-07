import React, { useState, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Card, CardContent } from '../ui/Card';
import { StockFilterOptions } from '../../types';
import { getStock, getSales } from '../../utils/storage';

interface StockFiltersProps {
  filters: StockFilterOptions;
  onFiltersChange: (filters: StockFilterOptions) => void;
  onClose: () => void;
}

const StockFilters: React.FC<StockFiltersProps> = ({ filters, onFiltersChange, onClose }) => {
  const [uniqueValues, setUniqueValues] = useState({
    categories: [] as string[],
    subcategories: [] as string[],
    registers: [] as string[],
    sellers: [] as string[],
  });

  useEffect(() => {
    const stock = getStock();
    const sales = getSales();

    setUniqueValues({
      categories: Array.from(new Set(stock.map(item => item.category).filter(Boolean))),
      subcategories: Array.from(new Set(stock.map(item => item.subcategory).filter(Boolean))),
      registers: Array.from(new Set(sales.map(sale => sale.register).filter(Boolean))),
      sellers: Array.from(new Set(sales.map(sale => sale.seller).filter(Boolean))),
    });
  }, []);

  const handleFilterChange = (field: keyof StockFilterOptions, value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
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
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filtres</h3>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                icon={<RotateCcw className="h-4 w-4" />}
              >
                Effacer tout
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              icon={<X className="h-4 w-4" />}
            >
              Fermer
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Product and Category Filters */}
          <Input
            label="Produit"
            value={filters.productName}
            onChange={(e) => handleFilterChange('productName', e.target.value)}
            placeholder="Nom du produit"
            fullWidth
          />

          <Select
            label="Catégorie"
            value={filters.category}
            onChange={(value) => handleFilterChange('category', value)}
            options={[
              { value: '', label: 'Toutes les catégories' },
              ...uniqueValues.categories.map(cat => ({ value: cat, label: cat }))
            ]}
            fullWidth
          />

          <Select
            label="Sous-catégorie"
            value={filters.subcategory}
            onChange={(value) => handleFilterChange('subcategory', value)}
            options={[
              { value: '', label: 'Toutes les sous-catégories' },
              ...uniqueValues.subcategories.map(subcat => ({ value: subcat, label: subcat }))
            ]}
            fullWidth
          />

          <Select
            label="État du stock"
            value={filters.stockStatus}
            onChange={(value) => handleFilterChange('stockStatus', value)}
            options={[
              { value: '', label: 'Tous les états' },
              { value: 'low', label: 'Stock faible' },
              { value: 'normal', label: 'Stock normal' },
              { value: 'high', label: 'Stock élevé' },
            ]}
            fullWidth
          />

          {/* Sales-related Filters */}
          <Select
            label="Caisse"
            value={filters.register}
            onChange={(value) => handleFilterChange('register', value)}
            options={[
              { value: '', label: 'Toutes les caisses' },
              ...uniqueValues.registers.map(reg => ({ value: reg, label: reg }))
            ]}
            fullWidth
          />

          <Select
            label="Vendeur"
            value={filters.seller}
            onChange={(value) => handleFilterChange('seller', value)}
            options={[
              { value: '', label: 'Tous les vendeurs' },
              ...uniqueValues.sellers.map(seller => ({ value: seller, label: seller }))
            ]}
            fullWidth
          />

          {/* Date Range */}
          <Input
            label="Date début"
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            fullWidth
          />

          <Input
            label="Date fin"
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            fullWidth
          />

          {/* Quantity Range */}
          <Input
            label="Quantité min"
            type="number"
            min="0"
            value={filters.minQuantity}
            onChange={(e) => handleFilterChange('minQuantity', e.target.value)}
            placeholder="0"
            fullWidth
          />

          <Input
            label="Quantité max"
            type="number"
            min="0"
            value={filters.maxQuantity}
            onChange={(e) => handleFilterChange('maxQuantity', e.target.value)}
            placeholder="∞"
            fullWidth
          />

          {/* Amount Range */}
          <Input
            label="Montant min (€)"
            type="number"
            min="0"
            step="0.01"
            value={filters.minAmount}
            onChange={(e) => handleFilterChange('minAmount', e.target.value)}
            placeholder="0.00"
            fullWidth
          />

          <Input
            label="Montant max (€)"
            type="number"
            min="0"
            step="0.01"
            value={filters.maxAmount}
            onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
            placeholder="∞"
            fullWidth
          />
        </div>

        {hasActiveFilters && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Filtres actifs:</strong> {Object.entries(filters)
                .filter(([_, value]) => value !== '')
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockFilters;