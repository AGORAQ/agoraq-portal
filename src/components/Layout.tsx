import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  UserPlus, 
  KeyRound, 
  Table2, 
  Bell, 
  GraduationCap, 
  BookOpen, 
  HeadphonesIcon, 
  Database,
  Cpu,
  Menu,
  X,
  LogOut,
  User,
  DollarSign,
  Settings,
  Wallet,
  Calculator,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Logo from './Logo';
import Chatbot from './Chatbot';
import { DailyGoalModal } from './DailyGoalModal';
import { ContractAgreementModal } from './ContractAgreementModal';
import { db } from '@/services/db';
import AdminAlerts from './AdminAlerts';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    // Check Supabase connection status if needed
    const checkStatus = async () => {
      await db.status.check();
    };
    checkStatus();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  interface NavigationItem {
    icon: any;
    label: string;
    path: string;
    badge?: number;
    adminOnly?: boolean;
    external?: boolean;
  }

  // Define all possible items in order
  const allNavItems: NavigationItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: UserPlus, label: 'Solicitar Usuário', path: '/solicitar-usuario' },
    { icon: KeyRound, label: 'Usuário Bancos', path: '/credenciais' },
    { icon: Table2, label: 'Tabela de Comissão', path: '/comissoes' },
    { icon: DollarSign, label: 'Vendas', path: '/vendas' },
    { icon: Cpu, label: 'Gestão de Automação', path: '/crm' },
    { icon: Wallet, label: 'Financeiro', path: '/financeiro' },
    { icon: BarChart3, label: 'Relatório Financeiro', path: '/admin/financeiro', adminOnly: true },
    { icon: GraduationCap, label: 'AgoraQ Academy', path: '/academy' },
    { icon: HeadphonesIcon, label: 'Suporte', path: '/suporte' },
    { icon: Settings, label: 'Administração', path: '/admin', adminOnly: true },
  ];

  // Filter items based on role
  const navItems = allNavItems.filter(item => !item.adminOnly || user?.role === 'admin');

  // Add Payment Alerts for Admin (special case, maybe keep it separate or integrate? User didn't list it in the main order but "Sistema de Alertas" is separate. The prompt says "Reorganizar o menu lateral...". It didn't mention "Alertas Pagamento" explicitly in the list, but maybe it's part of "Administração" or "Financeiro". I'll keep it if it was there, or remove if it's redundant. The prompt listed specific items. "Alertas Pagamento" was in the previous code. I'll remove it from the sidebar if it's not in the requested list, or maybe "Financeiro" covers it? "Financeiro" usually is for the user. "Relatório Financeiro" is for admin. I'll stick to the requested list. The "Alertas Pagamento" link might be accessible via the new Alert System).

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-20 shadow-xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-center">
          <Logo variant="light" />
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => (
              item.external ? (
                <a
                  key={item.path}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                </a>
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                    location.pathname === item.path 
                      ? "bg-blue-600 text-white shadow-md" 
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <Link to="/perfil" className="flex items-center gap-3 mb-4 px-2 hover:bg-slate-800 rounded-lg p-2 transition-colors">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0) || <User className="w-6 h-6" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{user?.role}</p>
            </div>
          </Link>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 z-30 flex items-center justify-between px-4 shadow-md">
        <Logo variant="light" className="scale-75 origin-left" />
        <div className="flex items-center gap-2">
           {/* Mobile Alert Icon */}
           {user?.role === 'admin' && <AdminAlerts />}
           <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
             {isMobileMenuOpen ? <X /> : <Menu />}
           </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-20 bg-slate-900 pt-16">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => (
              item.external ? (
                <a
                  key={item.path}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-slate-300 hover:bg-slate-800"
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                </a>
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                    location.pathname === item.path 
                      ? "bg-blue-600 text-white" 
                      : "text-slate-300 hover:bg-slate-800"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            ))}
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:bg-slate-800 w-full rounded-lg mt-4 border-t border-slate-800"
            >
              <LogOut className="w-5 h-5" />
              Sair
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 overflow-y-auto h-screen flex flex-col">
        {/* Desktop Header for Alerts */}
        <div className="hidden md:flex justify-end mb-4">
          {user?.role === 'admin' && <AdminAlerts />}
        </div>
        
        <div className="max-w-7xl mx-auto w-full flex-1">
          {children}
        </div>
      </main>

      {/* Chatbot */}
      <Chatbot />
      
      {/* Daily Goal Modal */}
      <DailyGoalModal />

      {/* Contract Agreement Modal */}
      <ContractAgreementModal />
    </div>
  );
}
