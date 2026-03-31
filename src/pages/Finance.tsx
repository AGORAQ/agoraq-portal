import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  Wallet, 
  ArrowUpRight, 
  History, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  XCircle,
  AlertCircle,
  DollarSign,
  Send,
  RefreshCw,
  Save
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { db } from '@/services/db';
import { PaymentRequest } from '@/types';
import { formatCurrency } from '@/lib/utils';

export default function Finance() {
  const { user, updateUser } = useAuth();
  const { notify } = useNotification();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [pixKey, setPixKey] = useState(user?.pix_key || '');
  const [amount, setAmount] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [isUpdatingPix, setIsUpdatingPix] = useState(false);

  const minWithdrawal = 50;
  const availableBalance = (user?.saldo_acumulado || 0) - (user?.saldo_pago || 0);

  useEffect(() => {
    const loadRequests = async () => {
      if (user) {
        const all = await db.payment_requests.getAll(user);
        setRequests(all.sort((a, b) => 
          new Date(b.data_solicitacao).getTime() - new Date(a.data_solicitacao).getTime()
        ));
      }
    };
    loadRequests();

    if (user) {
      const sub = db.payment_requests.subscribe(user, (updatedRequests) => {
        setRequests(updatedRequests.sort((a, b) => 
          new Date(b.data_solicitacao).getTime() - new Date(a.data_solicitacao).getTime()
        ));
      });

      return () => sub.unsubscribe();
    }
  }, [user]);

  const handleUpdatePix = async () => {
    if (!pixKey) return;
    setIsUpdatingPix(true);
    try {
      await db.users.update(user!.id, { pix_key: pixKey });
      updateUser({ ...user!, pix_key: pixKey });
      notify('success', 'Chave PIX atualizada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar PIX:', error);
      notify('error', 'Erro ao atualizar chave PIX: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsUpdatingPix(false);
    }
  };

  const handleRequestPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRequesting) return;

    const val = parseFloat(amount);

    if (!pixKey) {
      notify('error', 'Por favor, cadastre sua chave PIX primeiro.');
      return;
    }

    if (isNaN(val) || val < minWithdrawal) {
      notify('error', `O valor mínimo para saque é ${formatCurrency(minWithdrawal)}`);
      return;
    }

    if (val > availableBalance) {
      notify('error', 'Saldo insuficiente.');
      return;
    }

    setIsRequesting(true);
    try {
      await db.payment_requests.create({
        usuario_id: user!.id,
        valor: val,
        chave_pix: pixKey,
      });

      setAmount('');
      
      // Refresh list
      const all = await db.payment_requests.getAll();
      setRequests(all.filter(r => r.usuario_id === user!.id).sort((a, b) => 
        new Date(b.data_solicitacao).getTime() - new Date(a.data_solicitacao).getTime()
      ));

      notify('success', 'Solicitação enviada com sucesso! Aguarde a aprovação do administrador.');
    } catch (error: any) {
      console.error('Erro ao solicitar pagamento:', error);
      notify('error', 'Erro ao solicitar pagamento: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsRequesting(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-white">Financeiro</h1>
          <p className="text-slate-400">Gerencie seus ganhos e solicitações de pagamento.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-900/20 rounded-lg text-emerald-400">
                <Wallet className="w-6 h-6" />
              </div>
              <Badge variant="outline" className="border-emerald-900/50 text-emerald-400 bg-emerald-900/10">Saldo Disponível</Badge>
            </div>
            <h3 className="text-3xl font-bold text-white">{formatCurrency(availableBalance)}</h3>
            <p className="text-sm text-slate-500 mt-1">Total acumulado: {formatCurrency(user?.saldo_acumulado || 0)}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-900/20 rounded-lg text-blue-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <Badge variant="outline" className="border-blue-900/50 text-blue-400 bg-blue-900/10">Total Pago</Badge>
            </div>
            <h3 className="text-3xl font-bold text-white">{formatCurrency(user?.saldo_pago || 0)}</h3>
            <p className="text-sm text-slate-500 mt-1">Pagamentos realizados com sucesso</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-900/20 rounded-lg text-amber-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <Badge variant="outline" className="border-amber-900/50 text-amber-400 bg-amber-900/10">Saque Mínimo</Badge>
            </div>
            <h3 className="text-3xl font-bold text-white">{formatCurrency(minWithdrawal)}</h3>
            <p className="text-sm text-slate-500 mt-1">Valor mínimo para solicitar resgate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PIX and Request */}
        <div className="space-y-6">
          <Card className="bg-slate-900 border-slate-800 shadow-xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                Dados para Recebimento
              </CardTitle>
              <CardDescription className="text-slate-500">Cadastre sua chave PIX para receber seus ganhos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Chave PIX</label>
                <Input 
                  value={pixKey} 
                  onChange={e => setPixKey(e.target.value)} 
                  placeholder="CPF, E-mail, Celular ou Chave Aleatória"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-none" 
                onClick={handleUpdatePix}
                disabled={isUpdatingPix}
              >
                {isUpdatingPix ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {isUpdatingPix ? 'Salvando...' : 'Salvar Chave PIX'}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-emerald-900/20 shadow-xl border-2">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                Solicitar Saque
              </CardTitle>
              <CardDescription className="text-slate-500">O valor será enviado para sua chave PIX cadastrada.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestPayment} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Valor do Saque</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input 
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0,00"
                      className="pl-9 bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-none py-6 text-lg font-bold"
                  disabled={isRequesting || availableBalance < minWithdrawal}
                >
                  {isRequesting ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
                  {isRequesting ? 'Enviando...' : 'Solicitar Pagamento'}
                </Button>
                {availableBalance < minWithdrawal && (
                  <p className="text-xs text-red-400 text-center">Saldo insuficiente para o saque mínimo.</p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <Card className="lg:col-span-2 bg-slate-900 border-slate-800 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <History className="w-5 h-5 text-blue-400" />
              Histórico de Solicitações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Chave PIX</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Obs. Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-4 text-slate-300">
                        {new Date(req.data_solicitacao).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 font-bold text-white">
                        {formatCurrency(req.valor)}
                      </td>
                      <td className="px-4 py-4 text-slate-400 truncate max-w-[150px]">
                        {req.chave_pix}
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="px-4 py-4 text-slate-500 italic">
                        {req.observacao_admin || '-'}
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        Nenhuma solicitação encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
