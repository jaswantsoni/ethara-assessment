import { useEffect, useState } from 'react';
import { Plus, Eye, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getOrders, createOrder, deleteOrder } from '../api/orders';
import { getProducts } from '../api/products';
import { getCustomers } from '../api/customers';
import type { Order, OrderCreate, OrderItemInput, Product, Customer } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Spinner from '../components/ui/Spinner';

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<OrderItemInput[]>([{ product_id: 0, quantity: 1 }]);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    Promise.all([getOrders(), getProducts(), getCustomers()])
      .then(([o, p, c]) => { setOrders(o); setProducts(p); setCustomers(c); })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setCustomerId('');
    setItems([{ product_id: 0, quantity: 1 }]);
    setFormErrors([]);
    setShowCreate(true);
  };

  const addItem = () => setItems([...items, { product_id: 0, quantity: 1 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof OrderItemInput, val: number) =>
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const validateOrder = (): boolean => {
    const e: string[] = [];
    if (!customerId) e.push('Please select a customer');
    items.forEach((item, i) => {
      if (!item.product_id) e.push(`Item ${i + 1}: select a product`);
      if (item.quantity < 1) e.push(`Item ${i + 1}: quantity must be at least 1`);
    });
    setFormErrors(e);
    return e.length === 0;
  };

  const getAvailableProducts = (currentIndex: number) =>
  products.filter(
    product =>
      !items.some(
        (item, idx) =>
          idx !== currentIndex &&
          item.product_id === product.id
      )
  );

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateOrder()) return;
    setSaving(true);
    const payload: OrderCreate = {
      customer_id: parseInt(customerId),
      items: items.map((it) => ({ product_id: it.product_id, quantity: it.quantity })),
    };
    try {
      await createOrder(payload);
      toast.success('Order placed successfully');
      setShowCreate(false);
      load();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteOrder(deleteTarget.id);
      toast.success('Order cancelled');
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const customerName = (id: number) => customers.find((c) => c.id === id)?.name ?? `#${id}`;
  const productName = (id: number) => products.find((p) => p.id === id)?.name ?? `#${id}`;

  return (
    <div className="page">
      <div className="page-header">
        <div />
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> New Order
        </button>
      </div>

      {loading ? <Spinner /> : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={6} className="empty-row">No orders yet</td></tr>
                ) : orders.map((o) => (
                  <tr key={o.id}>
                    <td><span className="badge badge-info">#{o.id}</span></td>
                    <td>{customerName(o.customer_id)}</td>
                    <td>{o.items.length}</td>
                    <td>₹{parseFloat(o.total_amount).toFixed(2)}</td>
                    <td>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-icon" onClick={() => setViewOrder(o)} title="View Details">
                          <Eye size={15} />
                        </button>
                        <button className="btn-icon btn-icon-danger" onClick={() => setDeleteTarget(o)} title="Cancel Order">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreate && (
        <Modal title="New Order" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreateOrder} noValidate>
            {formErrors.length > 0 && (
              <ul className="error-list">
                {formErrors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            )}
            <div className="form-group">
              <label>Customer *</label>
              <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">— Select customer —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Order Items *</label>
              {items.map((item, i) => (


                  <div key={i} className="order-item-row">
                  <select
                    className="input"
                    value={item.product_id || ''}
                    onChange={(e) =>
                      updateItem(i, 'product_id', e.target.value ? Number(e.target.value) : 0)
                    }
                  >
                    <option value="">— Product —</option>
                    {getAvailableProducts(i).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.stock})
                      </option>
                    ))}
                  </select>
                  <input type="number" min="1" className="input qty-input"
                  value={item.quantity}
                  onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} />
                  {items.length > 1 && (
                    <button type="button" className="btn-icon btn-icon-danger" onClick={() => removeItem(i)}>
                    <Trash2 size={14} />
                    </button>
                  )}
                  </div>
                
              ))}
              <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
                <Plus size={14} /> Add Item
              </button>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Placing…' : 'Place Order'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Order Modal */}
      {viewOrder && (
        <Modal title={`Order #${viewOrder.id}`} onClose={() => setViewOrder(null)}>
          <div className="order-detail">
            <div className="order-meta">
              <span><strong>Customer:</strong> {customerName(viewOrder.customer_id)}</span>
              <span><strong>Date:</strong> {new Date(viewOrder.created_at).toLocaleString()}</span>
              <span><strong>Total:</strong> ₹{parseFloat(viewOrder.total_amount).toFixed(2)}</span>
            </div>
            <table className="table" style={{ marginTop: '1rem' }}>
              <thead>
                <tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr>
              </thead>
              <tbody>
                {viewOrder.items.map((item) => (
                  <tr key={item.id}>
                    <td>{productName(item.product_id)}</td>
                    <td>{item.quantity}</td>
                    <td>₹{parseFloat(item.unit_price).toFixed(2)}</td>
                    <td>₹{(item.quantity * parseFloat(item.unit_price)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Cancel Order #${deleteTarget.id}? Stock will be restored.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
