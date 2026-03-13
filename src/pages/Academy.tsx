import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  Search, Plus, Edit, Trash2, FileText, 
  ExternalLink, Download, Eye, X, Save, 
  Filter, Clock, CheckCircle, AlertCircle,
  Video, FileDown, Link as LinkIcon,
  Sparkles, Loader2, Play, ArrowUp, ArrowDown
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import { db } from '@/services/db';
import { AcademyContent, CommissionGroup } from '@/types';
import { GoogleGenAI } from "@google/genai";

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function Academy() {
  const { user } = useAuth();
  const { notify, confirm } = useNotification();
  const isAdmin = user?.role === 'admin';

  const [contents, setContents] = useState<AcademyContent[]>([]);
  const [groups, setGroups] = useState<CommissionGroup[]>([]);
  const [userViews, setUserViews] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isAIGenModalOpen, setIsAIGenModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generationProgress, setGenerationProgress] = useState('');
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('url');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AcademyContent>>({
    categoria: 'Informativo',
    tipo_arquivo: 'pdf',
    visibilidade: 'todos',
    status: 'Ativo',
    versao: '1.0',
    links_relacionados: ''
  });

  const loadData = async () => {
    const [allContents, allGroups] = await Promise.all([
      db.academy.getAll(),
      db.commissionGroups.getAll()
    ]);
    setContents(allContents);
    setGroups(allGroups);
    if (user) {
      const views = await db.academyViews.getUserViews(user.id);
      setUserViews(views);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleInputChange = (field: keyof AcademyContent, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit iniciado', formData);
    if (!formData.titulo || !formData.categoria) {
      notify('error', 'Título e Categoria são obrigatórios.');
      return;
    }

    if (!formData.arquivo_url && formData.tipo_arquivo !== 'link') {
      notify('error', 'Por favor, forneça um link ou arquivo.');
      return;
    }

    setIsSaving(true);
    try {
      const contentData = {
        titulo: formData.titulo!,
        categoria: formData.categoria as any,
        descricao: formData.descricao || '',
        arquivo_url: formData.arquivo_url || '',
        tipo_arquivo: formData.tipo_arquivo as any,
        visibilidade: formData.visibilidade as any,
        grupo_id: formData.grupo_id || null,
        versao: formData.versao || '1.0',
        links_relacionados: formData.links_relacionados || '',
        ordem: formData.ordem || (contents.length > 0 ? Math.max(...contents.map(c => c.ordem || 0)) + 1 : 0),
        criado_por: user?.id || null,
        status: formData.status as any || 'Ativo'
      };
      console.log('Salvando conteúdo:', contentData);

      if (editingId) {
        await db.academy.update(editingId, contentData);
      } else {
        await db.academy.create(contentData);
      }

      await loadData();
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({
        categoria: 'Informativo',
        tipo_arquivo: 'pdf',
        visibilidade: 'todos',
        status: 'Ativo',
        versao: '1.0'
      });
      notify('success', 'Conteúdo salvo com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar conteúdo:', error);
      notify('error', `Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (content: AcademyContent) => {
    setFormData(content);
    setEditingId(content.id);
    setUploadMode(content.arquivo_url?.startsWith('data:') ? 'upload' : 'url');
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (await confirm({ message: 'Tem certeza que deseja excluir este conteúdo?', type: 'danger' })) {
      await db.academy.delete(id);
      await loadData();
    }
  };

  const handleMove = async (content: AcademyContent, direction: 'up' | 'down') => {
    const currentIndex = contents.findIndex(c => c.id === content.id);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === contents.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetContent = contents[targetIndex];

    // Swap orders
    const currentOrder = content.ordem || 0;
    const targetOrder = targetContent.ordem || 0;

    await Promise.all([
      db.academy.update(content.id, { ordem: targetOrder }),
      db.academy.update(targetContent.id, { ordem: currentOrder })
    ]);

    await loadData();
  };

  const handleView = async (content: AcademyContent) => {
    if (user) {
      await db.academyViews.register(content.id, user.id);
      setUserViews(prev => [...new Set([...prev, content.id])]);
    }
    
    if (content.arquivo_url) {
      if (content.tipo_arquivo === 'video' && content.arquivo_url.includes('generativelanguage.googleapis.com')) {
        // Handle Gemini video with headers
        setVideoModalUrl(null); // Reset
        setIsVideoLoading(true);
        try {
          const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
          const response = await fetch(content.arquivo_url, {
            method: 'GET',
            headers: {
              'x-goog-api-key': apiKey || '',
            },
          });
          
          if (!response.ok) throw new Error('Falha ao carregar vídeo');
          
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          setVideoModalUrl(blobUrl);
        } catch (error) {
          console.error('Error loading video:', error);
          notify('error', 'Não foi possível carregar o vídeo. Verifique sua conexão ou chave de API.');
        } finally {
          setIsVideoLoading(false);
        }
      } else {
        window.open(content.arquivo_url, '_blank');
      }
    }
  };

  const generateCustomTraining = async () => {
    if (!aiPrompt.trim()) return;

    try {
      const hasKey = await (window as any).aistudio?.hasSelectedApiKey?.() || false;
      if (!hasKey && (window as any).aistudio?.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
      }

      setIsGeneratingVideo(true);
      setIsAIGenModalOpen(false);
      setGenerationProgress('Analisando sua descrição e preparando roteiro...');

      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Chave de API não encontrada. Por favor, selecione uma chave paga.');
      }
      const ai = new GoogleGenAI({ apiKey });
      
      setGenerationProgress('Gerando vídeo de treinamento personalizado (isso pode levar alguns minutos)...');
      
      let operation;
      try {
        operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: `A professional educational training video about: ${aiPrompt}. The video should be clear, informative, and visually engaging. Use a modern corporate aesthetic with clean typography and smooth transitions. Include relevant visual metaphors and clear text overlays in Portuguese to explain key concepts. The tone should be instructional and encouraging.`,
          config: {
            numberOfVideos: 1,
            resolution: '1080p',
            aspectRatio: '16:9'
          }
        });
      } catch (err: any) {
        if (err.message?.includes('Requested entity was not found')) {
          await window.aistudio.openSelectKey();
          throw new Error('A chave selecionada parece ser inválida. Por favor, selecione uma chave paga válida.');
        }
        throw err;
      }

      let attempts = 0;
      while (!operation.done && attempts < 60) {
        setGenerationProgress(`Processando treinamento... ${attempts * 10}s decorridos. Por favor, aguarde.`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
        attempts++;
      }

      if (!operation.done) {
        throw new Error('A geração do treinamento demorou mais que o esperado.');
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) {
        throw new Error('Não foi possível obter o link do vídeo gerado.');
      }

      const newTutorial = {
        titulo: `Treinamento IA: ${aiPrompt.substring(0, 40)}${aiPrompt.length > 40 ? '...' : ''}`,
        categoria: 'Treinamento' as any,
        descricao: `Treinamento gerado automaticamente via IA baseado na descrição: "${aiPrompt}"`,
        arquivo_url: downloadLink,
        tipo_arquivo: 'video' as any,
        visibilidade: 'todos' as any,
        versao: '1.0',
        criado_por: user?.id || 'sistema',
        status: 'Ativo' as any
      };

      await db.academy.create(newTutorial);
      await loadData();
      setIsGeneratingVideo(false);
      setGenerationProgress('');
      setAiPrompt('');
      notify('success', 'Treinamento gerado com sucesso!');

    } catch (error: any) {
      console.error('Erro ao gerar treinamento:', error);
      setIsGeneratingVideo(false);
      setGenerationProgress('');
      notify('error', `Erro ao gerar treinamento: ${error.message}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit file size to 10MB for base64 storage
    if (file.size > 10 * 1024 * 1024) {
      notify('warning', 'O arquivo é muito grande. O limite é 10MB para upload direto. Para arquivos maiores, use um link externo.');
      return;
    }

    setIsUploading(true);
    console.log('Iniciando upload de arquivo:', file.name);
    
    try {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        handleInputChange('arquivo_url', base64String);
        
        // Auto-detect file type
        if (file.type.includes('pdf')) handleInputChange('tipo_arquivo', 'pdf');
        else if (file.type.includes('video')) handleInputChange('tipo_arquivo', 'video');
        else if (file.type.includes('word') || file.type.includes('officedocument')) handleInputChange('tipo_arquivo', 'doc');
        
        setIsUploading(false);
        // Reset input value to allow selecting same file again
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.onerror = () => {
        console.error('Erro ao ler arquivo');
        notify('error', 'Erro ao carregar o arquivo. Tente novamente.');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erro no upload:', error);
      notify('error', 'Erro ao processar o upload.');
      setIsUploading(false);
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
      {/* AI Generation Prompt Modal */}
      {isAIGenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg bg-slate-900 border-indigo-500/30 shadow-2xl">
            <CardHeader className="border-b border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  Descrever Novo Treinamento
                </CardTitle>
                <Button variant="ghost" size="icon" className="text-slate-400" onClick={() => setIsAIGenModalOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-slate-400">
                Descreva detalhadamente o que você deseja que o treinamento aborde. A IA criará um vídeo educativo completo com base na sua descrição.
              </p>
              <textarea 
                className="w-full min-h-[150px] bg-slate-800 border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Ex: Treinamento sobre como abordar clientes para venda de FGTS, focando em quebrar as principais objeções e apresentando os benefícios da antecipação..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" className="border-slate-700 text-slate-300" onClick={() => setIsAIGenModalOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={generateCustomTraining}
                  disabled={!aiPrompt.trim()}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Treinamento
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Video Modal */}
      { (videoModalUrl || isVideoLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative w-full max-w-5xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Visualizar Vídeo</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-slate-400 hover:text-white" 
                onClick={() => {
                  if (videoModalUrl) URL.revokeObjectURL(videoModalUrl);
                  setVideoModalUrl(null);
                  setIsVideoLoading(false);
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              {isVideoLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                  <p className="text-slate-400 animate-pulse">Carregando vídeo de alta qualidade...</p>
                </div>
              ) : (
                <video 
                  src={videoModalUrl!} 
                  controls 
                  autoPlay 
                  className="w-full h-full"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">AgoraQ Academy</h1>
          <p className="text-slate-400">Central de treinamentos, informativos e roteiros.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white border-none" 
                onClick={() => setIsAIGenModalOpen(true)}
                disabled={isGeneratingVideo}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Criar Treinamento IA
              </Button>
            </>
          )}
          {isAdmin && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white border-none" onClick={() => {
            setEditingId(null);
            setUploadMode('url');
            setFormData({
              categoria: 'Informativo',
              tipo_arquivo: 'pdf',
              visibilidade: 'todos',
              status: 'Ativo',
              versao: '1.0',
              links_relacionados: ''
            });
            setIsFormOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Conteúdo
          </Button>
        )}
      </div>
    </div>

      {/* Filters */}
      {isGeneratingVideo && (
        <Card className="bg-indigo-900/20 border-indigo-500/30 border-dashed animate-pulse mb-6">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse"></div>
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin relative z-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Gerando Tutorial com IA</h3>
              <p className="text-indigo-300 max-w-md mx-auto">
                {generationProgress}
              </p>
              <p className="text-xs text-indigo-400/70 italic">
                A geração de vídeo de alta qualidade pode levar até 2-3 minutos. Não feche esta página.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.mp4,.mov"
          />
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
                  <label className="text-sm font-medium text-slate-300">Origem do Conteúdo</label>
                  <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                    <button
                      type="button"
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${uploadMode === 'url' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                      onClick={() => {
                        console.log('Switching to URL mode');
                        setUploadMode('url');
                      }}
                    >
                      URL / Link
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${uploadMode === 'upload' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                      onClick={() => {
                        console.log('Switching to Upload mode');
                        setUploadMode('upload');
                      }}
                    >
                      Upload de Arquivo
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    {uploadMode === 'url' ? 'URL do Arquivo ou Link' : 'Arquivo Selecionado'} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    {uploadMode === 'url' ? (
                      <Input required className="bg-slate-800 border-slate-700 text-white flex-1" value={formData.arquivo_url || ''} onChange={e => handleInputChange('arquivo_url', e.target.value)} placeholder="https://..." />
                    ) : (
                      <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-md px-3 py-2">
                        <FileDown className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-300 truncate flex-1">
                          {formData.arquivo_url && formData.arquivo_url.startsWith('data:') ? 'Arquivo carregado' : 'Nenhum arquivo selecionado'}
                        </span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          className="text-indigo-400 hover:text-indigo-300 h-7"
                          onClick={() => {
                            console.log('Botão Alterar clicado');
                            fileInputRef.current?.click();
                          }}
                          disabled={isUploading}
                        >
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Alterar'}
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {uploadMode === 'url' ? 'Cole o link direto para o arquivo ou site.' : 'O arquivo será salvo no sistema.'}
                  </p>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-slate-300">Links Relacionados</label>
                  <textarea 
                    className="flex min-h-[60px] w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                    value={formData.links_relacionados || ''}
                    onChange={e => handleInputChange('links_relacionados', e.target.value)}
                    placeholder="Cole aqui links úteis separados por linha ou vírgula..."
                  />
                  <p className="text-[10px] text-slate-500">Links que complementam este treinamento.</p>
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
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white border-none" disabled={isSaving || isUploading}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {isSaving ? 'Salvando...' : 'Salvar Conteúdo'}
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

                {content.links_relacionados && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Links Relacionados</p>
                    <div className="flex flex-wrap gap-2">
                      {content.links_relacionados.split(/[\n,]+/).map((link, idx) => {
                        const trimmedLink = link.trim();
                        if (!trimmedLink) return null;
                        return (
                          <a 
                            key={idx} 
                            href={trimmedLink.startsWith('http') ? trimmedLink : `https://${trimmedLink}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-900/20 px-2 py-1 rounded border border-indigo-500/20 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Link {idx + 1}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                      <div className="flex flex-col gap-1 mr-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 text-slate-500 hover:text-white" 
                          onClick={() => handleMove(content, 'up')}
                          title="Mover para cima"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 text-slate-500 hover:text-white" 
                          onClick={() => handleMove(content, 'down')}
                          title="Mover para baixo"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>
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
