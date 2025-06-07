export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', { 
    style: 'currency', 
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy: ', err);
    return false;
  }
};

export const generateCSVFromSales = (sales: any[]): string => {
  if (sales.length === 0) return '';
  
  // Get headers from first sale object
  const headers = Object.keys(sales[0]);
  
  // Create CSV header row
  const csvHeader = headers.join(',');
  
  // Create CSV data rows
  const csvRows = sales.map(sale => {
    return headers.map(header => {
      let value = sale[header]?.toString() || '';
      
      // Escape quotes and wrap with quotes if value contains comma or quotes
      if (value.includes(',') || value.includes('"')) {
        value = value.replace(/"/g, '""');
        value = `"${value}"`;
      }
      
      return value;
    }).join(',');
  });
  
  // Combine header and rows
  return [csvHeader, ...csvRows].join('\n');
};