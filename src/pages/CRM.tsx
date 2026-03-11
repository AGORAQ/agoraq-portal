import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ExternalLink, Copy, Database, Upload, UserPlus, Download, LayoutGrid, List, RefreshCw, FileSpreadsheet, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import GlobalImporter from '@/components/GlobalImporter';
import { db } from '@/services/db';
import * as XLSX from 'xlsx';

const crms = [
  { id: 1, name: 'Gestão de Leads', url: 'https://inbox.agoraqoficial.com/entrar', login: 'usuario.vendas', status: 'Ativo', notes: 'Sistema principal para gestão de leads e propostas.' },
];

export default function CRM() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';
  const [activeTab, setActiveTab] = useState<'capture' | 'leads' | 'upload' | 'database'>('capture');
  const [leadsCapturedToday, setLeadsCapturedToday] = useState(0);
  const [captureQuantity, setCaptureQuantity] = useState<number | string>(1);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const DAILY_LIMIT = 100;

  useEffect(() => {
    const loadData = async () => {
      const [allLeads, allUsers] = await Promise.all([
        db.leads.getAll(),
        db.users.getAll()
      ]);
      
      setUsers(allUsers);
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate leads captured today by this user
      const userLeadsToday = allLeads.filter(l => 
        l.createdAt.startsWith(today) && 
        (isAdmin || l.usuario_id === user?.id)
      );
      
      setLeadsCapturedToday(userLeadsToday.length);

      if (isAdmin) {
        setLeads(allLeads);
      } else {
        // Sellers only see today's leads
        setLeads(userLeadsToday);
      }
    };
    loadData();
  }, [isAdmin, user?.id]);

  const refreshLeads = async () => {
    const [allLeads, allUsers] = await Promise.all([
      db.leads.getAll(),
      db.users.getAll()
    ]);
    
    setUsers(allUsers);
    const today = new Date().toISOString().split('T')[0];
    
    const userLeadsToday = allLeads.filter((l: any) => 
      l.createdAt.startsWith(today) && 
      (isAdmin || l.usuario_id === user?.id)
    );
    
    if (isAdmin) {
      setLeads(allLeads);
    } else {
      setLeads(userLeadsToday);
    }

    // Sync user daily count from backend
    if (user?.id) {
      const updatedUser = allUsers.find(u => u.id === user.id);
      if (updatedUser && updatedUser.last_lead_date === today) {
        setLeadsCapturedToday(updatedUser.daily_lead_count || 0);
      } else {
        setLeadsCapturedToday(0);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  const handleCaptureLead = async () => {
    const qty = Number(captureQuantity);
    
    if (!qty || qty <= 0) {
      alert('Por favor, insira uma quantidade válida.');
      return;
    }

    if (leadsCapturedToday + qty > DAILY_LIMIT) {
      alert(`Quantidade excede o limite diário restante (${DAILY_LIMIT - leadsCapturedToday}).`);
      return;
    }

    try {
      // Get all unassigned leads
      const allLeads = await db.leads.getAll();
      const unassignedLeads = allLeads.filter((l: any) => !l.usuario_id);
      
      for (let i = 0; i < qty; i++) {
        // Increment count on backend for each lead
        const result = await db.users.incrementLeads(user!.id);
        if (result.error) {
          alert(result.error);
          break;
        }

        // If we have unassigned leads, take one
        if (unassignedLeads.length > i) {
          const leadToCapture = unassignedLeads[i];
          await db.leads.update(leadToCapture.id, { usuario_id: user?.id });
        } else {
          // Fallback to creating a new lead if pool is empty
          await db.leads.create({
            name: `Lead Capturado ${Math.floor(Math.random() * 1000)}`,
            phone: `(11) 9${Math.floor(Math.random() * 90000000 + 10000000)}`,
            email: `lead${Math.floor(Math.random() * 1000)}@email.com`,
            city: 'Captura Automática',
            status: 'Novo',
            usuario_id: user?.id
          });
        }
      }

      await refreshLeads();
      alert(`${qty} leads capturados com sucesso!`);
      setCaptureQuantity(1);
    } catch (error: any) {
      console.error('Error capturing leads:', error);
      alert('Erro ao capturar leads. Verifique sua conexão.');
    }
  };

  const handleExportSpreadsheet = () => {
    if (leads.length === 0) {
      alert('Não há leads para exportar.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(leads.map(l => ({
      Nome: l.name,
      Telefone: l.phone,
      Email: l.email,
      Cidade: l.city,
      Status: l.status,
      Data: new Date(l.createdAt).toLocaleDateString()
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const leadsToImport = jsonData.map(row => ({
          name: row.Nome || row.name || 'Lead Importado',
          phone: row.Telefone || row.phone || '',
          email: row.Email || row.email || '',
          city: row.Cidade || row.city || 'Importado',
          status: 'Novo',
          usuario_id: isAdmin ? null : user?.id
        }));

        await db.leads.import(leadsToImport);
        await refreshLeads();
        alert(`${leadsToImport.length} leads importados com sucesso!`);
      } catch (error) {
        console.error('Error importing leads:', error);
        alert('Erro ao processar o arquivo. Verifique o formato.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este lead?')) {
      await db.leads.delete(id);
      await refreshLeads();
    }
  };

  const handleExportData = () => {
    handleExportSpreadsheet();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Automação</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500">Gestão de relacionamento e captura de leads.</p>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
              <RefreshCw className="w-3 h-3" />
              Sincronizado
            </div>
          </div>
        </div>
        <Button 
          className="bg-blue-900 hover:bg-blue-800 shadow-md"
          onClick={() => window.open('https://inbox.agoraqoficial.com/entrar', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Acessar App CRM
        </Button>
      </div>

      {/* Navigation Tabs as Icons/Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveTab('capture')}
          className={`flex flex-col items-center justify-center p-6 rounded-xl border transition-all ${
            activeTab === 'capture' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm' 
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <UserPlus className="w-8 h-8 mb-3" />
          <span className="font-medium text-sm">Capturar Leads</span>
        </button>

        <button
          onClick={() => setActiveTab('leads')}
          className={`flex flex-col items-center justify-center p-6 rounded-xl border transition-all ${
            activeTab === 'leads' 
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <List className="w-8 h-8 mb-3" />
          <span className="font-medium text-sm">Visualizar & Exportar</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('database')}
            className={`flex flex-col items-center justify-center p-6 rounded-xl border transition-all ${
              activeTab === 'database' 
                ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <Database className="w-8 h-8 mb-3" />
            <span className="font-medium text-sm">Base de Dados</span>
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex flex-col items-center justify-center p-6 rounded-xl border transition-all ${
              activeTab === 'upload' 
                ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <Upload className="w-8 h-8 mb-3" />
            <span className="font-medium text-sm">Subir Leads (Admin)</span>
          </button>
        )}
      </div>

      <div className="mt-6">
        {activeTab === 'capture' && (
          <Card>
            <CardHeader>
              <CardTitle>Captura de Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 space-y-6">
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-1">Leads capturados hoje</p>
                  <div className="text-4xl font-bold text-slate-900">{leadsCapturedToday} <span className="text-lg text-slate-400 font-normal">/ {DAILY_LIMIT}</span></div>
                </div>
                
                <div className="w-full max-w-xs bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all" 
                    style={{ width: `${(leadsCapturedToday / DAILY_LIMIT) * 100}%` }}
                  />
                </div>

                <div className="w-full max-w-xs space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Quantidade a capturar</label>
                    <Input 
                      type="number" 
                      min="1" 
                      max={DAILY_LIMIT - leadsCapturedToday}
                      value={captureQuantity}
                      onChange={(e) => setCaptureQuantity(e.target.value)}
                      placeholder="Ex: 10"
                    />
                    <p className="text-xs text-slate-500">
                      Máximo permitido hoje: {DAILY_LIMIT - leadsCapturedToday}
                    </p>
                  </div>

                  <Button 
                    size="lg" 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleCaptureLead}
                    disabled={leadsCapturedToday >= DAILY_LIMIT}
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Capturar Leads
                  </Button>

                  <Button 
                    variant="outline"
                    className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
                    onClick={handleExportSpreadsheet}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Planilha
                  </Button>
                </div>
                
                <p className="text-xs text-slate-400 text-center max-w-xs">
                  Ao capturar, os leads serão atribuídos automaticamente à sua carteira no CRM.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'leads' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{isAdmin ? 'Todos os Leads Capturados' : 'Meus Leads Capturados'}</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={handleExportData}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Lista
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b text-slate-500 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-4 py-3"><span>Nome</span></th>
                      <th className="px-4 py-3"><span>Telefone</span></th>
                      <th className="px-4 py-3"><span>Email</span></th>
                      <th className="px-4 py-3"><span>Cidade</span></th>
                      <th className="px-4 py-3"><span>Status</span></th>
                      {isAdmin && <th className="px-4 py-3"><span>Capturado Por</span></th>}
                      <th className="px-4 py-3"><span>Data</span></th>
                      {isAdmin && <th className="px-4 py-3 text-right"><span>Ações</span></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leads.filter(l => l.usuario_id).length > 0 ? leads.filter(l => l.usuario_id).map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900"><span>{lead.name}</span></td>
                        <td className="px-4 py-3"><span>{lead.phone}</span></td>
                        <td className="px-4 py-3 text-slate-500"><span>{lead.email}</span></td>
                        <td className="px-4 py-3 text-slate-500"><span>{lead.city}</span></td>
                        <td className="px-4 py-3">
                          <Badge className={lead.status === 'Novo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                            <span>{lead.status}</span>
                          </Badge>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <span className="text-xs font-medium text-blue-600">
                              {users.find(u => u.id === lead.usuario_id)?.name || 'Desconhecido'}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteLead(lead.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 6} className="px-4 py-12 text-center text-slate-400">
                          <span>Nenhum lead capturado ainda.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'database' && isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Base de Dados de Leads (Pool)</CardTitle>
                <p className="text-sm text-slate-500">Leads importados aguardando captura pelos vendedores.</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {leads.filter(l => !l.usuario_id).length} Leads Disponíveis
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={async () => {
                    if (confirm('Tem certeza que deseja limpar TODA a base de leads não capturados?')) {
                      const unassigned = leads.filter(l => !l.usuario_id);
                      for (const l of unassigned) {
                        await db.leads.delete(l.id);
                      }
                      await refreshLeads();
                    }
                  }}
                >
                  Limpar Base
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b text-slate-500 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-4 py-3"><span>Nome</span></th>
                      <th className="px-4 py-3"><span>Telefone</span></th>
                      <th className="px-4 py-3"><span>Email</span></th>
                      <th className="px-4 py-3"><span>Cidade</span></th>
                      <th className="px-4 py-3"><span>Data Importação</span></th>
                      <th className="px-4 py-3 text-right"><span>Ações</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leads.filter(l => !l.usuario_id).length > 0 ? leads.filter(l => !l.usuario_id).map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900"><span>{lead.name}</span></td>
                        <td className="px-4 py-3"><span>{lead.phone}</span></td>
                        <td className="px-4 py-3 text-slate-500"><span>{lead.email}</span></td>
                        <td className="px-4 py-3 text-slate-500"><span>{lead.city}</span></td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteLead(lead.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                          <span>A base de dados está vazia. Importe leads para disponibilizar aos vendedores.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'upload' && isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Upload de Lista de Leads (Administrador)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Importador de Leads</h3>
                <p className="text-slate-500 mb-6 max-w-sm">Use o importador inteligente para subir planilhas locais ou conectar links do Google Sheets.</p>
                <Button onClick={() => setIsImporterOpen(true)} className="bg-blue-900 hover:bg-blue-800">
                  <Upload className="w-4 h-4 mr-2" />
                  Abrir Importador
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isImporterOpen && (
          <GlobalImporter 
            type="leads"
            onImportComplete={async () => {
            await refreshLeads();
            alert('Leads importados com sucesso!');
          }}
            onClose={() => setIsImporterOpen(false)}
          />
        )}

        {activeTab === 'export' && (
          <Card>
            <CardHeader>
              <CardTitle>Exportar Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 space-y-6">
                <div className="text-center max-w-md">
                  <p className="text-slate-600 mb-4">
                    Exporte os dados dos seus leads capturados e trabalhados para análise externa.
                  </p>
                  <Button onClick={handleExportData} className="bg-blue-900 hover:bg-blue-800">
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Relatório Completo (CSV)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
