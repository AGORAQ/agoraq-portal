import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  Search, Plus, Edit, Trash2, FileText, 
  ExternalLink, Download, Eye, X, Save, 
  Filter, Clock, CheckCircle, AlertCircle,
  Video, FileDown, Link as LinkIcon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/db';
import { AcademyContent, CommissionGroup } from '@/types';

export default function Academy() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [contents, setContents] = useState<AcademyContent[]>([]);
  const [groups, setGroups] = useState<CommissionGroup[]>([]);
  const [userViews, setUserViews] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AcademyContent>>({
    categoria: 'Informativo',
    tipo_arquivo: 'pdf',
    visibilidade: 'todos',
    status: 'Ativo',
    versao: '1.0'
  });

  const loadData = () => {
    setContents(db.academy.getAll());
    setGroups(db.commissionGroups.getAll());
    if (user) {
      setUserViews(db.academyViews.getUserViews(user.id));
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleInputChange = (field: keyof AcademyContent, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo || !formData.categoria) {
      alert('Título e Categoria são obrigatórios.');
      return;
    }

    if (!formData.arquivo_url && formData.tipo_arquivo !== 'link') {
      alert('Por favor, forneça um link ou arquivo.');
      return;
    }

    const contentData = {
      titulo: formData.titulo!,
      categoria: formData.categoria as any,
      descricao: formData.descricao || '',
      arquivo_url: formData.arquivo_url || '',
      tipo_arquivo: formData.tipo_arquivo as any,
      visibilidade: formData.visibilidade as any,
      grupo_id: formData.grupo_id,
      versao: formData.versao || '1.0',
      criado_por: user?.id || 'sistema',
      status: formData.status as any || 'Ativo'
    };

    if (editingId) {
      db.academy.update(editingId, contentData);
    } else {
      db.academy.create(contentData);
    }

    loadData();
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({
      categoria: 'Informativo',
      tipo_arquivo: 'pdf',
      visibilidade: 'todos',
      status: 'Ativo',
      versao: '1.0'
    });
  };

  const handleEdit = (content: AcademyContent) => {
    setFormData(content);
    setEditingId(content.id);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este conteúdo?')) {
      db.academy.delete(id);
      loadData();
    }
  };

  const handleView = (content: AcademyContent) => {
    if (user) {
      db.academyViews.register(content.id, user.id);
      setUserViews(prev => [...new Set([...prev, content.id])]);
    }
    
    if (content.arquivo_url) {
      window.open(content.arquivo_url, '_blank');
    }
  };

  const filteredContents = contents.filter(c => {
    const matchesSearch = c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || c.categoria === categoryFilter;
    const matchesStatus = isAdmin ? (statusFilter === 'all' || c.status === statusFilter) : c.status === 'Ativo';
    
    // Visibility check for non-admins
    let matchesVisibility = true;
    if (!isAdmin) {
      if (c.visibilidade === 'vendedores' && user?.role !== 'vendedor') matchesVisibility = false;
      if (c.visibilidade === 'lideres' && user?.role !== 'supervisor' && user?.role !== 'admin') matchesVisibility = false;
      if (c.visibilidade === 'grupo_especifico' && c.grupo_id) {
        // Check if user belongs to this group (fgtsGroup or cltGroup)
        const userGroups = [user?.fgtsGroup, user?.cltGroup].filter(Boolean);
        const groupName = groups.find(g => g.id === c.grupo_id)?.name;
        if (groupName && !userGroups.includes(groupName)) {
          matchesVisibility = false;
        }
      }
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesVisibility;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'link': return <LinkIcon className="w-5 h-5" />;
      case 'pdf': return <FileText className="w-5 h-5" />;
      default: return <FileDown className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6 min-h-screen bg-slate-950 -m-4 md:-m-8 p-4 md:p-8 text-slate-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">AgoraQ Academy</h1>
          <p className="text-slate-400">Central de treinamentos, informativos e roteiros.</p>
        </div>
        {isAdmin && (
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-none" onClick={() => {
            setEditingId(null);
            setFormData({
              categoria: 'Informativo',
              tipo_arquivo: 'pdf',
              visibilidade: 'todos',
              status: 'Ativo',
              versao: '1.0'
            });
            setIsFormOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Conteúdo
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Buscar por título ou descrição..." 
                className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-emerald-500" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <select 
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Todas as Categorias</option>
                <option value="Informativo">Informativos</option>
                <option value="Treinamento">Treinamentos</option>
                <option value="Roteiro">Roteiros Operacionais</option>
              </select>
            </div>
            {isAdmin && (
              <div>
                <select 
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Todos os Status</option>
                  <option value="Ativo">Ativos</option>
                  <option value="Inativo">Inativos</option>
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isFormOpen && (
        <Card className="bg-slate-900 border-emerald-900/50 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <CardHeader className="flex flex-row items-center justify-between bg-slate-800/50 rounded-t-xl border-b border-slate-800">
            <CardTitle className="text-white">{editingId ? 'Editar Conteúdo' : 'Novo Conteúdo Academy'}</CardTitle>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white" onClick={() => setIsFormOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Título <span className="text-red-500">*</span></label>
                  <Input required className="bg-slate-800 border-slate-700 text-white" value={formData.titulo || ''} onChange={e => handleInputChange('titulo', e.target.value)} placeholder="Ex: Manual de Vendas 2024" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Categoria <span className="text-red-500">*</span></label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                    required
                    value={formData.categoria || 'Informativo'}
                    onChange={e => handleInputChange('categoria', e.target.value)}
                  >
                    <option value="Informativo">Informativo</option>
                    <option value="Treinamento">Treinamento</option>
                    <option value="Roteiro">Roteiro Operacional</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-slate-300">Descrição</label>
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                    value={formData.descricao || ''}
                    onChange={e => handleInputChange('descricao', e.target.value)}
                    placeholder="Breve descrição do conteúdo..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Tipo de Arquivo/Link</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                    value={formData.tipo_arquivo || 'pdf'}
                    onChange={e => handleInputChange('tipo_arquivo', e.target.value)}
                  >
                    <option value="pdf">PDF</option>
                    <option value="doc">Documento (Word/Excel)</option>
                    <option value="video">Vídeo</option>
                    <option value="link">Link Externo</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">URL do Arquivo ou Link <span className="text-red-500">*</span></label>
                  <Input required className="bg-slate-800 border-slate-700 text-white" value={formData.arquivo_url || ''} onChange={e => handleInputChange('arquivo_url', e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Versão</label>
                  <Input className="bg-slate-800 border-slate-700 text-white" value={formData.versao || '1.0'} onChange={e => handleInputChange('versao', e.target.value)} placeholder="Ex: 1.0" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Visibilidade</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                    value={formData.visibilidade || 'todos'}
                    onChange={e => handleInputChange('visibilidade', e.target.value)}
                  >
                    <option value="todos">Todos</option>
                    <option value="vendedores">Apenas Vendedores</option>
                    <option value="lideres">Apenas Líderes/Supervisores</option>
                    <option value="grupo_especifico">Grupo Específico</option>
                  </select>
                </div>
                {formData.visibilidade === 'grupo_especifico' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Selecionar Grupo</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                      value={formData.grupo_id || ''}
                      onChange={e => handleInputChange('grupo_id', e.target.value)}
                    >
                      <option value="">Selecione um grupo...</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name} ({g.type})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Status</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                    value={formData.status || 'Ativo'}
                    onChange={e => handleInputChange('status', e.target.value)}
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Conteúdo
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContents.map((content) => {
          const isViewed = userViews.includes(content.id);
          
          return (
            <Card key={content.id} className={`overflow-hidden bg-slate-900 border-slate-800 hover:border-emerald-900/50 hover:shadow-emerald-900/10 hover:shadow-2xl transition-all duration-300 group ${content.status === 'Inativo' ? 'opacity-50 grayscale' : ''}`}>
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="p-2 bg-slate-800 rounded-lg text-slate-400 group-hover:bg-emerald-900/30 group-hover:text-emerald-400 transition-colors">
                    {getFileIcon(content.tipo_arquivo)}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-300 text-[10px] uppercase tracking-wider">
                      {content.categoria}
                    </Badge>
                    {isViewed ? (
                      <Badge variant="success" className="bg-emerald-900/30 text-emerald-400 border-emerald-900/50 text-[10px] flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Visualizado
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-red-900/30 text-red-400 border-red-900/50 text-[10px] animate-pulse">
                        Novo
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-white line-clamp-1">{content.titulo}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2 mt-1 h-10">
                    {content.descricao || 'Sem descrição disponível.'}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800 pt-4">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(content.criado_em).toLocaleDateString()}
                  </div>
                  <div className="font-medium text-slate-400">
                    v{content.versao}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                    onClick={() => handleView(content)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-blue-400 hover:bg-blue-900/30" onClick={() => handleEdit(content)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-red-400 hover:bg-red-900/30" onClick={() => handleDelete(content.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {filteredContents.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhum conteúdo encontrado</p>
            <p className="text-sm">Tente ajustar seus filtros ou busca.</p>
          </div>
        )}
      </div>
    </div>
  );
}
