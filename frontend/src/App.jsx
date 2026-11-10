import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';

// Pages
import Dashboard from './pages/Dashboard';
import Parties from './pages/Parties';
import Items from './pages/Items';
import AddItem from './pages/AddItem';
import SalesInvoices from './pages/SalesInvoices';
import AddSale from './pages/AddSale';
import PurchaseBills from './pages/PurchaseBills';
import AddPurchase from './pages/AddPurchase';
import CashInHand from './pages/CashInHand';
import BankAccounts from './pages/BankAccounts';
import AddBankAccount from './pages/AddBankAccount';
import SyncAndShare from './pages/SyncAndShare';
import EditProfile from './pages/EditProfile';
import PlansAndPricing from './pages/PlansAndPricing';
import OrderSummary from './pages/OrderSummary';
import Reports from './pages/Reports';
import Login from './pages/Login';
import POSBilling from './pages/POSBilling';
import SalesReturns from './pages/SalesReturns';
import Expenses from './pages/Expenses';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';

// Protected Route Guard
function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) {
    return <div className="h-screen flex items-center justify-center text-xs text-gray-500">Loading ApexBill Application...</div>;
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Main App Layout */}
      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="parties" element={<Parties />} />
        <Route path="items" element={<Items />} />
        <Route path="items/add" element={<AddItem />} />
        <Route path="items/edit/:id" element={<AddItem />} />
        <Route path="items/:id" element={<AddItem />} />
        <Route path="sales" element={<SalesInvoices />} />
        <Route path="add-sale" element={<AddSale />} />
        <Route path="purchases" element={<PurchaseBills />} />
        <Route path="add-purchase" element={<AddPurchase />} />
        <Route path="cash-in-hand" element={<CashInHand />} />
        <Route path="bank-accounts" element={<BankAccounts />} />
        <Route path="bank-accounts/add" element={<AddBankAccount />} />
        <Route path="sync-share" element={<SyncAndShare />} />
        <Route path="edit-profile" element={<EditProfile />} />
        <Route path="plans" element={<PlansAndPricing />} />
        <Route path="order-summary" element={<OrderSummary />} />
        <Route path="reports" element={<Reports />} />
        <Route path="pos" element={<POSBilling />} />
        <Route path="returns" element={<SalesReturns />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="customers" element={<Customers />} />
        <Route path="suppliers" element={<Suppliers />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
