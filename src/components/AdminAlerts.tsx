import React, { useState, useEffect } from 'react';
import { Bell, Check, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/db';
import { useNavigate } from 'react-router-dom';

interface AlertItem {
  id: string;
  type: 'user_request' | 'payment_request' | 'seller_request';
  title: string;
  sellerName: string;
  date: string;
  link: string;
  viewed: boolean;
}

export default function AdminAlerts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [viewedIds, setViewedIds] = useState<string[]>([]);

  useEffect(() => {
    if (user?.role !== 'admin') return;

    // Load viewed IDs from localStorage
    const savedViewed = localStorage.getItem('admin_viewed_alerts');
    if (savedViewed) {
      setViewedIds(JSON.parse(savedViewed));
    }

    const fetchAlerts = async () => {
      const newAlerts: AlertItem[] = [];

      // User Requests
      const allRequests = await db.access_requests.getAll();
      const requests = allRequests.filter(r => r.status === 'Aguardando Documentos' || r.status === 'Pendente');
      requests.forEach(req => {
        newAlerts.push({
          id: `req_${req.id}`,
          type: 'user_request',
          title: 'Nova solicitação de usuário',
          sellerName: req.name,
          date: req.createdAt,
          link: '/admin', // Navigate to admin panel where requests are usually managed
          viewed: false // We check against viewedIds later
        });
      });

      // Payment Requests
      const allPayments = await db.payment_requests.getAll();
      const payments = allPayments.filter(p => p.status === 'Pendente');
      
      // Fetch all users to map names
      const allUsers = await db.users.getAll();
      const usersMap = new Map(allUsers.map(u => [u.id, u.name]));

      payments.forEach(pay => {
        const sellerName = usersMap.get(pay.usuario_id);
        newAlerts.push({
          id: `pay_${pay.id}`,
          type: 'payment_request',
          title: 'Solicitação de Pagamento',
          sellerName: typeof sellerName === 'string' ? sellerName : 'Vendedor Desconhecido',
          date: pay.data_solicitacao,
          link: '/admin/pagamentos',
          viewed: false
        });
      });

      // Sort by date desc
      newAlerts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAlerts(newAlerts);
    };

    fetchAlerts();
    // Poll every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAsViewed = (id: string) => {
    const newViewed = [...viewedIds, id];
    setViewedIds(newViewed);
    localStorage.setItem('admin_viewed_alerts', JSON.stringify(newViewed));
  };

  const handleOpenAlert = (alert: AlertItem) => {
    handleMarkAsViewed(alert.id);
    setIsOpen(false);
    navigate(alert.link);
  };

  if (user?.role !== 'admin') return null;

  const unviewedCount = alerts.filter(a => !viewedIds.includes(a.id)).length;

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative text-slate-500 hover:text-blue-600 hover:bg-blue-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-6 h-6" />
        {unviewedCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse">
            {unviewedCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <Card className="absolute right-0 top-12 w-80 md:w-96 z-50 shadow-xl border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="p-4 border-b bg-slate-50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-700">Notificações ({unviewedCount})</CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Nenhuma notificação no momento.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {alerts.map(alert => {
                    const isViewed = viewedIds.includes(alert.id);
                    return (
                      <div 
                        key={alert.id} 
                        className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${isViewed ? 'opacity-60' : 'bg-blue-50/30'}`}
                        onClick={() => handleOpenAlert(alert)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            alert.type === 'payment_request' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {alert.type === 'payment_request' ? 'Financeiro' : 'Solicitação'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(alert.date).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-medium text-slate-800 mb-1">{alert.title}</h4>
                        <p className="text-xs text-slate-500">
                          Enviada por <span className="font-semibold">{alert.sellerName}</span>
                        </p>
                        {!isViewed && (
                          <div className="mt-2 flex justify-end">
                            <span className="text-[10px] text-blue-600 font-medium flex items-center">
                              Clique para ver <ExternalLink className="w-3 h-3 ml-1" />
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
