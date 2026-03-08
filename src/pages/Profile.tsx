import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { User, Lock, Camera, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/db';

export default function Profile() {
  const { user, login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name,
        email: user.email,
        avatar: user.avatar || ''
      }));
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!user) return;

    // Validate passwords if changing
    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'As novas senhas não coincidem.' });
        return;
      }
      if (formData.newPassword.length < 6) {
        setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
        return;
      }
      // In a real app, we would verify currentPassword with backend
      if (formData.currentPassword !== user.password) {
         setMessage({ type: 'error', text: 'Senha atual incorreta.' });
         return;
      }
    }

    try {
      const updates: any = {
        name: formData.name,
        avatar: formData.avatar
      };

      if (formData.newPassword) {
        updates.password = formData.newPassword;
      }

      const updatedUser = db.users.update(user.id, updates);
      
      if (updatedUser) {
        // Update local session
        // In a real app, this would be handled by re-fetching user data or updating token
        // Here we simulate a re-login to update context
        // We need to manually update the user in context or force a reload
        // For this demo, we'll just update localStorage and reload
        localStorage.setItem('agoraq_user', JSON.stringify(updatedUser));
        window.location.reload(); 
        
        setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      } else {
        setMessage({ type: 'error', text: 'Erro ao atualizar perfil.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Ocorreu um erro ao salvar.' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <AlertCircle className="w-5 h-5" />
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-white shadow-md overflow-hidden flex items-center justify-center">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-slate-300" />
                  )}
                </div>
                <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full cursor-pointer hover:bg-blue-700 shadow-sm transition-colors">
                  <Camera className="w-4 h-4" />
                  <input 
                    id="avatar-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              <p className="text-sm text-slate-500">Clique na câmera para alterar sua foto</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Completo</label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input 
                  value={formData.email} 
                  disabled 
                  className="bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-400">O e-mail não pode ser alterado.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              Alterar Senha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Senha Atual</label>
              <Input 
                type="password" 
                value={formData.currentPassword} 
                onChange={e => setFormData({...formData, currentPassword: e.target.value})}
                placeholder="Digite sua senha atual para confirmar alterações"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nova Senha</label>
                <Input 
                  type="password" 
                  value={formData.newPassword} 
                  onChange={e => setFormData({...formData, newPassword: e.target.value})}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirmar Nova Senha</label>
                <Input 
                  type="password" 
                  value={formData.confirmPassword} 
                  onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                  placeholder="Repita a nova senha"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button type="submit" className="bg-blue-900 hover:bg-blue-800 w-full sm:w-auto">
            <Save className="w-4 h-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      </form>
    </div>
  );
}
