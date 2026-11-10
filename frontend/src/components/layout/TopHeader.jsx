import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  ChevronDown,
  LogOut,
  Search,
  Sparkles,
  Plus,
  ScanLine,
  UserCircle2
} from 'lucide-react';

const routeTitles = {
  '/': 'Dashboard',
  '/pos': 'POS',
  '/items': 'Items',
  '/items/add': 'Items',
  '/sales': 'Sales',
  '/add-sale': 'POS',
  '/reports': 'Reports',
  '/sync-share': 'Backup',
  '/purchases': 'Purchase',
  '/add-purchase': 'Purchase',
  '/expenses': 'Expense',
  '/edit-profile': 'Setting',
  '/customers': 'Customers',
  '/suppliers': 'Suppliers',
  '/cash-in-hand': 'Cash & Bank',
  '/bank-accounts': 'Cash & Bank',
  '/returns': 'Returns',
  '/parties': 'Parties'
};

export default function TopHeader({ onOpenSearch }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, business, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const pageTitle = routeTitles[location.pathname] || 'Dashboard';
  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const initials = (user?.fullName || 'Admin User').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'AU';

  return (
    <header className="border-b border-[#E5E5DF] bg-[#F4F3EF]/95 backdrop-blur-sm">
      <div className="flex h-20 items-center justify-between gap-4 px-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#202D28] text-lg font-black text-[#B7D96B] shadow-[0_10px_25px_rgba(32,45,40,0.18)]">
              N
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#858B84]">Retail Management</p>
              <p className="text-lg font-black tracking-[-0.04em] text-[#242B26]">NEXMART</p>
            </div>
          </div>

          <div className="hidden h-8 w-px bg-[#E5E5DF] xl:block" />

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#858B84]">Overview</p>
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#242B26]">
              <span>{pageTitle}</span>
              <span className="text-[#858B84]">/</span>
              <span className="truncate text-[#858B84]">{business?.business_name || 'NEXMART Retail'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSearch}
            className="hidden items-center gap-2 rounded-full border border-[#E5E5DF] bg-white px-3 py-2 text-xs font-medium text-[#242B26] shadow-sm transition hover:border-[#B7D96B] hover:text-[#202D28] lg:flex"
          >
            <Search className="h-3.5 w-3.5 text-[#858B84]" />
            Global search
          </button>

          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E5DF] bg-white text-[#242B26] shadow-sm transition hover:border-[#B7D96B]"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B7D96B] px-1 text-[9px] font-bold text-[#202D28]">
              3
            </span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex items-center gap-2 rounded-full border border-[#E5E5DF] bg-white px-2 py-1.5 shadow-sm transition hover:border-[#B7D96B]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0F6E6] text-[11px] font-bold text-[#202D28]">
                {initials}
              </div>
              <span className="hidden text-xs font-semibold text-[#242B26] sm:block">
                {user?.fullName || 'Admin'}
              </span>
              <ChevronDown className="h-4 w-4 text-[#858B84]" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-[#E5E5DF] bg-white p-1 shadow-[0_18px_45px_rgba(32,43,38,0.12)]">
                <div className="border-b border-[#E5E5DF] px-3 py-2.5">
                  <p className="text-sm font-semibold text-[#242B26]">{user?.fullName || 'Admin User'}</p>
                  <p className="text-[11px] text-[#858B84]">{user?.role || 'Admin'} • {business?.business_name || 'NEXMART Retail'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { navigate('/edit-profile'); setShowUserMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[#242B26] transition hover:bg-[#F4F3EF]"
                >
                  <UserCircle2 className="h-3.5 w-3.5 text-[#858B84]" />
                  Business profile
                </button>
                <button
                  type="button"
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[#C95D55] transition hover:bg-[#FFF5F3]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#E5E5DF] bg-[#F7F6F2] px-4 py-2.5 lg:px-5">
        <div className="flex items-center gap-2 text-xs font-medium text-[#858B84]">
          <Sparkles className="h-3.5 w-3.5 text-[#B7D96B]" />
          <span>{dateLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/pos')}
            className="inline-flex items-center gap-2 rounded-full bg-[#B7D96B] px-3 py-1.5 text-xs font-bold text-[#202D28] shadow-sm transition hover:bg-[#A9CC54]"
          >
            <ScanLine className="h-3.5 w-3.5" />
            New POS Bill
          </button>
          <button
            type="button"
            onClick={() => navigate('/add-purchase')}
            className="inline-flex items-center gap-2 rounded-full border border-[#DCE8C6] bg-white px-3 py-1.5 text-xs font-bold text-[#242B26] transition hover:border-[#B7D96B]"
          >
            <Plus className="h-3.5 w-3.5" />
            New Purchase
          </button>
        </div>
      </div>
    </header>
  );
}
