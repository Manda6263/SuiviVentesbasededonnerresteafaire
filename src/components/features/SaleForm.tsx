import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';
import { Sale } from '../../types';
import { useNotification } from '../ui/NotificationContainer';

interface SaleFormProps {
  sale?: Sale;
  onSubmit: (sale: Sale) => void;
  onCancel: () => void;
}

const paymentMethods = [
  { value: 'Carte bancaire', label: 'Carte bancaire' },
  { value: 'Espèces', label: 'Espèces' },
  { value: 'Virement', label: 'Virement' },
  { value: 'Chèque', label: 'Chèque' },
];

const SaleForm: React.FC<SaleFormProps> = ({ sale, onSubmit, onCancel }) => {
  const { showNotification } = useNotification();
  const isEditing = !!sale;

  const [formData, setFormData] = useState<Omit<Sale, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    clientName: '',
    productName: '',
    quantity: 1,
    unitPrice: 0,
    totalAmount: 0,
    paymentMethod: 'Carte bancaire',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (sale) {
      setFormData({
        date: sale.date,
        clientName: sale.clientName,
        productName: sale.productName,
        quantity: sale.quantity,
        unitPrice: sale.unitPrice,
        totalAmount: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
        notes: sale.notes || '',
      });
    }
  }, [sale]);

  useEffect(() => {
    // Auto-calculate total amount
    const total = formData.quantity * formData.unitPrice;
    setFormData(prev => ({ ...prev, totalAmount: total }));
  }, [formData.quantity, formData.unitPrice]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const numericFields = ['quantity', 'unitPrice'];
    
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
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.date) {
      newErrors.date = 'La date est obligatoire';
    }
    
    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Le nom du client est obligatoire';
    }
    
    if (!formData.productName.trim()) {
      newErrors.productName = 'Le nom du produit est obligatoire';
    }
    
    if (formData.quantity <= 0) {
      newErrors.quantity = 'La quantité doit être supérieure à 0';
    }
    
    if (formData.unitPrice <= 0) {
      newErrors.unitPrice = 'Le prix unitaire doit être supérieur à 0';
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
    
    const submittedSale: Sale = {
      id: sale?.id || crypto.randomUUID(),
      ...formData,
    };
    
    onSubmit(submittedSale);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{isEditing ? 'Modifier la vente' : 'Nouvelle vente'}</CardTitle>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              error={errors.date}
              fullWidth
              required
            />
            
            <Input
              label="Client"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              error={errors.clientName}
              placeholder="Nom du client"
              fullWidth
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Produit / Service"
              name="productName"
              value={formData.productName}
              onChange={handleChange}
              error={errors.productName}
              placeholder="Nom du produit ou service"
              fullWidth
              required
            />
            
            <Select
              label="Méthode de paiement"
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleSelectChange('paymentMethod')}
              options={paymentMethods}
              fullWidth
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Quantité"
              name="quantity"
              type="number"
              min="1"
              step="1"
              value={formData.quantity.toString()}
              onChange={handleChange}
              error={errors.quantity}
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
              required
            />
            
            <Input
              label="Total (€)"
              name="totalAmount"
              type="number"
              value={formData.totalAmount.toString()}
              readOnly
              fullWidth
            />
          </div>
          
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              placeholder="Notes supplémentaires (optionnel)"
              value={formData.notes}
              onChange={handleChange}
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
            {isEditing ? 'Mettre à jour' : 'Enregistrer'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default SaleForm;