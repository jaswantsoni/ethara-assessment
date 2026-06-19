import client from './client';
import type { Product, ProductCreate, ProductUpdate, ProductSearchResponse } from '../types';

export const getProducts = () =>
  client.get<Product[]>('/products/').then((r) => r.data);

export const searchProducts = (params: {
  q?: string;
  min_price?: number;
  max_price?: number;
  min_stock?: number;
  skip?: number;
  limit?: number;
}) => client.get<ProductSearchResponse>('/products/search', { params }).then((r) => r.data);

export const getProduct = (id: number) =>
  client.get<Product>(`/products/${id}`).then((r) => r.data);

export const createProduct = (data: ProductCreate) =>
  client.post<Product>('/products/', data).then((r) => r.data);

export const updateProduct = (id: number, data: ProductUpdate) =>
  client.patch<Product>(`/products/${id}`, data).then((r) => r.data);

export const deleteProduct = (id: number) =>
  client.delete(`/products/${id}`);
