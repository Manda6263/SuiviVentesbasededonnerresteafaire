import { Sale, FilterOptions } from '../types';
import { formatDate } from './formatters';
import JSZip from 'jszip';

export const generateExportFileName = (prefix: string): string => {
  const date = new Date();
  const formattedDate = date.toISOString().split('T')[0];
  return `${prefix}-${formattedDate}.zip`;
};

export const exportToZip = async (
  sales: Sale[],
  filters: FilterOptions,
  format: 'csv' | 'json' | 'excel' = 'csv'
): Promise<Blob> => {
  const zip = new JSZip();
  const exportDate = formatDate(new Date().toISOString());

  // Add a README file with export information
  const readme = `Export des ventes - ${exportDate}
---------------------------
Filtres appliqués:
${filters.startDate ? `- Date début: ${formatDate(filters.startDate)}` : ''}
${filters.endDate ? `- Date fin: ${formatDate(filters.endDate)}` : ''}
${filters.clientName ? `- Client: ${filters.clientName}` : ''}
${filters.productName ? `- Produit: ${filters.productName}` : ''}
${filters.minAmount ? `- Montant min: ${filters.minAmount}€` : ''}
${filters.maxAmount ? `- Montant max: ${filters.maxAmount}€` : ''}

Nombre de ventes: ${sales.length}
Total: ${sales.reduce((sum, sale) => sum + sale.totalAmount, 0).toFixed(2)}€
`;

  zip.file('README.txt', readme);

  // Add the data file in the requested format
  if (format === 'csv') {
    const csvContent = generateCSV(sales);
    zip.file('ventes.csv', csvContent);
  } else if (format === 'json') {
    const jsonContent = JSON.stringify(sales, null, 2);
    zip.file('ventes.json', jsonContent);
  } else if (format === 'excel') {
    const excelContent = generateExcel(sales);
    zip.file('ventes.xlsx', excelContent);
  }

  return zip.generateAsync({ type: 'blob' });
};

const generateCSV = (sales: Sale[]): string => {
  const headers = [
    'Date',
    'Client',
    'Produit',
    'Quantité',
    'Prix unitaire',
    'Montant total',
    'Méthode de paiement',
    'Vendeur',
    'Caisse',
    'Catégorie',
    'Notes'
  ].join(';');

  const rows = sales.map(sale => [
    formatDate(sale.date),
    sale.clientName,
    sale.productName,
    sale.quantity,
    sale.unitPrice.toFixed(2),
    sale.totalAmount.toFixed(2),
    sale.paymentMethod,
    sale.seller || '',
    sale.register || '',
    sale.category || '',
    sale.notes || ''
  ].join(';'));

  return [headers, ...rows].join('\n');
};

const generateExcel = (sales: Sale[]): Blob => {
  // Implementation for Excel export would go here
  // For now, we'll return a simple CSV as a placeholder
  return new Blob([generateCSV(sales)], { type: 'text/csv;charset=utf-8;' });
};