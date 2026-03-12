import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from '@/components/ErrorBoundary';
import './index.css';

// @ts-ignore
if (window.supabaseConfigError) {
  createRoot(document.getElementById('root')!).render(
    <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-red-200">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Erro de Configuração</h1>
        <p className="text-slate-600 mb-6">
          As variáveis de ambiente do Supabase (URL e Anon Key) não foram encontradas. 
          Por favor, configure-as no menu <strong>Settings</strong> do AI Studio.
        </p>
        <div className="bg-slate-100 p-4 rounded text-xs font-mono text-slate-700">
          VITE_SUPABASE_URL=...<br/>
          VITE_SUPABASE_ANON_KEY=...
        </div>
      </div>
    </div>
  );
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
