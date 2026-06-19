export interface Product {
  id: number;
  name: string;
  sku: string;
  price: string;
  stock: number;
}

export interface ProductCreate {
  name: string;
  sku: string;
  price: number;
  stock: number;
}

export interface ProductUpdate {
  name?: string;
  sku?: string;
  price?: number;
  stock?: number;
}

export interface ProductSearchResponse {
  total: number;
  skip: number;
  limit: number;
  results: Product[];
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
}

export interface CustomerCreate {
  name: string;
  email: string;
  phone?: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: string;
}

export interface Order {
  id: number;
  customer_id: number;
  total_amount: string;
  created_at: string;
  items: OrderItem[];
}

export interface OrderItemInput {
  product_id: number;
  quantity: number;
}

export interface OrderCreate {
  customer_id: number;
  items: OrderItemInput[];
}
