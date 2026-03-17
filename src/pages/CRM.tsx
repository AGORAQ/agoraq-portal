import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ExternalLink, Copy, Database, Upload, UserPlus, Download, LayoutGrid, List, RefreshCw, FileSpreadsheet, Trash2, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import GlobalImporter from '@/components/GlobalImporter';
import { db } from '@/services/db';
import { supabase } from '@/lib/supabase';
import { parseFile } from '@/lib/importer';
import * as XLSX from 'xlsx';

const crms = [
  { id: 1, name: 'Gestão de Leads', url: 'https://inbox.agoraqoficial.com/entrar', login: 'usuario.vendas', status: 'Ativo', notes: 'Sistema principal para gestão de leads e propostas.' },
];

export default function CRM() {
  const { user } = useAuth();
  const { notify, confirm } = useNotification();
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';
  const [activeTab, setActiveTab] = useState<'capture' | 'leads' | 'upload' | 'database'>('capture');
  const [leadsCapturedToday, setLeadsCapturedToday] = useState(0);
  const [captureQuantity, setCaptureQuantity] = useState<number | string>(1);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
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
      const userLeadsToday = allLeads.filter(l => {
        const isToday = l.createdAt?.startsWith(today) || l.capturedAt?.startsWith(today);
        const isOwner = l.usuario_id === user?.id;
        return isToday && (isAdmin || isOwner);
      });
      
      setLeadsCapturedToday(userLeadsToday.filter(l => l.usuario_id === user?.id && l.capturedAt?.startsWith(today)).length);

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
    if (!user) return;
    
    try {
      const [allLeads, allUsers, capturedTodayCount] = await Promise.all([
        db.leads.getAll(),
        db.users.getAll(),
        db.leads.getCapturedToday(user.id)
      ]);
      
      console.log('CRM Data Loaded:', { allLeadsCount: allLeads.length, allUsersCount: allUsers.length });
      setUsers(allUsers);
      const today = new Date().toISOString().split('T')[0];
      
      const userLeadsToday = allLeads.filter((l: any) => {
        const isToday = l.createdAt?.startsWith(today) || l.capturedAt?.startsWith(today);
        const isOwner = l.usuario_id === user?.id;
        return isToday && (isAdmin || isOwner);
      });
      
      if (isAdmin) {
        setLeads(allLeads);
      } else {
        setLeads(userLeadsToday);
      }

      setLeadsCapturedToday(capturedTodayCount);
    } catch (error) {
      console.error('Error refreshing leads:', error);
      notify('error', 'Erro ao atualizar leads.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notify('success', 'Copiado para a área de transferência!');
  };

  const handleCaptureLead = async () => {
    const qty = Number(captureQuantity);
    
    if (!qty || qty <= 0) {
      notify('error', 'Por favor, insira uma quantidade válida.');
      return;
    }

    if (leadsCapturedToday + qty > DAILY_LIMIT) {
      notify('warning', `Quantidade excede o limite diário restante (${DAILY_LIMIT - leadsCapturedToday}).`);
      return;
    }

    if (user && !user.can_capture_leads) {
      notify('error', 'Sua captura de leads está bloqueada pelo administrador.');
      return;
    }

    setIsSaving(true);
    try {
      // Get all unassigned leads, filtering out duplicates for this user
      const unassignedLeads = await db.leads.getAvailableForUser(user!.id);
      
      if (unassignedLeads.length < qty) {
        notify('warning', `Apenas ${unassignedLeads.length} leads disponíveis na base.`);
        return;
      }

      const leadIdsToCapture = unassignedLeads.slice(0, qty).map(l => l.id);
      const result = await db.leads.bulkCapture(leadIdsToCapture, user!.id);

      await refreshLeads();
      notify('success', `${result.capturedCount} leads capturados com sucesso!`);
      setCaptureQuantity(1);
    } catch (error: any) {
      console.error('Error capturing leads:', error);
      notify('error', error.message || 'Erro ao capturar leads. Verifique sua conexão.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportSpreadsheet = () => {
    if (leads.length === 0) {
      notify('warning', 'Não há leads para exportar.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(leads.map(l => {
      const base = {
        Nome: l.name,
        CPF: l.cpf || '',
        Telefone: l.phone,
        Email: l.email,
        Cidade: l.city,
        Status: l.status,
        Data: l.capturedAt ? new Date(l.capturedAt).toLocaleDateString() : new Date(l.createdAt).toLocaleDateString()
      };
      
      // Add metadata fields to the export
      if (l.metadata) {
        return { ...base, ...l.metadata };
      }
      
      return base;
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    try {
      const { data: jsonData, errors } = await parseFile(file);
      
      if (errors.length > 0) {
        notify('error', errors[0]);
        return;
      }

      const leadsToImport = jsonData.map(row => ({
        name: row.name || row.nome || 'Lead Importado',
        phone: String(row.phone || row.telefone || ''),
        email: row.email || '',
        city: row.city || row.cidade || 'Importado',
        status: 'Disponível'
      }));

      const result = await db.leads.import(leadsToImport);
      await refreshLeads();
      
      if (result.count > 0) {
        notify('success', `${result.count} leads importados com sucesso!`);
        if (leadsToImport.length > result.count) {
          notify('info', `${leadsToImport.length - result.count} duplicados foram ignorados.`);
        }
      } else if (leadsToImport.length > 0) {
        notify('warning', 'Nenhum lead novo foi importado (todos eram duplicados ou inválidos).');
      }
      
      if (result.errors && result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }
    } catch (error) {
      console.error('Error importing leads:', error);
      notify('error', 'Erro ao processar o arquivo. Verifique o formato.');
    } finally {
      setIsSaving(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (await confirm({ message: 'Tem certeza que deseja remover este lead?', type: 'danger' })) {
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
                    disabled={isSaving || leadsCapturedToday >= DAILY_LIMIT}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Capturando...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5 mr-2" />
                        Capturar Leads
                      </>
                    )}
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
                      <th className="px-4 py-3"><span>CPF</span></th>
                      <th className="px-4 py-3"><span>Telefone</span></th>
                      <th className="px-4 py-3"><span>Email</span></th>
                      <th className="px-4 py-3"><span>Cidade</span></th>
                      <th className="px-4 py-3"><span>Status</span></th>
                      <th className="px-4 py-3 text-center"><span>Copiar</span></th>
                      {isAdmin && <th className="px-4 py-3"><span>Capturado Por</span></th>}
                      <th className="px-4 py-3"><span>Data</span></th>
                      {isAdmin && <th className="px-4 py-3 text-right"><span>Ações</span></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leads.filter(l => l.usuario_id).length > 0 ? leads.filter(l => l.usuario_id).map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900"><span>{lead.name}</span></td>
                        <td className="px-4 py-3 text-slate-500"><span>{lead.cpf || '-'}</span></td>
                        <td className="px-4 py-3"><span>{lead.phone}</span></td>
                        <td className="px-4 py-3 text-slate-500"><span>{lead.email}</span></td>
                        <td className="px-4 py-3 text-slate-500"><span>{lead.city}</span></td>
                        <td className="px-4 py-3">
                          <Badge className={lead.status === 'Novo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                            <span>{lead.status}</span>
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50" 
                              onClick={() => copyToClipboard(lead.name)}
                              title="Copiar Nome"
                            >
                              <User className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" 
                              onClick={() => copyToClipboard(lead.phone)}
                              title="Copiar Telefone"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            {lead.cpf && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-amber-600 hover:bg-amber-50" 
                                onClick={() => copyToClipboard(lead.cpf)}
                                title="Copiar CPF"
                              >
                                <Database className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
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
                  className="border-slate-200 text-slate-600"
                  onClick={async () => {
                    const { count, error } = await supabase.from('leads').select('*', { count: 'exact', head: true });
                    const { count: availCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Disponível');
                    alert(`Total Leads: ${count}, Disponíveis: ${availCount}, Error: ${error?.message || 'none'}`);
                  }}
                >
                  Debug Base
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={async () => {
                    if (await confirm({ message: 'Tem certeza que deseja limpar TODA a base de leads não capturados?', type: 'danger' })) {
                      await db.leads.deleteAllAvailable();
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
                      <th className="px-4 py-3"><span>CPF</span></th>
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
                        <td className="px-4 py-3 text-slate-500"><span>{lead.cpf || '-'}</span></td>
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
            notify('success', 'Leads importados com sucesso!');
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
