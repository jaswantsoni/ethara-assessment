import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/products';
import type { Product, ProductCreate, ProductUpdate } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Spinner from '../components/ui/Spinner';

const empty: ProductCreate = { name: '', sku: '', price: 0, stock: 0 };

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductCreate>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductCreate, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  const load = () => {
    setLoading(true);
    getProducts()
      .then((data) => { setProducts(data); setFiltered(data); })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    );
  }, [search, products]);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.sku.trim()) e.sku = 'SKU is required';
    if (form.price <= 0) e.price = 'Price must be greater than 0';
    if (form.stock < 0) e.stock = 'Stock cannot be negative';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openCreate = () => { setEditing(null); setForm(empty); setErrors({}); setShowForm(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku, price: parseFloat(p.price), stock: p.stock });
    setErrors({});
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        const patch: ProductUpdate = {};
        if (form.name !== editing.name) patch.name = form.name;
        if (form.sku !== editing.sku) patch.sku = form.sku;
        if (form.price !== parseFloat(editing.price)) patch.price = form.price;
        if (form.stock !== editing.stock) patch.stock = form.stock;
        await updateProduct(editing.id, patch);
        toast.success('Product updated');
      } else {
        await createProduct(form);
        toast.success('Product created');
      }
      setShowForm(false);
      load();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      toast.success('Product deleted');
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            className="input search-input"
            placeholder="Search by name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      {loading ? <Spinner /> : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="empty-row">No products found</td></tr>
                ) : filtered.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td><code>{p.sku}</code></td>
                    <td>₹{parseFloat(p.price).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${p.stock < 10 ? 'badge-danger' : 'badge-success'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-icon" onClick={() => setViewProduct(p)} title="View">
                          <Eye size={15} />
                        </button>
                        <button className="btn-icon" onClick={() => openEdit(p)} title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button className="btn-icon btn-icon-danger" onClick={() => setDeleteTarget(p)} title="Delete">
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

      {showForm && (
        <Modal title={editing ? 'Edit Product' : 'Add Product'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label>Name *</label>
              <input className={`input${errors.name ? ' input-error' : ''}`} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <span className="error-msg">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label>SKU *</label>
              <input className={`input${errors.sku ? ' input-error' : ''}`} value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              {errors.sku && <span className="error-msg">{errors.sku}</span>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Price *</label>
                <input type="number" min="0.01" step="0.01"
                  className={`input${errors.price ? ' input-error' : ''}`}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
                {errors.price && <span className="error-msg">{errors.price}</span>}
              </div>
              <div className="form-group">
                <label>Stock *</label>
                <input type="number" min="0" step="1"
                  className={`input${errors.stock ? ' input-error' : ''}`}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} />
                {errors.stock && <span className="error-msg">{errors.stock}</span>}
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {viewProduct && (
        <Modal title="Product Details" onClose={() => setViewProduct(null)}>
          <div className="detail-grid">
            <div className="detail-row">
              <span className="detail-label">Name</span>
              <span className="detail-value">{viewProduct.name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">SKU</span>
              <span className="detail-value"><code>{viewProduct.sku}</code></span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Price</span>
              <span className="detail-value">₹{parseFloat(viewProduct.price).toFixed(2)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Stock</span>
              <span className="detail-value">
                <span className={`badge ${viewProduct.stock < 10 ? 'badge-danger' : 'badge-success'}`}>
                  {viewProduct.stock} units
                </span>
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className="detail-value">
                {viewProduct.stock === 0
                  ? <span className="badge badge-danger">Out of Stock</span>
                  : viewProduct.stock < 10
                  ? <span className="badge badge-danger">Low Stock</span>
                  : <span className="badge badge-success">In Stock</span>}
              </span>
            </div>
          </div>
          <div className="form-actions" style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-secondary" onClick={() => setViewProduct(null)}>Close</button>
            <button className="btn btn-primary" onClick={() => { setViewProduct(null); openEdit(viewProduct); }}>
              Edit Product
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
