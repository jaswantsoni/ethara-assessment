import { useEffect, useState } from 'react';
import { Plus, Trash2, Search, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCustomers, createCustomer, deleteCustomer } from '../api/customers';
import type { Customer, CustomerCreate } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Spinner from '../components/ui/Spinner';

const empty: CustomerCreate = { name: '', email: '', phone: '' };

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CustomerCreate>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerCreate, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);

  const load = () => {
    setLoading(true);
    getCustomers()
      .then((data) => { setCustomers(data); setFiltered(data); })
      .catch(() => toast.error('Failed to load customers'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    ));
  }, [search, customers]);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await createCustomer({ ...form, phone: form.phone || undefined });
      toast.success('Customer created');
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
      await deleteCustomer(deleteTarget.id);
      toast.success('Customer deleted');
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
          <input className="input search-input" placeholder="Search by name or email…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(empty); setErrors({}); setShowForm(true); }}>
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {loading ? <Spinner /> : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Phone</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="empty-row">No customers found</td></tr>
                ) : filtered.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.email}</td>
                    <td>{c.phone || '—'}</td>
                    <td>
                      <div className="action-btns">
                        <button className="btn-icon" onClick={() => setViewCustomer(c)} title="View">
                          <Eye size={15} />
                        </button>
                        <button className="btn-icon btn-icon-danger" onClick={() => setDeleteTarget(c)} title="Delete">
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
        <Modal title="Add Customer" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label>Name *</label>
              <input className={`input${errors.name ? ' input-error' : ''}`} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <span className="error-msg">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" className={`input${errors.email ? ' input-error' : ''}`}
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {errors.email && <span className="error-msg">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="input" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete customer "${deleteTarget.name}"? Any existing orders will be preserved.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {viewCustomer && (
        <Modal title="Customer Details" onClose={() => setViewCustomer(null)}>
          <div className="detail-grid">
            <div className="detail-row">
              <span className="detail-label">Name</span>
              <span className="detail-value">{viewCustomer.name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Email</span>
              <span className="detail-value">
                <a href={`mailto:${viewCustomer.email}`} className="detail-link">{viewCustomer.email}</a>
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Phone</span>
              <span className="detail-value">
                {viewCustomer.phone
                  ? <a href={`tel:${viewCustomer.phone}`} className="detail-link">{viewCustomer.phone}</a>
                  : <span style={{ color: 'var(--muted)' }}>—</span>}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Customer ID</span>
              <span className="detail-value">#{viewCustomer.id}</span>
            </div>
          </div>
          <div className="form-actions" style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-secondary" onClick={() => setViewCustomer(null)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
