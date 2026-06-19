import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Users, ShoppingCart, X } from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/products', label: 'Products', Icon: Package },
  { to: '/customers', label: 'Customers', Icon: Users },
  { to: '/orders', label: 'Orders', Icon: ShoppingCart },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: Props) {
  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Package size={22} />
          <span>InvenTrack</span>
          <button className="btn-icon sidebar-close" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav>
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
