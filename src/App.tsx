import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Toaster } from './components/ui/sonner';

// Lazy loading to prevent circular dependencies in this single file build
const UserDashboard = React.lazy(() => import('./pages/user/UserDashboard'));
const RentalRequestForm = React.lazy(() => import('./pages/user/RentalRequestForm'));
const RentalHistory = React.lazy(() => import('./pages/user/RentalHistory'));
const ContactUs = React.lazy(() => import('./pages/user/ContactUs'));
const PurchaseRequestForm = React.lazy(() => import('./pages/user/PurchaseRequestForm'));
const PurchaseHistory = React.lazy(() => import('./pages/user/PurchaseHistory'));
const InventoryView = React.lazy(() => import('./pages/user/InventoryView'));

const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const Inventory = React.lazy(() => import('./pages/admin/Inventory'));
const ManageRequests = React.lazy(() => import('./pages/admin/ManageRequests'));
const ActiveRentals = React.lazy(() => import('./pages/admin/ActiveRentals'));
const ManagePurchaseRequests = React.lazy(() => import('./pages/admin/ManagePurchaseRequests'));
const RequestsHistory = React.lazy(() => import('./pages/admin/RequestsHistory'));
const UserManagement = React.lazy(() => import('./pages/admin/UserManagement'));
const ProfileSettings = React.lazy(() => import('./pages/admin/ProfileSettings'));

export default function App() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center font-sans text-slate-400 text-xs font-bold uppercase tracking-widest">Loading TechRent...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster />
      </div>
    );
  }

  return (
    <>
      <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center font-sans text-slate-400 text-xs font-bold uppercase tracking-widest">Loading Component...</div>}>
        <Routes>
          <Route path="/" element={<Layout />}>
            {role === 'blocked' ? (
              <Route path="*" element={<div className="min-h-screen flex items-center justify-center font-sans"><div className="text-center space-y-4"><h1 className="text-2xl font-black text-rose-600">Access Denied</h1><p className="text-sm text-slate-500 max-w-md mx-auto">Your account has been blocked by an administrator. If you believe this is a mistake, please contact support.</p></div></div>} />
            ) : role === 'admin' ? (
              <>
                <Route index element={<Navigate to="/admin" replace />} />
                <Route path="admin" element={<AdminDashboard />} />
                <Route path="admin/inventory" element={<Inventory />} />
                <Route path="admin/requests" element={<ManageRequests />} />
                <Route path="admin/purchases" element={<ManagePurchaseRequests />} />
                <Route path="admin/active" element={<ActiveRentals />} />
                <Route path="admin/history" element={<RequestsHistory />} />
                <Route path="admin/users" element={<UserManagement />} />
                <Route path="admin/settings" element={<ProfileSettings />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </>
            ) : (
              <>
                <Route index element={<UserDashboard />} />
                <Route path="inventory" element={<InventoryView />} />
                <Route path="request" element={<RentalRequestForm />} />
                <Route path="purchase" element={<PurchaseRequestForm />} />
                <Route path="history" element={<RentalHistory />} />
                <Route path="purchase-history" element={<PurchaseHistory />} />
                <Route path="contact" element={<ContactUs />} />
                <Route path="settings" element={<ProfileSettings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Route>
        </Routes>
      </React.Suspense>
      <Toaster />
    </>
  );
}
