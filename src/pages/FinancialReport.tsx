import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  BarChart3, 
  Download, 
  Filter, 
  Search, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Banknote,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { db } from '@/services/db';
import { Bank, CommissionGroup, Sale, PaymentRequest } from '@/types';
import { formatCurrency } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RePieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';

export default function FinancialReport() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [groups, setGroups] = useState<CommissionGroup[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  
  const [bankFilter, setBankFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const [allBanks, allGroups, allSales, allPayments] = await Promise.all([
        db.bancos.getAll(),
        db.commissionGroups.getAll(),
        db.sales.getAll(),
        db.payment_requests.getAll()
      ]);
      setBanks(allBanks);
      setGroups(allGroups);
      setSales(allSales);
      setPayments(allPayments);
    };
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    return sales.filter(s => {
      const matchesBank = bankFilter === 'all' || s.bank === banks.find(b => b.id === bankFilter)?.nome_banco;
      const matchesGroup = groupFilter === 'all' || s.table === groups.find(g => g.id === groupFilter)?.name;
      const matchesDate = (!startDate || new Date(s.date) >= new Date(startDate)) && 
                         (!endDate || new Date(s.date) <= new Date(endDate));
      return matchesBank && matchesGroup && matchesDate;
    });
  }, [sales, bankFilter, groupFilter, startDate, endDate, banks, groups]);

  const stats = useMemo(() => {
    const totalSold = filteredData.reduce((acc, s) => acc + s.value, 0);
    const totalCompanyComm = filteredData.reduce((acc, s) => acc + (s.companyCommission || 0), 0);
    const totalSellerComm = filteredData.reduce((acc, s) => acc + (s.commission || 0), 0);
    const totalPaid = payments.filter(p => p.status === 'Pago').reduce((acc, p) => acc + p.valor, 0);
    const netProfit = totalCompanyComm; // companyCommission is already profit (bank - seller)

    return { totalSold, totalCompanyComm, totalSellerComm, totalPaid, netProfit };
  }, [filteredData, payments]);

  const chartData = useMemo(() => {
    const data: any[] = [];
    banks.forEach(b => {
      const bankSales = filteredData.filter(s => s.bank === b.nome_banco);
      if (bankSales.length > 0) {
        data.push({
          name: b.nome_banco,
          receita: bankSales.reduce((acc, s) => acc + (s.bankCommission || 0), 0),
          lucro: bankSales.reduce((acc, s) => acc + (s.companyCommission || 0), 0),
          comissao: bankSales.reduce((acc, s) => acc + (s.commission || 0), 0),
        });
      }
    });
    return data;
  }, [filteredData, banks]);

  const pieData = useMemo(() => {
    const data: any[] = [];
    const categories = ['Informativo', 'Treinamento', 'Roteiro']; // This is for Academy, let's use product types for sales
    const products = Array.from(new Set(filteredData.map(s => s.bank)));
    
    products.forEach(p => {
      const val = filteredData.filter(s => s.bank === p).reduce((acc, s) => acc + s.value, 0);
      if (val > 0) {
        data.push({ name: p, value: val });
      }
    });
    return data;
  }, [filteredData]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const handleExport = () => {
    if (filteredData.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(filteredData.map(s => ({
      Data: new Date(s.date).toLocaleDateString(),
      Vendedor: s.seller,
      Banco: s.bank,
      'Valor Venda': s.value,
      'Comissão Vendedor': s.commission || 0,
      'Comissão Banco': s.bankCommission || 0,
      'Comissão Empresa (Lucro)': s.companyCommission || 0,
      Status: s.status
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório Financeiro");
    XLSX.writeFile(workbook, `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 min-h-screen bg-slate-950 -m-4 md:-m-8 p-4 md:p-8 text-slate-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            Relatório Financeiro
          </h1>
          <p className="text-slate-400">Visão geral de lucratividade e comissões por banco.</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-none" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800 shadow-xl">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Banco</label>
              <select 
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
              >
                <option value="all">Todos os Bancos</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.nome_banco}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Grupo</label>
              <select 
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option value="all">Todos os Grupos</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Início</label>
              <Input 
                type="date" 
                className="bg-slate-800 border-slate-700 text-white" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Fim</label>
              <Input 
                type="date" 
                className="bg-slate-800 border-slate-700 text-white" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-slate-500 uppercase">Total Vendido</p>
            <h3 className="text-xl font-bold text-white mt-1">{formatCurrency(stats.totalSold)}</h3>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-slate-500 uppercase">Receita Empresa</p>
            <h3 className="text-xl font-bold text-blue-400 mt-1">{formatCurrency(stats.totalCompanyComm)}</h3>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-slate-500 uppercase">Comissão Vendedores</p>
            <h3 className="text-xl font-bold text-amber-400 mt-1">{formatCurrency(stats.totalSellerComm)}</h3>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-slate-500 uppercase">Total Pago</p>
            <h3 className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(stats.totalPaid)}</h3>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-emerald-900/20 border-2">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-emerald-500 uppercase">Lucro Líquido</p>
            <h3 className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(stats.netProfit)}</h3>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-slate-800 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Desempenho por Banco
            </CardTitle>
            <CardDescription className="text-slate-500">Receita vs Lucro por instituição financeira.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="receita" name="Receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lucro" name="Lucro" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-400" />
              Distribuição de Vendas
            </CardTitle>
            <CardDescription className="text-slate-500">Volume de vendas por banco.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Detalhamento de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Vendedor</th>
                  <th className="px-4 py-3">Banco</th>
                  <th className="px-4 py-3">Valor Venda</th>
                  <th className="px-4 py-3">Com. Vendedor</th>
                  <th className="px-4 py-3">Com. Empresa</th>
                  <th className="px-4 py-3">Lucro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredData.map((sale) => {
                  const sellerComm = sale.commission || 0;
                  const companyComm = sale.bankCommission || 0;
                  const profit = sale.companyCommission || 0;
                  
                  return (
                    <tr key={sale.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-4 text-slate-400">
                        {new Date(sale.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 font-medium text-white">
                        {sale.seller}
                      </td>
                      <td className="px-4 py-4 text-slate-300">
                        {sale.bank}
                      </td>
                      <td className="px-4 py-4 font-bold text-white">
                        {formatCurrency(sale.value)}
                      </td>
                      <td className="px-4 py-4 text-amber-400">
                        {formatCurrency(sellerComm)}
                      </td>
                      <td className="px-4 py-4 text-blue-400">
                        {formatCurrency(companyComm)}
                      </td>
                      <td className="px-4 py-4 text-emerald-400 font-bold">
                        {formatCurrency(profit)}
                      </td>
                    </tr>
                  );
                })}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      Nenhum dado encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
