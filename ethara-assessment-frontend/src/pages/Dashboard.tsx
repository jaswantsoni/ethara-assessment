import { useEffect, useState } from 'react';
import { Package, Users, ShoppingCart, AlertTriangle } from 'lucide-react';
import { getProducts } from '../api/products';
import { getCustomers } from '../api/customers';
import { getOrders } from '../api/orders';
import type { Product } from '../types';
import Spinner from '../components/ui/Spinner';

const LOW_STOCK_THRESHOLD = 10;

export default function Dashboard() {
  const [productCount, setProductCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProducts(), getCustomers(), getOrders()])
      .then(([products, customers, orders]) => {
        setProductCount(products.length);
        setCustomerCount(customers.length);
        setOrderCount(orders.length);
        setLowStock(products.filter((p) => p.stock < LOW_STOCK_THRESHOLD));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const stats = [
    { label: 'Total Products', value: productCount, Icon: Package, color: 'blue' },
    { label: 'Total Customers', value: customerCount, Icon: Users, color: 'green' },
    { label: 'Total Orders', value: orderCount, Icon: ShoppingCart, color: 'purple' },
    { label: 'Low Stock Items', value: lowStock.length, Icon: AlertTriangle, color: 'orange' },
  ];

  return (
    <div className="page">
      <div className="stat-grid">
        {stats.map(({ label, value, Icon, color }) => (
          <div key={label} className={`stat-card stat-${color}`}>
            <div className="stat-icon">
              <Icon size={24} />
            </div>
            <div>
              <p className="stat-label">{label}</p>
              <p className="stat-value">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {lowStock.length > 0 && (
        <section className="card" style={{ marginTop: '1.5rem' }}>
          <h2 className="section-title">
            <AlertTriangle size={18} style={{ color: 'var(--orange)' }} />
            Low Stock Products
          </h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Stock</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td><code>{p.sku}</code></td>
                    <td>
                      <span className="badge badge-danger">{p.stock}</span>
                    </td>
                    <td>₹{parseFloat(p.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
