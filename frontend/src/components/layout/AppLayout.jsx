import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import TopHeader from './TopHeader';
import Sidebar from './Sidebar';
import QuickSearchModal from '../modals/QuickSearchModal';

export default function AppLayout() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F3EF] text-[#242B26]">
      <div className="flex h-screen flex-col overflow-hidden">
        <TopHeader onOpenSearch={() => setIsSearchOpen(true)} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar onOpenSearch={() => setIsSearchOpen(true)} />

          <main className="flex-1 overflow-y-auto bg-[#F4F3EF] p-3 lg:p-4 xl:p-5">
            <div className="mx-auto max-w-[1600px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <QuickSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
