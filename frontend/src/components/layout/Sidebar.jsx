import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart3,
  ChevronRight,
  DatabaseBackup,
  LayoutGrid,
  LogOut,
  Package2,
  Search,
  Settings,
  ShoppingCart,
  Wallet,
  Users,
  Truck
} from 'lucide-react';

const navigation = [
  { label: 'Dashboard', to: '/', icon: LayoutGrid },
  { label: 'POS Billing', to: '/pos', icon: ShoppingCart },
  { label: 'Electrical Items', to: '/items', icon: Package2, children: [{ label: 'Inventory', to: '/items' }, { label: 'Add Item', to: '/items/add' }] },
  { label: 'Customers', to: '/customers', icon: Users },
  { label: 'Suppliers', to: '/suppliers', icon: Truck },
  { label: 'Purchase', to: '/purchases', icon: ShoppingCart, children: [{ label: 'Bills', to: '/purchases' }, { label: 'Add Purchase', to: '/add-purchase' }] },
  { label: 'Expenses', to: '/expenses', icon: Wallet },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Backup', to: '/sync-share', icon: DatabaseBackup },
  { label: 'Settings', to: '/edit-profile', icon: Settings }
];

export default function Sidebar({ onOpenSearch }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, business, logout } = useAuth();

  const isMatchingRoute = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <aside className="flex h-full w-[280px] flex-col border-r border-[#1D2E2A] bg-[#202D28] text-[#ECF3EE] shadow-[12px_0_35px_rgba(20,45,40,0.12)]">
      <div className="px-4 pb-4 pt-5">
        <div className="mb-3 flex items-center gap-3 px-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2E4039] text-lg font-black text-[#B7D96B] ring-1 ring-[#456259]">
            N
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#A7B6AF]">Retail Management</p>
            <p className="text-sm font-black text-white">NEXMART</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSearch}
          className="flex w-full items-center justify-between rounded-2xl border border-[#324B45] bg-[#243831] px-3 py-2.5 text-left text-xs font-medium text-[#EEF7F0] transition hover:border-[#B7D96B] hover:bg-[#2A433C]"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-[#BCCFBE]" />
            Open anything
          </span>
          <span className="rounded-md bg-[#1A2A27] px-1.5 py-0.5 text-[10px] text-[#D4E5D7]">Ctrl+F</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="space-y-1.5">
          {navigation.map(({ label, to, icon: Icon, children }) => {
            const active = isMatchingRoute(to);

            return (
              <div key={label} className="rounded-2xl">
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={() =>
                    `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all ${
                      active
                        ? 'bg-[#2B3F39] text-white shadow-[inset_0_0_0_1px_rgba(183,217,107,0.2)]'
                        : 'text-[#E7F3ED] hover:bg-[#283D38] hover:text-white'
                    }`
                  }
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      active ? 'bg-[#B7D96B] text-[#202D28]' : 'bg-[#2B403B] text-[#C4D8CB]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">{label}</span>
                  {children && <ChevronRight className="h-4 w-4 text-[#B8C9BE]" />}
                </NavLink>

                {children && (
                  <div className="mt-1 space-y-1 pl-11 pr-1">
                    {children.map((child) => {
                      const childActive = isMatchingRoute(child.to);
                      return (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          className={() =>
                            `flex items-center rounded-xl px-2.5 py-1.5 text-xs transition ${
                              childActive
                                ? 'bg-[#B7D96B] text-[#202D28] font-semibold'
                                : 'text-[#BCCFBE] hover:bg-[#2A4038] hover:text-white'
                            }`
                          }
                        >
                          {child.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-[#1E332F] p-3">
        <div className="rounded-2xl border border-[#324B45] bg-[#243831] p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F0F6E6] text-xs font-bold text-[#202D28]">
              {(user?.fullName || 'Admin User').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'AU'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.fullName || 'Admin User'}</p>
              <p className="truncate text-[11px] text-[#B9C9BF]">{business?.business_name || 'NEXMART Retail'}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/edit-profile')}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#B7D96B] px-2.5 py-2 text-xs font-semibold text-[#202D28] transition hover:bg-[#A9CC54]"
            >
              Profile
            </button>
            <button
              type="button"
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#3A5149] bg-transparent text-[#E7F3EE] transition hover:border-[#B7D96B] hover:text-[#B7D96B]"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
