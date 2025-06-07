export interface Sale {
  id: string;
  date: string;
  clientName: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: string;
  notes?: string;
  seller?: string;
  register?: string;
  category?: string;
}

export interface StockItem {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  currentStock: number;
  alertThreshold: number;
  initialStock: number;
  unitPrice: number;
}

export interface StockMovement {
  id: string;
  date: string;
  productId: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  register?: string;
  seller?: string;
}

export type SortDirection = 'asc' | 'desc';
export type SortField = keyof Sale;

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface FilterOptions {
  startDate: string;
  endDate: string;
  clientName: string;
  productName: string;
  minAmount: string;
  maxAmount: string;
  seller?: string;
  register?: string;
  category?: string;
}

export interface StockFilterOptions {
  productName: string;
  category: string;
  subcategory: string;
  register: string;
  seller: string;
  startDate: string;
  endDate: string;
  minQuantity: string;
  maxQuantity: string;
  minAmount: string;
  maxAmount: string;
  stockStatus: string; // 'low', 'normal', 'high', ''
}

export interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  averageSaleValue: number;
  totalQuantity: number;
  currentStock: number;
  salesBySeller: { name: string; amount: number }[];
  salesByRegister: { name: string; amount: number }[];
  topProducts: {name: string; amount: number}[];
  topClients: {name: string; amount: number}[];
  salesByDate: {date: string; amount: number}[];
}

export interface DashboardFilters {
  startDate: string;
  endDate: string;
  seller?: string;
  register?: string;
  category?: string;
  product?: string;
}