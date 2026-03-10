import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  FileText, 
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  HeadphonesIcon,
  Database,
  Palette,
  Target
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DailyWisdom } from '@/components/WellnessCompanion';
import { db } from '@/services/db';
import { useAuth } from '@/context/AuthContext';
import Announcements from '@/components/Announcements';

const COLORS = ['#1e3a8a', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const data = [
  { name: 'Seg', vendas: 4000 },
  { name: 'Ter', vendas: 3000 },
  { name: 'Qua', vendas: 2000 },
  { name: 'Qui', vendas: 2780 },
  { name: 'Sex', vendas: 1890 },
  { name: 'Sáb', vendas: 2390 },
  { name: 'Dom', vendas: 3490 },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [canvaLink, setCanvaLink] = React.useState('https://www.canva.com/');
  const [sales, setSales] = React.useState<any[]>([]);
  const [requests, setRequests] = React.useState<any[]>([]);
  const [chartData, setChartData] = React.useState<any[]>([]);
  const [monthlyGoal, setMonthlyGoal] = React.useState(0);
  const [isGoalModalOpen, setIsGoalModalOpen] = React.useState(false);
  const [tempGoal, setTempGoal] = React.useState('');
  const [bankDistribution, setBankDistribution] = React.useState<{ name: string; value: number }[]>([]);
  const [projection, setProjection] = React.useState({ total: 0, company: 0, seller: 0 });

  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor';
  const isManagement = isAdmin || isSupervisor;

  React.useEffect(() => {
    const settings = db.settings.get();
    if (settings.canvaLink) {
      setCanvaLink(settings.canvaLink);
    }
    
    // Load Monthly Goal
    const savedGoal = localStorage.getItem(`monthly_goal_${user?.id}`);
    if (savedGoal) setMonthlyGoal(Number(savedGoal));

    const allSales = db.sales.getAll();
    // Filter sales if user is not management
    const filteredSales = isManagement ? allSales : allSales.filter(s => s.seller === user?.name);
    
    setSales(filteredSales);
    setRequests(db.requests.getAll());

    // Prepare Chart Data (Last 7 days)
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const newChartData = last7Days.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      const daySales = filteredSales.filter(s => s.date === dateStr);
      const total = daySales.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
      return {
        name: days[date.getDay()],
        vendas: total
      };
    });
    setChartData(newChartData);

    // Bank Distribution
    const dist: Record<string, number> = {};
    filteredSales.forEach(s => {
      const val = Number(s.value) || 0;
      dist[s.bank] = (dist[s.bank] || 0) + val;
    });
    setBankDistribution(Object.entries(dist).map(([name, value]) => ({ name, value })));

    // Automatic Projection based on Goal
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = now.getDate();
    const remainingDays = daysInMonth - currentDay;
    
    const monthSales = filteredSales.filter(s => {
      if (!s.date) return false;
      const d = new Date(s.date);
      return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    
    const monthTotal = monthSales.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
    
    // If goal is set, calculate based on goal. Otherwise, estimate based on average.
    let projectedTotal = 0;
    
    if (monthlyGoal > 0) {
      // Logic: If we keep up the required daily pace, we hit the goal.
      // But "Projection" usually means "where we will end up if we continue like this".
      // However, the prompt asks to "calculate daily target".
      // Let's store the daily target in a separate variable to display.
      // For the "Projection" card, let's keep it as "Estimated Total" based on current pace, 
      // but maybe add a "Goal Progress" indicator.
      
      const dailyAvg = currentDay > 0 ? monthTotal / currentDay : 0;
      projectedTotal = dailyAvg * daysInMonth;
    } else {
      const dailyAvg = currentDay > 0 ? monthTotal / currentDay : 0;
      projectedTotal = dailyAvg * daysInMonth;
    }
    
    setProjection({
      total: projectedTotal,
      company: 0, // Not used in new logic
      seller: 0   // Not used in new logic
    });

  }, [user, monthlyGoal]); // Add monthlyGoal dependency

  const handleSaveGoal = () => {
    const goal = parseFloat(tempGoal);
    if (!isNaN(goal)) {
      setMonthlyGoal(goal);
      localStorage.setItem(`monthly_goal_${user?.id}`, goal.toString());
      setIsGoalModalOpen(false);
    }
  };

  const totalSalesValue = sales.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  
  // Calculate Monthly Progress
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthSales = sales.filter(s => {
    if (!s.date) return false;
    const d = new Date(s.date);
    return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const monthTotal = monthSales.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const currentDay = now.getDate();
  const remainingDays = daysInMonth - currentDay;
  const neededPerDay = remainingDays > 0 ? Math.max(0, (monthlyGoal - monthTotal) / remainingDays) : 0;

  const totalCommissionsValue = sales.reduce((acc, curr) => acc + ((Number(curr.value) || 0) * (Number(curr.commission) || 0)), 0);
  const totalProfitValue = sales.reduce((acc, curr) => acc + ((Number(curr.value) || 0) * (Number(curr.companyCommission) || 0)), 0);
  const pendingRequestsCount = requests.filter(r => r.status === 'Pendente').length;

  return (
    <div className="space-y-6">
      <DailyWisdom />
      <Announcements />
      
      {/* Goal Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <CardHeader>
              <CardTitle>Definir Meta Mensal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Qual sua meta de vendas para este mês?</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">R$</span>
                  <input 
                    type="number" 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    value={tempGoal}
                    onChange={e => setTempGoal(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsGoalModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveGoal} className="bg-blue-900 text-white">Salvar Meta</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Visão geral do seu desempenho hoje.</p>
        </div>
        <div className="flex gap-2">
          <a href="https://wa.me/5517991280211" target="_blank" rel="noopener noreferrer">
            <Button variant="outline">
              <HeadphonesIcon className="w-4 h-4 mr-2" />
              Suporte
            </Button>
          </a>
          <Link to="/vendas">
            <Button className="bg-blue-900 hover:bg-blue-800">
              <Plus className="w-4 h-4 mr-2" />
              Nova Venda
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-500">Vendas Totais</p>
              <DollarSign className="h-4 w-4 text-slate-500" />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalSalesValue)}</div>
              <div className="flex items-center text-xs text-emerald-500 font-medium bg-emerald-50 px-2 py-1 rounded-full">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +20.1%
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-500">Comissões</p>
              <TrendingUp className="h-4 w-4 text-slate-500" />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalCommissionsValue)}</div>
              <div className="flex items-center text-xs text-emerald-500 font-medium bg-emerald-50 px-2 py-1 rounded-full">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +15.2%
              </div>
            </div>
          </CardContent>
        </Card>
        {isManagement && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <p className="text-sm font-medium text-slate-500">Lucro Empresa</p>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalProfitValue)}</div>
                <div className="flex items-center text-xs text-emerald-500 font-medium bg-emerald-50 px-2 py-1 rounded-full">
                  Líquido
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="cursor-pointer hover:border-blue-300 transition-colors" onClick={() => {
          setTempGoal(monthlyGoal.toString());
          setIsGoalModalOpen(true);
        }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-slate-500">Meta Mensal</p>
              <Target className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-blue-600">
                  {monthlyGoal > 0 ? formatCurrency(monthlyGoal) : 'Definir Meta'}
                </div>
                {monthlyGoal > 0 && (
                   <div className="flex items-center text-xs text-blue-500 font-medium bg-blue-50 px-2 py-1 rounded-full">
                     {Math.round((monthTotal / monthlyGoal) * 100)}%
                   </div>
                )}
              </div>
              {monthlyGoal > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  Meta Diária: <span className="font-bold text-emerald-600">{formatCurrency(neededPerDay)}</span>
                </p>
              )}
              {monthlyGoal === 0 && (
                <p className="text-xs text-slate-400 mt-2">Clique para definir</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>Desempenho Semanal</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `R$${value}`} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="vendas" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>Distribuição por Banco</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={bankDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {bankDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {bankDistribution.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs text-slate-600 truncate">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Vendas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Banco</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(-5).reverse().map((sale, i) => (
                  <tr key={i} className="border-b hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium">{sale.client}</td>
                    <td className="px-4 py-3 text-slate-600">{sale.bank}</td>
                    <td className="px-4 py-3 text-slate-600">{sale.table}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(sale.value)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        sale.status === 'Paga' ? 'bg-emerald-100 text-emerald-700' : 
                        sale.status === 'Cancelada' ? 'bg-red-100 text-red-700' : 
                        sale.status === 'Em Averbação' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Nenhuma venda registrada recentemente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-blue-900 text-white border-none hover:bg-blue-800 transition-colors cursor-pointer">
          <CardContent className="p-6 flex items-center gap-4" onClick={() => window.open('https://inbox.agoraqoficial.com/entrar?redirectURL=%2Fchats/', '_blank')}>
            <div className="p-3 bg-white/10 rounded-lg">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">Acessar CRM</h3>
              <p className="text-blue-200 text-sm">Gestão de leads</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 text-white border-none hover:bg-slate-700 transition-colors cursor-pointer" onClick={() => window.open('https://wa.me/5517991280211', '_blank')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-lg">
              <HeadphonesIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">Falar com Suporte</h3>
              <p className="text-slate-300 text-sm">Ajuda técnica</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-600 text-white border-none hover:bg-purple-700 transition-colors cursor-pointer" onClick={() => window.open(canvaLink, '_blank')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-lg">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">Foto WhatsApp</h3>
              <p className="text-purple-100 text-sm">Editar no Canva</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
