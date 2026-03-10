import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';
import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  Building2, 
  Users, 
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { db } from '@/services/db';
import { Bank, CommissionGroup, CommissionTable } from '@/types';
import { formatCurrency } from '@/lib/utils';

export default function Simulator() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';
  
  const [banks, setBanks] = useState<Bank[]>([]);
  const [groups, setGroups] = useState<CommissionGroup[]>([]);
  const [tables, setTables] = useState<CommissionTable[]>([]);
  
  const [selectedBank, setSelectedBank] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [saleValue, setSaleValue] = useState('');

  useEffect(() => {
    setBanks(db.bancos.getAll());
    setGroups(db.commissionGroups.getAll());
    
    const userGroup = user?.grupo_comissao || user?.fgtsGroup || user?.cltGroup;
    setTables(db.commissions.getAll(user?.role, userGroup));
  }, [user]);

  const filteredGroups = groups.filter(g => g.banco_id === selectedBank);
  const filteredTables = tables.filter(t => {
    const bankName = banks.find(b => b.id === selectedBank)?.nome_banco;
    const groupName = groups.find(g => g.id === selectedGroup)?.name;
    return (t.banco === bankName || t.bank === bankName) && (t.grupo_comissao === groupName || t.group === groupName);
  });

  const table = tables.find(t => t.id === selectedTable);
  const value = parseFloat(saleValue) || 0;

  const results = table ? {
    vendedor: (table.percentual_vendedor / 100) * value,
    empresa: (table.percentual_total_empresa / 100) * value,
    lucro: ((table.percentual_total_empresa - table.percentual_vendedor) / 100) * value,
    percentualVendedor: table.percentual_vendedor,
    percentualEmpresa: table.percentual_total_empresa,
    percentualLucro: table.percentual_total_empresa - table.percentual_vendedor
  } : null;

  return (
    <div className="space-y-6 min-h-screen bg-slate-950 -m-4 md:-m-8 p-4 md:p-8 text-slate-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-6 h-6 text-emerald-400" />
            Simulador de Comissão
          </h1>
          <p className="text-slate-400">Calcule ganhos previstos baseados em tabelas e bancos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Card */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white">Parâmetros da Simulação</CardTitle>
            <CardDescription className="text-slate-500">Selecione os dados para o cálculo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Banco</label>
              <select 
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:ring-emerald-500"
                value={selectedBank}
                onChange={(e) => {
                  setSelectedBank(e.target.value);
                  setSelectedGroup('');
                  setSelectedTable('');
                }}
              >
                <option value="">Selecione um banco...</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.nome_banco}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Grupo de Comissão</label>
              <select 
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:ring-emerald-500 disabled:opacity-50"
                value={selectedGroup}
                onChange={(e) => {
                  setSelectedGroup(e.target.value);
                  setSelectedTable('');
                }}
                disabled={!selectedBank}
              >
                <option value="">Selecione um grupo...</option>
                {filteredGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Tabela</label>
              <select 
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:ring-emerald-500 disabled:opacity-50"
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                disabled={!selectedGroup}
              >
                <option value="">Selecione uma tabela...</option>
                {filteredTables.map(t => <option key={t.id} value={t.id}>{t.nome_tabela} ({t.percentual_vendedor}%)</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Valor da Venda</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  type="number" 
                  placeholder="0,00" 
                  className="pl-9 bg-slate-800 border-slate-700 text-white"
                  value={saleValue}
                  onChange={(e) => setSaleValue(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4">
              <div className="bg-blue-900/10 border border-blue-900/20 p-4 rounded-lg flex gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0" />
                <p className="text-xs text-blue-300 leading-relaxed">
                  Os valores calculados são baseados nas tabelas vigentes e podem sofrer alterações conforme regras do banco.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Card */}
        <div className="lg:col-span-2 space-y-6">
          {results ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className={`bg-slate-900 border-slate-800 shadow-xl overflow-hidden ${!isAdmin ? 'md:col-span-2' : ''}`}>
                <div className="h-2 bg-emerald-500"></div>
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    Comissão Vendedor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-4xl font-bold text-white">{formatCurrency(results.vendedor)}</div>
                  <div className="flex items-center gap-2 text-emerald-400 bg-emerald-900/10 px-3 py-1 rounded-full w-fit text-sm font-medium">
                    <TrendingUp className="w-4 h-4" />
                    {results.percentualVendedor}% do valor total
                  </div>
                  <p className="text-sm text-slate-500">Valor líquido a ser creditado no saldo do vendedor após a confirmação do banco.</p>
                </CardContent>
              </Card>

              {isAdmin && (
                <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
                  <div className="h-2 bg-blue-500"></div>
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-400" />
                      Comissão Empresa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-4xl font-bold text-white">{formatCurrency(results.empresa)}</div>
                    <div className="flex items-center gap-2 text-blue-400 bg-blue-900/10 px-3 py-1 rounded-full w-fit text-sm font-medium">
                      <ArrowRight className="w-4 h-4" />
                      {results.percentualEmpresa}% repassado pelo banco
                    </div>
                    <div className="pt-4 border-t border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Lucro Líquido Empresa:</span>
                        <span className="text-emerald-400 font-bold">{formatCurrency(results.lucro)} ({results.percentualLucro}%)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="md:col-span-2 bg-slate-900 border-slate-800 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white">Resumo da Operação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">Banco Selecionado</span>
                      <span className="text-white font-medium">{banks.find(b => b.id === selectedBank)?.nome_banco}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">Tabela Aplicada</span>
                      <span className="text-white font-medium">{table.nome_tabela || table.name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">Valor da Venda</span>
                      <span className="text-white font-medium">{formatCurrency(value)}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex justify-between py-2 pt-4">
                        <span className="text-lg font-bold text-white">Total Comissões</span>
                        <span className="text-lg font-bold text-emerald-400">{formatCurrency(results.empresa)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-800 p-12">
              <Calculator className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-xl font-medium text-slate-400">Aguardando Parâmetros</h3>
              <p className="text-center max-w-xs mt-2">
                Preencha os dados ao lado para visualizar a projeção de ganhos desta venda.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-sm">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
                  Cálculo em tempo real
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
                  Baseado em tabelas oficiais
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
                  Visão de lucro empresa
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
                  Visão de ganho vendedor
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
