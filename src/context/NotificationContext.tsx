import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'primary';
}

interface PromptOptions {
  title: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface NotificationContextType {
  notify: (type: NotificationType, message: string, title?: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  const [promptState, setPromptState] = useState<{
    isOpen: boolean;
    options: PromptOptions;
    resolve: (value: string | null) => void;
    value: string;
  } | null>(null);

  const notify = useCallback((type: NotificationType, message: string, title?: string) => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ isOpen: true, options, resolve });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setPromptState({ 
        isOpen: true, 
        options, 
        resolve, 
        value: options.defaultValue || '' 
      });
    });
  }, []);

  const handleConfirm = (value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
    }
  };

  const handlePrompt = (value: string | null) => {
    if (promptState) {
      promptState.resolve(value);
      setPromptState(null);
    }
  };

  return (
    <NotificationContext.Provider value={{ notify, confirm, prompt }}>
      {children}
      
      {/* Toasts Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div 
            key={n.id} 
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border min-w-[300px] max-w-md animate-in slide-in-from-right-4 duration-300 ${
              n.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              n.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              n.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            {n.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
            {n.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
            {n.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
            {n.type === 'info' && <Info className="w-5 h-5 text-blue-500 shrink-0" />}
            
            <div className="flex-1">
              {n.title && <p className="font-bold text-sm mb-1">{n.title}</p>}
              <p className="text-sm">{n.message}</p>
            </div>
            
            <button 
              onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm Modal */}
      {confirmState?.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {confirmState.options.title || 'Confirmação'}
              </h3>
              <p className="text-slate-600">
                {confirmState.options.message}
              </p>
            </div>
            <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t">
              <Button variant="outline" onClick={() => handleConfirm(false)}>
                {confirmState.options.cancelLabel || 'Cancelar'}
              </Button>
              <Button 
                className={confirmState.options.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-900 hover:bg-blue-800'}
                onClick={() => handleConfirm(true)}
              >
                {confirmState.options.confirmLabel || 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Modal */}
      {promptState?.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {promptState.options.title}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                {promptState.options.message}
              </p>
              <input
                autoFocus
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900"
                placeholder={promptState.options.placeholder}
                value={promptState.value}
                onChange={(e) => setPromptState(prev => prev ? { ...prev, value: e.target.value } : null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePrompt(promptState.value);
                  if (e.key === 'Escape') handlePrompt(null);
                }}
              />
            </div>
            <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t">
              <Button variant="outline" onClick={() => handlePrompt(null)}>
                {promptState.options.cancelLabel || 'Cancelar'}
              </Button>
              <Button 
                className="bg-blue-900 hover:bg-blue-800"
                onClick={() => handlePrompt(promptState.value)}
              >
                {promptState.options.confirmLabel || 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
