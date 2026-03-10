import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { UserPlus, ArrowLeft, CheckCircle, Search } from 'lucide-react';
import Logo from '@/components/Logo';
import { db } from '@/services/db';

export default function RequestAccess() {
  const navigate = useNavigate();
  const submitted = false; // We will use a different approach for submission state if needed, or just keep it simple. Actually the original code used state.
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    requestedAccessType: '',
    sellerName: '',
    cpf: '',
    rg: '',
    phone: '',
    birthDate: '',
    
    // Address
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    
    observation: ''
  });

  const handleCepBlur = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf
        }));
        // Optional: focus on number field after auto-fill
        document.getElementById('number')?.focus();
      } else {
        // Optional: alert or toast could go here
        console.warn("CEP não encontrado");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct full address string for backward compatibility if needed
    const fullAddress = `${formData.street}, ${formData.number} - ${formData.neighborhood}, ${formData.city} - ${formData.state}, ${formData.cep}`;

    db.requests.create({
      ...formData,
      address: fullAddress,
      status: 'Aguardando Documentos' // Default status
    });

    setIsSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-green-200 shadow-lg animate-in fade-in zoom-in-95 duration-300">
          <CardHeader className="text-center">
            <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">Solicitação Enviada!</CardTitle>
            <CardDescription>
              Seus dados foram recebidos com sucesso. Nossa equipe analisará sua solicitação e entrará em contato em breve.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pb-8">
            <Link to="/login">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar para Login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <Card className="w-full max-w-2xl shadow-xl border-slate-200">
        <CardHeader className="space-y-1 text-center bg-white rounded-t-xl border-b pb-8 pt-8">
          <div className="flex justify-center mb-4">
            <Logo className="h-12 w-auto" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Solicitar Acesso</CardTitle>
          <CardDescription>
            Preencha o formulário abaixo para solicitar seu cadastro na plataforma.
            <div className="mt-2 text-xs text-slate-500">
              Dúvidas? Suporte: <a href="https://wa.me/5517991280211" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">(17) 99128-0211</a>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b pb-2">Dados Pessoais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-slate-700">Nome Completo</label>
                  <Input id="name" name="name" required placeholder="Seu nome completo" value={formData.name} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="cpf" className="text-sm font-medium text-slate-700">CPF</label>
                  <Input id="cpf" name="cpf" required placeholder="000.000.000-00" value={formData.cpf} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="rg" className="text-sm font-medium text-slate-700">RG</label>
                  <Input id="rg" name="rg" required placeholder="00.000.000-0" value={formData.rg} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="birthDate" className="text-sm font-medium text-slate-700">Data de Nascimento</label>
                  <Input id="birthDate" name="birthDate" type="date" required value={formData.birthDate} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium text-slate-700">Telefone / WhatsApp</label>
                  <Input id="phone" name="phone" required placeholder="(00) 00000-0000" value={formData.phone} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">Email Pessoal</label>
                  <Input id="email" name="email" type="email" required placeholder="seu@email.com" value={formData.email} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b pb-2 pt-4">Endereço Completo</h3>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* CEP */}
                <div className="md:col-span-3 space-y-2">
                  <label htmlFor="cep" className="text-sm font-medium text-slate-700">CEP</label>
                  <div className="relative">
                    <Input 
                      id="cep" 
                      name="cep" 
                      required 
                      placeholder="00000-000" 
                      value={formData.cep} 
                      onChange={handleChange}
                      onBlur={handleCepBlur}
                      maxLength={9}
                    />
                    <div className="absolute right-3 top-2.5 text-slate-400">
                      {isLoadingCep ? <span className="animate-spin">⌛</span> : <Search className="w-4 h-4" />}
                    </div>
                  </div>
                </div>
                
                {/* Rua */}
                <div className="md:col-span-6 space-y-2">
                  <label htmlFor="street" className="text-sm font-medium text-slate-700">Rua / Logradouro</label>
                  <Input id="street" name="street" required placeholder="Nome da rua" value={formData.street} onChange={handleChange} />
                </div>

                {/* Número */}
                <div className="md:col-span-3 space-y-2">
                  <label htmlFor="number" className="text-sm font-medium text-slate-700">Número</label>
                  <Input id="number" name="number" required placeholder="123" value={formData.number} onChange={handleChange} />
                </div>

                {/* Complemento */}
                <div className="md:col-span-4 space-y-2">
                  <label htmlFor="complement" className="text-sm font-medium text-slate-700">Complemento</label>
                  <Input id="complement" name="complement" placeholder="Apto, Bloco..." value={formData.complement} onChange={handleChange} />
                </div>

                {/* Bairro */}
                <div className="md:col-span-4 space-y-2">
                  <label htmlFor="neighborhood" className="text-sm font-medium text-slate-700">Bairro</label>
                  <Input id="neighborhood" name="neighborhood" required placeholder="Bairro" value={formData.neighborhood} onChange={handleChange} />
                </div>

                {/* Cidade */}
                <div className="md:col-span-3 space-y-2">
                  <label htmlFor="city" className="text-sm font-medium text-slate-700">Cidade</label>
                  <Input id="city" name="city" required placeholder="Cidade" value={formData.city} onChange={handleChange} />
                </div>

                {/* UF */}
                <div className="md:col-span-1 space-y-2">
                  <label htmlFor="state" className="text-sm font-medium text-slate-700">UF</label>
                  <Input id="state" name="state" required placeholder="UF" maxLength={2} value={formData.state} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b pb-2 pt-4">Dados da Solicitação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="requestedAccessType" className="text-sm font-medium text-slate-700">Tipo de Acesso Solicitado</label>
                  <select
                    id="requestedAccessType"
                    name="requestedAccessType"
                    required
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                    value={formData.requestedAccessType}
                    onChange={handleChange}
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="Vendedor">Vendedor</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Operacional">Operacional</option>
                    <option value="Backoffice">Backoffice</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="sellerName" className="text-sm font-medium text-slate-700">Nome do Vendedor (Quem indicou?)</label>
                  <Input id="sellerName" name="sellerName" placeholder="Opcional" value={formData.sellerName} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="observation" className="text-sm font-medium text-slate-700">Observações Adicionais</label>
                <textarea 
                  id="observation" 
                  name="observation" 
                  className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900 focus-visible:ring-offset-2"
                  placeholder="Alguma informação extra?"
                  value={formData.observation}
                  onChange={handleChange}
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-blue-900 hover:bg-blue-800 text-lg py-6 mt-6">
              <UserPlus className="w-5 h-5 mr-2" />
              Enviar Solicitação
            </Button>
          </form>
        </CardContent>
        <CardFooter className="bg-slate-50 rounded-b-xl border-t p-6 flex justify-center">
          <p className="text-sm text-slate-500">
            Já tem uma conta? <Link to="/login" className="text-blue-700 font-medium hover:underline">Fazer Login</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
