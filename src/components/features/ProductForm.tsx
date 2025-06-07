import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { StockItem } from '../../types';
import { useNotification } from '../ui/NotificationContainer';
import { getStock } from '../../utils/storage';

interface ProductFormProps {
  product?: StockItem;
  onSubmit: (product: StockItem) => void;
  onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onSubmit, onCancel }) => {
  const { showNotification } = useNotification();
  const isEditing = !!product;
  const [existingStock, setExistingStock] = useState<StockItem[]>([]);

  const [formData, setFormData] = useState<Omit<StockItem, 'id'>>({
    name: '',
    category: '',
    subcategory: '',
    currentStock: 0,
    alertThreshold: 5,
    initialStock: 0,
    unitPrice: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setExistingStock(getStock());
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category,
        subcategory: product.subcategory,
        currentStock: product.currentStock,
        alertThreshold: product.alertThreshold,
        initialStock: product.initialStock,
        unitPrice: product.unitPrice,
      });
    }
  }, [product]);

  // Get unique categories and subcategories from existing stock
  const categories = Array.from(new Set(existingStock.map(item => item.category))).filter(Boolean);
  const subcategories = Array.from(new Set(
    existingStock
      .filter(item => item.category === formData.category)
      .map(item => item.subcategory)
  )).filter(Boolean);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericFields = ['currentStock', 'alertThreshold', 'initialStock', 'unitPrice'];
    
    if (numericFields.includes(name)) {
      const numValue = parseFloat(value) || 0;
      setFormData({ ...formData, [name]: numValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSelectChange = (name: string) => (value: string) => {
    setFormData({ ...formData, [name]: value });
    
    // Reset subcategory when category changes
    if (name === 'category') {
      setFormData(prev => ({ ...prev, category: value, subcategory: '' }));
    }
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du produit est obligatoire';
    }
    
    if (!formData.category.trim()) {
      newErrors.category = 'La catégorie est obligatoire';
    }
    
    if (formData.initialStock < 0) {
      newErrors.initialStock = 'Le stock initial ne peut pas être négatif';
    }
    
    if (formData.alertThreshold < 0) {
      newErrors.alertThreshold = 'Le seuil d\'alerte ne peut pas être négatif';
    }
    
    if (formData.unitPrice < 0) {
      newErrors.unitPrice = 'Le prix unitaire ne peut pas être négatif';
    }

    // Check for duplicate product name (only for new products)
    if (!isEditing) {
      const isDuplicate = existingStock.some(item => 
        item.name.toLowerCase() === formData.name.toLowerCase().trim()
      );
      if (isDuplicate) {
        newErrors.name = 'Un produit avec ce nom existe déjà';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      showNotification('error', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }
    
    const submittedProduct: StockItem = {
      id: product?.id || crypto.randomUUID(),
      ...formData,
      // For new products, set current stock equal to initial stock
      currentStock: isEditing ? formData.currentStock : formData.initialStock,
    };
    
    onSubmit(submittedProduct);
  };

  const categoryOptions = [
    { value: '', label: 'Sélectionner une catégorie' },
    ...categories.map(cat => ({ value: cat, label: cat })),
    { value: '__new__', label: '+ Nouvelle catégorie' }
  ];

  const subcategoryOptions = [
    { value: '', label: 'Sélectionner une sous-catégorie' },
    ...subcategories.map(subcat => ({ value: subcat, label: subcat })),
    { value: '__new__', label: '+ Nouvelle sous-catégorie' }
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Modifier le produit' : 'Nouveau produit'}</CardTitle>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nom du produit"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              placeholder="Ex: Coca-Cola"
              fullWidth
              required
            />
            
            <Input
              label="Prix unitaire (€)"
              name="unitPrice"
              type="number"
              min="0"
              step="0.01"
              value={formData.unitPrice.toString()}
              onChange={handleChange}
              error={errors.unitPrice}
              fullWidth
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Select
                label="Catégorie"
                name="category"
                value={formData.category}
                onChange={handleSelectChange('category')}
                options={categoryOptions}
                error={errors.category}
                fullWidth
                required
              />
              {formData.category === '__new__' && (
                <Input
                  placeholder="Nouvelle catégorie"
                  value=""
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="mt-2"
                  fullWidth
                />
              )}
            </div>
            
            <div>
              <Select
                label="Sous-catégorie"
                name="subcategory"
                value={formData.subcategory}
                onChange={handleSelectChange('subcategory')}
                options={subcategoryOptions}
                fullWidth
                disabled={!formData.category || formData.category === '__new__'}
              />
              {formData.subcategory === '__new__' && (
                <Input
                  placeholder="Nouvelle sous-catégorie"
                  value=""
                  onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                  className="mt-2"
                  fullWidth
                />
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Stock initial"
              name="initialStock"
              type="number"
              min="0"
              step="1"
              value={formData.initialStock.toString()}
              onChange={handleChange}
              error={errors.initialStock}
              fullWidth
              required
            />
            
            {isEditing && (
              <Input
                label="Stock actuel"
                name="currentStock"
                type="number"
                min="0"
                step="1"
                value={formData.currentStock.toString()}
                onChange={handleChange}
                fullWidth
              />
            )}
            
            <Input
              label="Seuil d'alerte"
              name="alertThreshold"
              type="number"
              min="0"
              step="1"
              value={formData.alertThreshold.toString()}
              onChange={handleChange}
              error={errors.alertThreshold}
              fullWidth
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            icon={<X className="h-4 w-4" />}
          >
            Annuler
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            icon={<Save className="h-4 w-4" />}
          >
            {isEditing ? 'Mettre à jour' : 'Créer le produit'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ProductForm;