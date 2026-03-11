import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Search, Plus, Trash2, Edit, X, Save, TrendingUp, DollarSign, Wallet, BellRing, CheckCircle2, Download, Lightbulb, Sparkles, Target, Trophy } from 'lucide-react';
import { formatCurrency, maskCPF, maskPhone, validateCPF } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useCommission } from '@/context/CommissionContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { db } from '@/services/db';
import { Sale, PaymentRequest } from '@/types';
import GlobalImporter from '@/components/GlobalImporter';
import * as XLSX from 'xlsx';

export default function SalesData() {
  const { user } = useAuth();
  const { commissions } = useCommission();
  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor';
  const isManagement = isAdmin || isSupervisor;

  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGlobalImporterOpen, setIsGlobalImporterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'financial'>('list');
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [sellerFilter, setSellerFilter] = useState('Todos');
  const [bankFilter, setBankFilter] = useState('Todos');
  const [productFilter, setProductFilter] = useState('Todos');

  // PIX Request State
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('cpf');
  const [pixRequests, setPixRequests] = useState<PaymentRequest[]>([]);
  const [showPixRequestsList, setShowPixRequestsList] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    proposal: '',
    client: '',
    cpf: '',
    phone: '',
    bank: '',
    product: '',
    operacao: '',
    value: '',
    status: 'Pendente' as Sale['status'],
    seller: user?.name || '',
    commission: 0,
    companyCommission: 0,
    bankCommission: 0,
    table_name: ''
  });

  // Auto-calculate commissions when bank, product, operation or value changes
  useEffect(() => {
    if (formData.bank && formData.product && formData.operacao && formData.value) {
      const selectedTable = commissions.find(c => 
        c.banco === formData.bank && 
        c.produto === formData.product && 
        c.operacao === formData.operacao
      );

      if (selectedTable) {
        const saleValue = parseFloat(formData.value) || 0;
        let sellerRate = 0;
        if (selectedTable.percentual_vendedor !== undefined) {
          sellerRate = selectedTable.percentual_vendedor / 100;
        } else {
          const userGroup = user?.grupo_comissao;
          if (userGroup === 'MASTER') sellerRate = selectedTable.comissao_master / 100;
          else if (userGroup === 'OURO') sellerRate = selectedTable.comissao_ouro / 100;
          else if (userGroup === 'PRATA') sellerRate = selectedTable.comissao_prata / 100;
          else if (userGroup === 'PLUS') sellerRate = selectedTable.comissao_plus / 100;
        }

        const bankRate = (selectedTable.percentual_total_empresa || selectedTable.bank_rate || 0) / 100;
        
        setFormData(prev => ({
          ...prev,
          table_name: selectedTable.nome_tabela,
          bankCommission: saleValue * bankRate,
          companyCommission: (saleValue * bankRate) - (saleValue * sellerRate),
          commission: saleValue * sellerRate
        }));
      }
    }
  }, [formData.bank, formData.product, formData.operacao, formData.value, commissions, user]);

  const refreshData = async () => {
    const [allSales, allPixRequests] = await Promise.all([
      db.sales.getAll(),
      db.payment_requests.getAll()
    ]);
    setSales(allSales);
    setPixRequests(allPixRequests);
  };

  useEffect(() => {
    refreshData();
  }, []);


  // Motivational Tips
  const conversionTips = [
    "Dica de Ouro, {name}: Ouça mais do que fale. Entender a dor do cliente é a chave para a venda.",
    "Persistência, {name}: 80% das vendas acontecem após o 5º contato. Não desista!",
    "Empatia: Coloque-se no lugar do cliente, {name}. O que você compraria se estivesse na situação dele?",
    "Fechamento: Use perguntas abertas, {name}. 'O que falta para fecharmos agora?' ao invés de 'Quer fechar?'"
  ];
  const [currentTip, setCurrentTip] = useState(conversionTips[0]);

  useEffect(() => {
    const userName = user?.name?.split(' ')[0] || 'Campeão';
    const interval = setInterval(() => {
      const randomTip = conversionTips[Math.floor(Math.random() * conversionTips.length)];
      setCurrentTip(randomTip.replace('{name}', userName));
    }, 10000); // Rotate every 10s
    
    // Initial set
    setCurrentTip(conversionTips[0].replace('{name}', userName));

    return () => clearInterval(interval);
  }, [user]);

  // Derived state for available tables based on selected bank
  const availableBanks = Array.from(new Set(commissions.map(c => c.banco || c.bank)));
  const availableTables = commissions.filter(c => (c.banco || c.bank) === formData.bank);
  
  // Get unique values for filters
  const uniqueSellers = Array.from(new Set(sales.map(s => s.seller))).filter(Boolean).sort();
  const uniqueBanksInSales = Array.from(new Set(sales.map(s => s.bank))).filter(Boolean).sort();
  const uniqueProductsInSales = Array.from(new Set(sales.map(s => s.product))).filter(Boolean).sort();

  // Daily Goal Logic
  const [dailyGoal, setDailyGoal] = useState<number>(0);
  const [todaySalesCount, setTodaySalesCount] = useState<number>(0);

  useEffect(() => {
    const updateGoalData = () => {
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      const storageKey = `daily_goal_${today}_${user.id || user.email}`;
      const savedGoal = localStorage.getItem(storageKey);
      setDailyGoal(savedGoal ? parseInt(savedGoal) : 0);

      // Calculate today's sales for the current user
      const count = sales.filter(s => 
        s.date === today && 
        (s.seller === user.name || user.role === 'admin') // Admin sees all, seller sees theirs? 
        // Actually, goal is usually personal. Let's filter by seller if not admin, or maybe just count user's sales.
        // The prompt implies personal goal ("sua meta").
        // If I am admin, I might have a personal sales goal too?
        // Let's assume the goal tracks the logged-in user's sales.
      ).filter(s => s.seller === user.name).length;
      
      setTodaySalesCount(count);
    };

    updateGoalData();

    // Listen for goal updates from the modal
    window.addEventListener('goalUpdated', updateGoalData);
    return () => window.removeEventListener('goalUpdated', updateGoalData);
  }, [user, sales]);

  const handleInputChange = (field: string, value: string) => {
    let finalValue = value;
    if (field === 'cpf') finalValue = maskCPF(value);
    if (field === 'phone') finalValue = maskPhone(value);

    setFormData(prev => ({ ...prev, [field]: finalValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!validateCPF(formData.cpf)) {
      alert('CPF inválido. Por favor, verifique os dados.');
      return;
    }
    
    const saleData = {
      ...formData,
      value: parseFloat(formData.value) || 0,
    };

    const newSale = await db.sales.create(saleData, user);
    await refreshData();
    setIsFormOpen(false);

    // Motivational Success Message
    const userName = user?.name?.split(' ')[0] || 'Campeão';
    const motivationalMessages = [
      "Parabéns, {name}! Mais uma venda para a conta! 🚀",
      "Excelente trabalho, {name}! Você está cada vez mais perto da sua meta! 🌟",
      "Show de bola, {name}! Continue assim e o céu é o limite! 🏆",
      "Venda registrada! Sua dedicação faz a diferença, {name}! 💎"
    ];
    
    let alertMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)].replace('{name}', userName);
    
    // Check Goal Progress
    const today = new Date().toISOString().split('T')[0];
    if (newSale.date === today && dailyGoal > 0) {
      const newCount = todaySalesCount + 1;
      const remaining = dailyGoal - newCount;
      
      if (remaining > 0) {
        alertMessage += `\n\n🎯 Meta do Dia: Faltam apenas ${remaining} venda(s) para atingir seu objetivo! Vamos lá!`;
      } else if (remaining === 0) {
        alertMessage += `\n\n🏆 META ATINGIDA! Parabéns, você alcançou seu objetivo de ${dailyGoal} vendas hoje!`;
      } else {
        alertMessage += `\n\n🚀 INCRÍVEL! Você já superou sua meta em ${Math.abs(remaining)} venda(s)!`;
      }
    }

    alert(`${alertMessage}\n\nVenda de ${formatCurrency(newSale.value)} registrada com sucesso.`);

    setFormData({
      date: new Date().toISOString().split('T')[0],
      proposal: '',
      client: '',
      cpf: '',
      phone: '',
      bank: '',
      product: '',
      operacao: '',
      value: '',
      status: 'Pendente',
      seller: user?.name || ''
    });
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = 
      sale.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.proposal.includes(searchTerm) ||
      sale.bank.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.product && sale.product.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'Todos' || sale.status === statusFilter;
    const matchesBank = bankFilter === 'Todos' || sale.bank === bankFilter;
    const matchesProduct = productFilter === 'Todos' || sale.product === productFilter;
    
    // Restrict visibility: Management see all (filtered by selection), Sellers see only their own
    const matchesSeller = isManagement 
      ? (sellerFilter === 'Todos' || sale.seller === sellerFilter)
      : sale.seller === user?.name;
    
    const saleDate = new Date(sale.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    const matchesDate = (!start || saleDate >= start) && (!end || saleDate <= end);

    return matchesSearch && matchesStatus && matchesBank && matchesProduct && matchesDate && matchesSeller;
  });

  const handleExport = () => {
    if (filteredSales.length === 0) {
      alert('Não há vendas para exportar.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(filteredSales.map(sale => ({
      Data: sale.date,
      Proposta: sale.proposal,
      Cliente: sale.client,
      CPF: sale.cpf,
      Banco: sale.bank,
      Tabela: sale.table_name || sale.table,
      Valor: sale.value,
      'Comissão Vendedor': sale.commission || 0,
      'Comissão Empresa': sale.companyCommission || 0,
      'Comissão Banco': sale.bankCommission || 0,
      Status: sale.status,
      Vendedor: sale.seller
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas");
    XLSX.writeFile(workbook, `vendas_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalSales = filteredSales.reduce((acc, curr) => acc + curr.value, 0);
  const totalCommission = filteredSales.reduce((acc, curr) => acc + (curr.commission || 0), 0);
  
  // Strategic metrics - only for management
  const totalCompanyCommission = isManagement ? filteredSales.reduce((acc, curr) => acc + (curr.companyCommission || 0), 0) : 0;
  const totalBankCommission = isManagement ? filteredSales.reduce((acc, curr) => acc + (curr.bankCommission || 0), 0) : 0;
  const totalProfit = totalCompanyCommission;

  // Chart Data Preparation
  const chartData = [
    { name: 'Faturado', value: totalBankCommission },
    { name: 'Pago Vendedor', value: totalCommission },
    { name: 'Lucro Líquido', value: totalProfit },
  ];

  const handlePixRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRequest: Omit<PaymentRequest, 'id' | 'status' | 'data_solicitacao'> = {
      usuario_id: user?.id || '',
      valor: totalCommission,
      chave_pix: pixKey,
      banco_id: '',
      grupo_id: ''
    };
    await db.payment_requests.create(newRequest);
    await refreshData();
    setIsPixModalOpen(false);
    alert('Solicitação de PIX enviada com sucesso!');
  };

  const pendingPixCount = pixRequests.filter(r => r.status === 'Pendente').length;

  return (
    <div className="space-y-6">
      {/* Motivational Banner */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10">
          <Sparkles className="w-40 h-40" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-300" />
              Potencialize suas Vendas, {user?.name?.split(' ')[0] || 'Campeão'}!
            </h2>
            <p className="text-indigo-100 max-w-xl">
              Não esqueça de registrar cada venda. O controle total é o primeiro passo para bater suas metas e alcançar a liberdade financeira.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/20 max-w-sm">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-yellow-300 shrink-0 mt-1" />
              <div>
                <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-1">Dica de Conversão</p>
                <p className="text-sm font-medium leading-snug">"{currentTip}"</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Goal Widget */}
      {dailyGoal > 0 && (
        <Card className="border-indigo-100 shadow-md">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 flex-1">
                <div className="p-3 bg-indigo-100 rounded-full">
                  <Target className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Meta de Hoje: {dailyGoal} Vendas</h3>
                  <p className="text-sm text-slate-500">
                    Você já realizou <span className="font-bold text-indigo-600">{todaySalesCount}</span> vendas hoje.
                  </p>
                </div>
              </div>

              <div className="flex-1 w-full md:max-w-md">
                <div className="flex justify-between text-xs font-medium mb-2">
                  <span className="text-slate-500">Progresso</span>
                  <span className={todaySalesCount >= dailyGoal ? "text-emerald-600 font-bold" : "text-indigo-600 font-bold"}>
                    {Math.round((todaySalesCount / dailyGoal) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      todaySalesCount >= dailyGoal ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min((todaySalesCount / dailyGoal) * 100, 100)}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-right">
                  {todaySalesCount < dailyGoal ? (
                    <span className="text-indigo-600 flex items-center justify-end gap-1">
                      <TrendingUp className="w-3 h-3" /> Faltam {dailyGoal - todaySalesCount} para a meta!
                    </span>
                  ) : (
                    <span className="text-emerald-600 flex items-center justify-end gap-1 font-bold">
                      <Trophy className="w-3 h-3" /> Meta Batida! Parabéns!
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Vendas</h1>
          <p className="text-slate-500">Controle de produção e comissionamento.</p>
        </div>
        <div className="flex gap-2">
          {isManagement && (
            <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeTab === 'list' ? 'bg-white shadow text-blue-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Lista de Vendas
              </button>
              <button
                onClick={() => setActiveTab('financial')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeTab === 'financial' ? 'bg-white shadow text-blue-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Financeiro
              </button>
            </div>
          )}
          
          {!isManagement && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 mr-2" onClick={() => setIsPixModalOpen(true)}>
              <Wallet className="w-4 h-4 mr-2" />
              Solicitar PIX ({formatCurrency(totalCommission)})
            </Button>
          )}

          {isManagement && (
            <Button variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 mr-2" onClick={() => setIsGlobalImporterOpen(true)}>
              <Download className="w-4 h-4 mr-2" />
              Importar Vendas
            </Button>
          )}

          <Button className="bg-blue-900 hover:bg-blue-800" onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Venda
          </Button>
        </div>
      </div>

      {isManagement && pendingPixCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3 text-amber-800 animate-in fade-in slide-in-from-top-4 duration-500">
          <BellRing className="h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <span className="font-bold">Solicitações de Comissão:</span> Existem {pendingPixCount} pedidos de saque via PIX pendentes.
          </div>
          <Button size="sm" variant="outline" className="bg-white border-amber-200 text-amber-800 hover:bg-amber-100" onClick={() => setShowPixRequestsList(!showPixRequestsList)}>
            {showPixRequestsList ? 'Ocultar Pedidos' : 'Ver Pedidos'}
          </Button>
        </div>
      )}

      {isManagement && showPixRequestsList && (
        <Card className="border-amber-200 shadow-md mb-6 animate-in fade-in slide-in-from-top-2">
          <CardHeader className="bg-amber-50/50 pb-3">
            <CardTitle className="text-lg text-amber-900">Pedidos de Saque Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Vendedor</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Chave PIX</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pixRequests.filter(r => r.status === 'Pendente').map((req) => (
                    <tr key={req.id} className="border-b hover:bg-slate-50/50">
                      <td className="px-4 py-3">{req.date}</td>
                      <td className="px-4 py-3 font-medium">{req.sellerName}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600">{formatCurrency(req.amount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-mono">{req.pixKey}</span>
                          <span className="text-xs text-slate-500 uppercase">{req.pixKeyType}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={async () => {
                            await db.payment_requests.update(req.id, { status: 'Pago' });
                            await refreshData();
                            alert('Pagamento marcado como realizado!');
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Marcar Pago
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {isPixModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="flex flex-row items-center justify-between bg-emerald-600 text-white rounded-t-xl">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Solicitar Saque via PIX
              </CardTitle>
              <Button variant="ghost" size="icon" className="text-white hover:bg-emerald-700" onClick={() => setIsPixModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handlePixRequest} className="space-y-6">
                <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                  <p className="text-sm text-emerald-600 mb-1">Valor Disponível para Saque</p>
                  <h3 className="text-3xl font-bold text-emerald-700">{formatCurrency(totalCommission)}</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Chave</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={pixKeyType}
                      onChange={e => setPixKeyType(e.target.value)}
                    >
                      <option value="cpf">CPF</option>
                      <option value="email">E-mail</option>
                      <option value="phone">Telefone</option>
                      <option value="random">Chave Aleatória</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Chave PIX</label>
                    <Input 
                      required 
                      placeholder="Digite sua chave PIX" 
                      value={pixKey}
                      onChange={e => setPixKey(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsPixModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Confirmar Solicitação
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Global Importer Modal */}
      {isGlobalImporterOpen && (
        <GlobalImporter 
          type="vendas" 
          onImportComplete={async () => {
            const allSales = await db.sales.getAll();
            setSales(allSales);
          }} 
          onClose={() => setIsGlobalImporterOpen(false)} 
        />
      )}
      {isFormOpen && (
        <Card className="border-blue-200 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between bg-slate-50 rounded-t-xl border-b">
            <CardTitle>Nova Venda</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data</label>
                  <Input type="date" required value={formData.date} onChange={e => handleInputChange('date', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nº Proposta</label>
                  <Input required value={formData.proposal} onChange={e => handleInputChange('proposal', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do Cliente</label>
                  <Input required value={formData.client} onChange={e => handleInputChange('client', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">CPF do Cliente</label>
                  <Input required value={formData.cpf} onChange={e => handleInputChange('cpf', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Telefone</label>
                  <Input required value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor da Venda</label>
                  <Input type="number" step="0.01" required value={formData.value} onChange={e => handleInputChange('value', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Banco</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                    required
                    value={formData.bank}
                    onChange={e => handleInputChange('bank', e.target.value)}
                  >
                    <option value="">Selecione o Banco</option>
                    {Array.from(new Set(commissions.map(c => c.banco).filter(Boolean))).map(bank => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Produto</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                    required
                    value={formData.product || ''}
                    onChange={e => handleInputChange('product', e.target.value)}
                    disabled={!formData.bank}
                  >
                    <option value="">Selecione o Produto</option>
                    {Array.from(new Set(commissions.filter(c => c.banco === formData.bank).map(c => c.produto).filter(Boolean))).map(prod => (
                      <option key={prod} value={prod}>{prod}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Operação</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                    required
                    value={formData.operacao || ''}
                    onChange={e => handleInputChange('operacao', e.target.value)}
                    disabled={!formData.product}
                  >
                    <option value="">Selecione a Operação</option>
                    {commissions
                      .filter(c => c.banco === formData.bank && c.produto === formData.product)
                      .map(c => (
                        <option key={c.id} value={c.operacao}>{c.operacao} ({c.parcelas})</option>
                      ))
                    }
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Venda
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'financial' && isManagement ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-blue-50 border-blue-100">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1">Faturamento Total (Banco)</p>
                  <h3 className="text-2xl font-bold text-blue-900">{formatCurrency(totalBankCommission)}</h3>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-100">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600 mb-1">Comissão Vendedores</p>
                  <h3 className="text-2xl font-bold text-emerald-900">{formatCurrency(totalCommission)}</h3>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <Wallet className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-indigo-50 border-indigo-100">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600 mb-1">Lucro Líquido Empresa</p>
                  <h3 className="text-2xl font-bold text-indigo-900">{formatCurrency(totalProfit)}</h3>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                  <DollarSign className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Gráfico de Produção</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="value" fill="#1e3a8a" name="Valor (R$)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative flex-1 w-full md:max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input 
                    placeholder="Buscar por cliente, proposta ou banco..." 
                    className="pl-9" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={handleExport} className="w-full md:w-auto text-blue-700 border-blue-200 hover:bg-blue-50">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Planilha
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Input 
                    type="date" 
                    className="w-full" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Data Inicial"
                  />
                  <span className="text-slate-400">-</span>
                  <Input 
                    type="date" 
                    className="w-full" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="Data Final"
                  />
                </div>
                
                <select 
                  className="h-10 w-full md:w-auto rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="Todos">Todos Status</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Em Averbação">Em Averbação</option>
                  <option value="Aguardando Formalização do Link">Aguardando Formalização do Link</option>
                  <option value="Paga">Paga</option>
                  <option value="Cancelada">Cancelada</option>
                </select>

                <select 
                  className="h-10 w-full md:w-auto rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                  value={bankFilter}
                  onChange={(e) => setBankFilter(e.target.value)}
                >
                  <option value="Todos">Todos Bancos</option>
                  {uniqueBanksInSales.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>

                <select 
                  className="h-10 w-full md:w-auto rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                >
                  <option value="Todos">Todos Produtos</option>
                  {uniqueProductsInSales.map(prod => (
                    <option key={prod} value={prod}>{prod}</option>
                  ))}
                </select>

                {isManagement && (
                  <select 
                    className="h-10 w-full md:w-auto rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                    value={sellerFilter}
                    onChange={(e) => setSellerFilter(e.target.value)}
                  >
                    <option value="Todos">Todos Vendedores</option>
                    {uniqueSellers.map(seller => (
                      <option key={seller} value={seller}>{seller}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">Data</th>
                    <th className="px-4 py-3 whitespace-nowrap">Proposta</th>
                    <th className="px-4 py-3 whitespace-nowrap">Cliente / CPF</th>
                    <th className="px-4 py-3 whitespace-nowrap">Banco / Tabela</th>
                    <th className="px-4 py-3 whitespace-nowrap">Vendedor</th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">Valor Venda</th>
                    {isManagement && (
                      <>
                        <th className="px-4 py-3 whitespace-nowrap text-right text-slate-600">Com. Banco</th>
                        <th className="px-4 py-3 whitespace-nowrap text-right text-blue-700">Com. Empresa</th>
                      </>
                    )}
                    <th className="px-4 py-3 whitespace-nowrap text-right text-emerald-700">Com. Vendedor</th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">Recebimento</th>
                    <th className="px-4 py-3 whitespace-nowrap text-right">Acumulado</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">Status</th>
                    <th className="px-4 py-3 whitespace-nowrap text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale, index) => {
                    // Calculate running total for the filtered list
                    const runningTotal = filteredSales
                      .slice(0, index + 1)
                      .reduce((acc, curr) => acc + (curr.commission || 0), 0);
                    
                    return (
                    <tr key={sale.id} className="border-b hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{sale.date}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">{sale.proposal}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{sale.client}</div>
                        <div className="text-xs text-slate-500">{sale.cpf}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-slate-900">{sale.bank}</div>
                        <div className="text-xs text-slate-500">{sale.table}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {sale.seller}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                        {formatCurrency(sale.value)}
                      </td>
                      {isManagement && (
                        <>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-slate-600 font-medium">
                            {formatCurrency(sale.bankCommission)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-blue-700 font-medium">
                            {formatCurrency(sale.companyCommission)}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-right text-emerald-700 font-medium">
                        {formatCurrency(sale.commission)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-emerald-600">
                        {formatCurrency(sale.commission)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-slate-400 text-xs">
                        {formatCurrency(runningTotal)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <Badge variant={
                          sale.status === 'Paga' ? 'success' : 
                          sale.status === 'Cancelada' ? 'destructive' : 
                          sale.status === 'Em Averbação' ? 'secondary' :
                          'warning'
                        }>
                          {sale.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
                <tfoot className="bg-slate-50 font-medium text-slate-900">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right">Totais:</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(totalSales)}</td>
                    {isAdmin && (
                      <>
                        <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(totalBankCommission)}</td>
                        <td className="px-4 py-3 text-right text-blue-700">{formatCurrency(totalCompanyCommission)}</td>
                      </>
                    )}
                    <td className="px-4 py-3 text-right text-emerald-700">{formatCurrency(totalCommission)}</td>
                    <td className="px-4 py-3 text-right text-emerald-700">{formatCurrency(totalCommission)}</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
