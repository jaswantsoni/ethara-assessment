import client from './client';
import type { Order, OrderCreate } from '../types';

export const getOrders = () =>
  client.get<Order[]>('/orders/').then((r) => r.data);

export const getOrder = (id: number) =>
  client.get<Order>(`/orders/${id}`).then((r) => r.data);

export const createOrder = (data: OrderCreate) =>
  client.post<Order>('/orders/', data).then((r) => r.data);

export const deleteOrder = (id: number) =>
  client.delete(`/orders/${id}`);
