import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CommissionProvider } from '@/context/CommissionContext';
import Layout from '@/components/Layout';

// Lazy load pages
const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const UserRequests = lazy(() => import('@/pages/UserRequests'));
const SalesData = lazy(() => import('@/pages/SalesData'));
const Credentials = lazy(() => import('@/pages/Credentials'));
const Commissions = lazy(() => import('@/pages/Commissions'));
const Academy = lazy(() => import('@/pages/Academy'));
const Finance = lazy(() => import('@/pages/Finance'));
const PaymentAlerts = lazy(() => import('@/pages/PaymentAlerts'));
const FinancialReport = lazy(() => import('@/pages/FinancialReport'));
const Support = lazy(() => import('@/pages/Support'));
const CRM = lazy(() => import('@/pages/CRM'));
const AdminPanel = lazy(() => import('@/pages/AdminPanel'));
const AdminAnnouncements = lazy(() => import('@/pages/AdminAnnouncements'));
const Profile = lazy(() => import('@/pages/Profile'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const RequestAccess = lazy(() => import('@/pages/RequestAccess'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
  </div>
);

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
    </div>;
  }
  
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const RoleRoute = ({ children, roles }: { children: React.ReactNode, roles: string[] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
    </div>;
  }
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  if (user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CommissionProvider>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/solicitar-acesso" element={<RequestAccess />} />
              
              <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/solicitar-usuario" element={<PrivateRoute><UserRequests /></PrivateRoute>} />
              <Route path="/credenciais" element={<PrivateRoute><Credentials /></PrivateRoute>} />
              <Route path="/comissoes" element={<PrivateRoute><Commissions /></PrivateRoute>} />
              <Route path="/academy" element={<PrivateRoute><Academy /></PrivateRoute>} />
              <Route path="/financeiro" element={<PrivateRoute><Finance /></PrivateRoute>} />
              <Route path="/suporte" element={<PrivateRoute><Support /></PrivateRoute>} />
              <Route path="/crm" element={<PrivateRoute><CRM /></PrivateRoute>} />
              <Route path="/vendas" element={<PrivateRoute><SalesData /></PrivateRoute>} />
              <Route path="/perfil" element={<PrivateRoute><Profile /></PrivateRoute>} />
              
              {/* Protected Admin Routes */}
              <Route path="/admin" element={
                <RoleRoute roles={['admin', 'supervisor']}>
                  <AdminPanel />
                </RoleRoute>
              } />
              <Route path="/admin/pagamentos" element={
                <RoleRoute roles={['admin']}>
                  <PaymentAlerts />
                </RoleRoute>
              } />
              <Route path="/admin/financeiro" element={
                <RoleRoute roles={['admin']}>
                  <FinancialReport />
                </RoleRoute>
              } />
              <Route path="/admin/avisos" element={
                <RoleRoute roles={['admin']}>
                  <AdminAnnouncements />
                </RoleRoute>
              } />
            </Routes>
          </Suspense>
        </CommissionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
