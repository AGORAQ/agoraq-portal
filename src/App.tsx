import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { CommissionProvider } from '@/context/CommissionContext';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import UserRequests from '@/pages/UserRequests';
import SalesData from '@/pages/SalesData';
import Credentials from '@/pages/Credentials';
import Commissions from '@/pages/Commissions';
import Academy from '@/pages/Academy';
import Finance from '@/pages/Finance';
import Simulator from '@/pages/Simulator';
import PaymentAlerts from '@/pages/PaymentAlerts';
import FinancialReport from '@/pages/FinancialReport';
import Support from '@/pages/Support';
import CRM from '@/pages/CRM';
import AdminPanel from '@/pages/AdminPanel';
import AdminAnnouncements from '@/pages/AdminAnnouncements';
import Profile from '@/pages/Profile';
import ResetPassword from '@/pages/ResetPassword';
import RequestAccess from '@/pages/RequestAccess';

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
            <Route path="/simulador" element={<PrivateRoute><Simulator /></PrivateRoute>} />
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
        </CommissionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
