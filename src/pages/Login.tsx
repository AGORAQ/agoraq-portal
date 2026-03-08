import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Lock, Mail, AlertCircle } from 'lucide-react';

import Logo from '@/components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const success = await login(email, password);
      if (success) {
        navigate('/');
      } else {
        setError('Credenciais inválidas. Tente novamente.');
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar fazer login.');
    } finally {
      setLoading(false);
    }
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
            <CardTitle className="text-center text-xl">Acesso ao Sistema</CardTitle>
            <CardDescription className="text-center">
              Entre com suas credenciais para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                    placeholder="seu@agoraqoficial.com.br" 
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

            <div className="mt-6 p-4 bg-slate-50 rounded-lg text-xs text-slate-500 space-y-2 border border-slate-100">
              <p className="font-semibold text-slate-700">Credenciais de Demonstração:</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">Admin:</span><br/>
                  agoraq@agoraqoficial.com.br<br/>
                  Senha: admin
                </div>
                <div>
                  <span className="font-medium">Vendedor:</span><br/>
                  vendedor@agoraqoficial.com.br<br/>
                  Senha: vend
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 justify-center border-t border-slate-100 pt-4">
            <a href="#" className="text-sm text-blue-600 hover:underline">Esqueceu sua senha?</a>
            <div className="text-sm text-slate-500">
              Não tem acesso? <Link to="/solicitar-acesso" className="text-blue-600 font-medium hover:underline">Solicitar Cadastro</Link>
            </div>
          </CardFooter>
        </Card>
        
        <p className="text-center text-xs text-slate-400 mt-8">
          &copy; 2024 AgoraQ. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
