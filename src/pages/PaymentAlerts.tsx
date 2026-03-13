import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  DollarSign, 
  User, 
  CreditCard,
  Send,
  Filter,
  ArrowRight
} from 'lucide-react';
import { db } from '@/services/db';
import { PaymentRequest, User as SystemUser } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

export default function PaymentAlerts() {
  const { user: currentUser } = useAuth();
  const { notify } = useNotification();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Pendente');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [obs, setObs] = useState('');

  const loadData = async () => {
    const [allRequests, allUsers] = await Promise.all([
      db.payment_requests.getAll(),
      db.users.getAll()
    ]);
    setRequests(allRequests.sort((a, b) => 
      new Date(b.data_solicitacao).getTime() - new Date(a.data_solicitacao).getTime()
    ));
    setUsers(allUsers);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (id: string, action: 'Aprovado' | 'Recusado' | 'Pago') => {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    const updates: Partial<PaymentRequest> = {
      status: action,
      observacao_admin: obs || undefined,
      aprovado_por: currentUser?.name || 'Admin',
    };

    if (action === 'Aprovado') {
      updates.data_aprovacao = new Date().toISOString();
    } else if (action === 'Pago') {
      if (req.status !== 'Aprovado' && req.status !== 'Pendente') {
        notify('error', 'Apenas solicitações Pendentes ou Aprovadas podem ser marcadas como Pagas.');
        return;
      }
      updates.data_pagamento = new Date().toISOString();
      
      // Update user balance
      const user = users.find(u => u.id === req.usuario_id);
      if (user) {
        const currentPaid = user.saldo_pago || 0;
        await db.users.update(user.id, { saldo_pago: currentPaid + req.valor });
      }
    }

    await db.payment_requests.update(id, updates);
    setObs('');
    setIsProcessing(null);
    await loadData();
    notify('success', `Solicitação marcada como ${action} com sucesso!`);
  };

  const filteredRequests = requests.filter(r => {
    const user = users.find(u => u.id === r.usuario_id);
    const matchesSearch = user?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         r.chave_pix.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pago': return <Badge variant="success" className="bg-emerald-900/30 text-emerald-400 border-emerald-900/50"><CheckCircle2 className="w-3 h-3 mr-1" /> Pago</Badge>;
      case 'Aprovado': return <Badge className="bg-blue-900/30 text-blue-400 border-blue-900/50"><Clock className="w-3 h-3 mr-1" /> Aprovado</Badge>;
      case 'Recusado': return <Badge variant="destructive" className="bg-red-900/30 text-red-400 border-red-900/50"><XCircle className="w-3 h-3 mr-1" /> Recusado</Badge>;
      default: return <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-400"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-6 min-h-screen bg-slate-950 -m-4 md:-m-8 p-4 md:p-8 text-slate-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            Alertas de Pagamento
          </h1>
          <p className="text-slate-400">Gerencie as solicitações de saque dos vendedores.</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800 shadow-xl">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Buscar por vendedor ou PIX..." 
                className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-emerald-500" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <select 
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos os Status</option>
                <option value="Pendente">Pendentes</option>
                <option value="Aprovado">Aprovados</option>
                <option value="Pago">Pagos</option>
                <option value="Recusado">Recusados</option>
              </select>
            </div>
            <div className="flex items-center justify-end">
              <Badge variant="outline" className="bg-amber-900/20 text-amber-400 border-amber-900/50">
                {requests.filter(r => r.status === 'Pendente').length} Pendentes
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        {filteredRequests.map((req) => {
          const user = users.find(u => u.id === req.usuario_id);
          const isSelected = isProcessing === req.id;

          return (
            <Card key={req.id} className={`bg-slate-900 border-slate-800 hover:border-slate-700 transition-all duration-300 ${isSelected ? 'ring-2 ring-emerald-500' : ''}`}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                  {/* Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400 font-bold text-xl">
                          {user?.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-white">{user?.name}</h3>
                          <p className="text-xs text-slate-500">{user?.email}</p>
                        </div>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-y border-slate-800">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Valor Solicitado</p>
                        <p className="text-xl font-bold text-emerald-400">{formatCurrency(req.valor)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Chave PIX</p>
                        <p className="text-sm font-medium text-white flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-slate-500" />
                          {req.chave_pix}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Data Solicitação</p>
                        <p className="text-sm text-slate-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {new Date(req.data_solicitacao).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {req.observacao_admin && (
                      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                        <p className="text-xs text-slate-400 italic">Obs: {req.observacao_admin}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="lg:w-80 flex flex-col justify-center gap-3">
                    {req.status === 'Pendente' && !isSelected && (
                      <div className="grid grid-cols-2 gap-2">
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-none" onClick={() => handleAction(req.id, 'Aprovado')}>
                          Aprovar
                        </Button>
                        <Button variant="destructive" className="bg-red-900/30 text-red-400 border-red-900/50" onClick={() => setIsProcessing(req.id)}>
                          Recusar
                        </Button>
                      </div>
                    )}

                    {(req.status === 'Aprovado' || req.status === 'Pendente') && !isSelected && (
                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white border-none" onClick={() => handleAction(req.id, 'Pago')}>
                        <DollarSign className="w-4 h-4 mr-2" />
                        Marcar como Pago
                      </Button>
                    )}

                    {isSelected && (
                      <div className="space-y-3 animate-in slide-in-from-right-4 duration-200">
                        <Input 
                          placeholder="Motivo da recusa..." 
                          value={obs} 
                          onChange={e => setObs(e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="ghost" className="text-slate-400 hover:bg-slate-800" onClick={() => setIsProcessing(null)}>
                            Cancelar
                          </Button>
                          <Button variant="destructive" onClick={() => handleAction(req.id, 'Recusado')}>
                            Confirmar
                          </Button>
                        </div>
                      </div>
                    )}

                    {req.status === 'Pago' && (
                      <div className="text-center p-4 bg-emerald-900/10 rounded-xl border border-emerald-900/20">
                        <p className="text-xs text-emerald-400 font-medium">Pagamento realizado em:</p>
                        <p className="text-sm text-white font-bold">{new Date(req.data_pagamento!).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-900 rounded-xl border-2 border-dashed border-slate-800">
            <CheckCircle2 className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhuma solicitação encontrada</p>
            <p className="text-sm">Tudo em dia por aqui!</p>
          </div>
        )}
      </div>
    </div>
  );
}
