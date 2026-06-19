import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/customers': 'Customers',
  '/orders': 'Orders',
};

export default function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { pathname } = useLocation();
  const title = titles[pathname] ?? 'InvenTrack';

  return (
    <header className="topbar">
      <button className="btn-icon topbar-menu" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={22} />
      </button>
      <h1 className="topbar-title">{title}</h1>
    </header>
  );
}
