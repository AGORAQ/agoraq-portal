import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ExternalLink, Copy, Database, Upload, UserPlus, Download, LayoutGrid, List, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import GlobalImporter from '@/components/GlobalImporter';
import { db } from '@/services/db';

const crms = [
  { id: 1, name: 'Gestão de Leads', url: 'https://inbox.agoraqoficial.com/entrar', login: 'usuario.vendas', status: 'Ativo', notes: 'Sistema principal para gestão de leads e propostas.' },
];

export default function CRM() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'supervisor';
  const [activeTab, setActiveTab] = useState<'access' | 'capture' | 'leads' | 'upload' | 'export'>('access');
  const [leadsCapturedToday, setLeadsCapturedToday] = useState(0);
  const [captureQuantity, setCaptureQuantity] = useState<number | string>(1);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const DAILY_LIMIT = 100;

  useEffect(() => {
    setLeads(db.leads.getAll());
  }, []);

  const refreshLeads = () => {
    setLeads(db.leads.getAll());
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  const handleCaptureLead = () => {
    const qty = Number(captureQuantity);
    
    if (!qty || qty <= 0) {
      alert('Por favor, insira uma quantidade válida.');
      return;
    }

    if (leadsCapturedToday + qty <= DAILY_LIMIT) {
      // Simulate lead capture by adding real entries to db
      for (let i = 0; i < qty; i++) {
        db.leads.create({
          name: `Lead Capturado ${Math.floor(Math.random() * 1000)}`,
          phone: `(11) 9${Math.floor(Math.random() * 90000000 + 10000000)}`,
          email: `lead${Math.floor(Math.random() * 1000)}@email.com`,
          city: 'Captura Automática',
          status: 'Novo'
        });
      }

      setLeadsCapturedToday(prev => prev + qty);
      refreshLeads();
      alert(`${qty} leads capturados com sucesso!`);
      setCaptureQuantity(1);
    } else {
      alert(`Quantidade excede o limite diário restante (${DAILY_LIMIT - leadsCapturedToday}).`);
    }
  };

  const handleExportSpreadsheet = () => {
    alert('Planilha de leads exportada com sucesso! (Simulação)');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      alert(`Arquivo ${e.target.files[0].name} carregado com sucesso! (Simulação)`);
    }
  };

  const handleExportData = () => {
    alert('Dados exportados com sucesso! (Simulação)');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM & Leads</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500">Gestão de relacionamento e captura de leads.</p>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
              <RefreshCw className="w-3 h-3" />
              Sincronizado
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs as Icons/Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          onClick={() => setActiveTab('access')}
          className={`flex flex-col items-center justify-center p-6 rounded-xl border transition-all ${
            activeTab === 'access' 
              ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <LayoutGrid className="w-8 h-8 mb-3" />
          <span className="font-medium text-sm">Acesso ao CRM</span>
        </button>

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
          <span className="font-medium text-sm">Lista de Leads</span>
        </button>

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
            <span className="font-medium text-sm">Subir Leads</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('export')}
          className={`flex flex-col items-center justify-center p-6 rounded-xl border transition-all ${
            activeTab === 'export' 
              ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm' 
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
          }`}
        >
          <Download className="w-8 h-8 mb-3" />
          <span className="font-medium text-sm">Exportar Dados</span>
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'access' && (
          <div className="grid gap-6">
            {crms.map((crm) => (
              <Card key={crm.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="bg-slate-50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 min-w-[200px]">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                      <Database className="h-8 w-8" />
                    </div>
                    <Badge variant={crm.status === 'Ativo' ? 'success' : 'warning'}>
                      {crm.status}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-slate-900">{crm.name}</h3>
                      </div>
                      <p className="text-slate-600 mb-4">{crm.notes}</p>
                      
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 inline-flex items-center gap-3 mb-4">
                        <span className="text-xs font-medium text-slate-500 uppercase">Login:</span>
                        <code className="font-mono text-slate-900 font-bold">{crm.login}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => copyToClipboard(crm.login)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                      <Button className="bg-blue-900 hover:bg-blue-800" onClick={() => window.open(crm.url, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Acessar Sistema
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

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
            <CardHeader>
              <CardTitle><span>Meus Leads Capturados</span></CardTitle>
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
                      <th className="px-4 py-3"><span>Data</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leads.length > 0 ? leads.map((lead) => (
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
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
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
            onImportComplete={() => {
              refreshLeads();
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
