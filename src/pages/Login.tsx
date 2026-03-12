import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/services/db';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Lock, Mail, AlertCircle, ShieldAlert } from 'lucide-react';

import Logo from '@/components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [setupData, setSetupData] = useState({ name: '', email: '', password: '' });
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  React.useEffect(() => {
    const checkFirstRun = async () => {
      console.log('Checking for first run...');
      try {
        const users = await db.users.getAll();
        console.log('Users found:', users.length);
        if (users.length === 0) {
          setIsFirstRun(true);
        }
      } catch (e: any) {
        console.error('Check first run error:', e);
        // If table doesn't exist (code 42P01 in Postgres/Supabase), it's a first run
        if (e.code === '42P01' || e.message?.includes('relation "profiles" does not exist')) {
          console.log('Profiles table not found, assuming first run.');
          setIsFirstRun(true);
        }
      }
    };
    checkFirstRun();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);
    
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Credenciais inválidas. Tente novamente.');
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar fazer login.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await register(setupData.email, setupData.password, setupData.name, 'admin');
      if (result.success) {
        alert('Administrador inicial criado com sucesso!');
        navigate('/');
      } else {
        setError(result.error || 'Erro ao criar administrador.');
      }
    } catch (err) {
      setError('Erro ao configurar sistema.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    // No email service, just show instructions
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="mb-4">
            <Logo className="scale-150" />
          </div>
          <p className="text-slate-500 mt-2">Portal do Correspondente</p>
        </div>

        <Card className="border-slate-200 shadow-xl">
          <CardHeader>
            <CardTitle className="text-center text-xl">
              {isFirstRun ? 'Configuração Inicial' : isForgotPassword ? 'Recuperar Senha' : 'Acesso ao Sistema'}
            </CardTitle>
            <CardDescription className="text-center">
              {isFirstRun 
                ? 'Crie o primeiro administrador para começar'
                : isForgotPassword 
                ? 'Digite seu e-mail para receber as instruções' 
                : 'Entre com suas credenciais para continuar'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isFirstRun ? (
              <form onSubmit={handleSetup} className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do Administrador</label>
                  <Input 
                    placeholder="Nome Completo" 
                    value={setupData.name}
                    onChange={(e) => setSetupData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">E-mail</label>
                  <Input 
                    type="email"
                    placeholder="admin@agoraqoficial.com" 
                    value={setupData.email}
                    onChange={(e) => setSetupData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senha</label>
                  <Input 
                    type="password"
                    placeholder="Crie uma senha forte" 
                    value={setupData.password}
                    onChange={(e) => setSetupData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2" disabled={loading}>
                  {loading ? 'Configurando...' : 'Criar Administrador e Entrar'}
                </Button>
                <p className="text-[10px] text-slate-400 text-center">
                  Esta tela só aparece porque não existem usuários no banco de dados.
                </p>
              </form>
            ) : isForgotPassword ? (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3">
                  <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-bold mb-1">Recuperação de Acesso:</p>
                    <p>Por motivos de segurança, a redefinição de senha deve ser solicitada diretamente ao seu <strong>Administrador</strong> ou <strong>Supervisor</strong>.</p>
                    <div className="mt-3 pt-3 border-t border-blue-100">
                      <p className="font-semibold">Suporte AgoraQ:</p>
                      <a 
                        href="https://wa.me/5517991280211" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-blue-700 hover:underline flex items-center gap-1 mt-1"
                      >
                        (17) 99128-0211 (WhatsApp)
                      </a>
                    </div>
                  </div>
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsForgotPassword(false)}
                >
                  Voltar para Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <Input 
                      type="email" 
                      placeholder="seu@agoraqoficial.com" 
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <Input 
                      type="password" 
                      placeholder="Sua senha" 
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-2" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            )}
          </CardContent>
          {!isForgotPassword && (
            <CardFooter className="flex flex-col gap-2 justify-center border-t border-slate-100 pt-4">
              <button 
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-sm text-blue-600 hover:underline bg-transparent border-none cursor-pointer"
              >
                Esqueceu sua senha?
              </button>
              <div className="text-sm text-slate-500">
                Não tem acesso? <Link to="/solicitar-acesso" className="text-blue-600 font-medium hover:underline">Solicitar Cadastro</Link>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 w-full text-center">
                <button 
                  type="button"
                  onClick={() => setIsFirstRun(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-4 py-2 rounded-full transition-colors border-none cursor-pointer"
                >
                  Primeiro acesso? Configurar Administrador
                </button>
              </div>
            </CardFooter>
          )}
        </Card>
        
        <p className="text-center text-xs text-slate-400 mt-8">
          &copy; 2024 AgoraQ. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
