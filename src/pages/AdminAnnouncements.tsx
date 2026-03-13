import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Plus, Edit, Trash2, X, Save, Video, AlertTriangle, Info, Bell, Calendar, RefreshCw } from 'lucide-react';
import { db } from '@/services/db';
import { Announcement } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

export default function AdminAnnouncements() {
  const { user } = useAuth();
  const { notify, confirm } = useNotification();
  const isAdmin = user?.role === 'admin';

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Announcement>>({
    type: 'Aviso',
    active: true,
    date: new Date().toISOString().split('T')[0]
  });

  const [isSaving, setIsSaving] = useState(false);

  const refreshAnnouncements = async () => {
    const all = await db.announcements.getAll();
    setAnnouncements(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  useEffect(() => {
    refreshAnnouncements();
  }, []);

  if (!isAdmin) {
    return <div className="p-8 text-center text-slate-500">Acesso restrito a administradores.</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.message || !formData.date) {
      notify('error', 'Preencha os campos obrigatórios.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await db.announcements.update(editingId, formData);
        notify('success', 'Aviso atualizado com sucesso!');
      } else {
        await db.announcements.create(formData as any);
        notify('success', 'Aviso criado com sucesso!');
      }

      await refreshAnnouncements();
      setIsFormOpen(false);
      setEditingId(null);
      setFormData({ type: 'Aviso', active: true, date: new Date().toISOString().split('T')[0] });
    } catch (error: any) {
      console.error('Erro ao salvar aviso:', error);
      notify('error', 'Erro ao salvar aviso: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setFormData(announcement);
    setEditingId(announcement.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (await confirm({ message: 'Tem certeza que deseja excluir este aviso?', type: 'danger' })) {
      await db.announcements.delete(id);
      await refreshAnnouncements();
    }
  };

  const getIcon = (type: Announcement['type']) => {
    switch (type) {
      case 'Reunião': return <Video className="h-4 w-4" />;
      case 'Importante': return <AlertTriangle className="h-4 w-4" />;
      case 'Manutenção': return <Info className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gerenciar Avisos e Notificações</h1>
          <p className="text-slate-500">Publique avisos, reuniões e comunicados para a equipe.</p>
        </div>
        <Button className="bg-blue-900 hover:bg-blue-800" onClick={() => {
          setEditingId(null);
          setFormData({ type: 'Aviso', active: true, date: new Date().toISOString().split('T')[0] });
          setIsFormOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Aviso
        </Button>
      </div>

      {isFormOpen && (
        <Card className="border-blue-200 shadow-lg animate-in fade-in slide-in-from-top-4">
          <CardHeader className="flex flex-row items-center justify-between bg-slate-50 rounded-t-xl border-b">
            <CardTitle>{editingId ? 'Editar Aviso' : 'Novo Aviso'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título</label>
                  <Input 
                    required 
                    value={formData.title || ''} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    placeholder="Ex: Reunião Geral, Manutenção no Sistema..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                  >
                    <option value="Aviso">Aviso Geral</option>
                    <option value="Reunião">Reunião Online</option>
                    <option value="Importante">Importante</option>
                    <option value="Manutenção">Manutenção</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data de Exibição</label>
                  <Input 
                    type="date" 
                    required 
                    value={formData.date || ''} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Link (Opcional - Para Reuniões)</label>
                  <Input 
                    value={formData.link || ''} 
                    onChange={e => setFormData({...formData, link: e.target.value})} 
                    placeholder="https://meet.google.com/..."
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Mensagem</label>
                  <textarea 
                    className="flex min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    required 
                    value={formData.message || ''} 
                    onChange={e => setFormData({...formData, message: e.target.value})} 
                    placeholder="Digite o conteúdo do aviso..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="active" 
                    checked={formData.active} 
                    onChange={e => setFormData({...formData, active: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="active" className="text-sm font-medium text-slate-700">Ativo (Visível para todos)</label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-blue-900 hover:bg-blue-800" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Aviso
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {announcements.map((item) => (
          <Card key={item.id} className={`border-l-4 ${item.active ? 'border-l-green-500' : 'border-l-slate-300 opacity-75'}`}>
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-3 items-start">
                <div className={`mt-1 p-2 rounded-full ${item.active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                  {getIcon(item.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-900">{item.title}</span>
                    <Badge variant={item.active ? 'default' : 'secondary'} className="text-xs">
                      {item.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-1">{item.message}</p>
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      Link da Reunião: {item.link}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-2 self-end sm:self-center">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                  <Edit className="w-4 h-4 text-slate-500" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {announcements.length === 0 && (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
            Nenhum aviso cadastrado. Clique em "Novo Aviso" para começar.
          </div>
        )}
      </div>
    </div>
  );
}
