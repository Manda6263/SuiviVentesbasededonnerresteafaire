import { Sale, DashboardStats } from '../types';

export const calculateDashboardStats = (sales: Sale[]): DashboardStats => {
  if (!sales.length) {
    return {
      totalSales: 0,
      totalRevenue: 0,
      averageSaleValue: 0,
      totalQuantity: 0,
      currentStock: 0,
      salesBySeller: [],
      salesByRegister: [],
      topProducts: [],
      topClients: [],
      salesByDate: []
    };
  }

  // Calculate total sales and revenue
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const averageSaleValue = totalRevenue / totalSales;
  const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  
  // Calculate current stock (mock value for now)
  const currentStock = 1000 - totalQuantity;

  // Calculate sales by seller
  const sellerTotals = sales.reduce((acc, sale) => {
    if (sale.seller) {
      acc[sale.seller] = (acc[sale.seller] || 0) + sale.totalAmount;
    }
    return acc;
  }, {} as Record<string, number>);

  const salesBySeller = Object.entries(sellerTotals)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Calculate sales by register
  const registerTotals = sales.reduce((acc, sale) => {
    if (sale.register) {
      acc[sale.register] = (acc[sale.register] || 0) + sale.totalAmount;
    }
    return acc;
  }, {} as Record<string, number>);

  const salesByRegister = Object.entries(registerTotals)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  // Calculate top products
  const productTotals = sales.reduce((acc, sale) => {
    const product = sale.productName;
    acc[product] = (acc[product] || 0) + sale.totalAmount;
    return acc;
  }, {} as Record<string, number>);

  const topProducts = Object.entries(productTotals)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Calculate top clients
  const clientTotals = sales.reduce((acc, sale) => {
    const client = sale.clientName;
    acc[client] = (acc[client] || 0) + sale.totalAmount;
    return acc;
  }, {} as Record<string, number>);

  const topClients = Object.entries(clientTotals)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Sales by date
  const dateMap: Record<string, number> = {};
  sales.forEach(sale => {
    dateMap[sale.date] = (dateMap[sale.date] || 0) + sale.totalAmount;
  });

  const salesByDate = Object.entries(dateMap)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalSales,
    totalRevenue,
    averageSaleValue,
    totalQuantity,
    currentStock,
    salesBySeller,
    salesByRegister,
    topProducts,
    topClients,
    salesByDate
  };
};