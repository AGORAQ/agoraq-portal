import React, { createContext, useContext, useState, useEffect } from 'react';
import { CommissionTable } from '@/types';
import { db } from '@/services/db';
import { useAuth } from './AuthContext';

interface CommissionContextType {
  commissions: CommissionTable[];
  addCommission: (commission: Omit<CommissionTable, 'id' | 'data_criacao' | 'data_atualizacao' | 'status'>) => void;
  updateCommission: (id: string, updates: Partial<CommissionTable>) => void;
  deleteCommission: (id: string) => void;
  importCommissions: (newCommissions: Omit<CommissionTable, 'id' | 'data_criacao' | 'data_atualizacao'>[]) => void;
  refreshCommissions: () => void;
}

const CommissionContext = createContext<CommissionContextType | undefined>(undefined);

export function CommissionProvider({ children }: { children: React.ReactNode }) {
  const [commissions, setCommissions] = useState<CommissionTable[]>([]);
  const { user } = useAuth();

  const refreshCommissions = () => {
    const userGroup = user?.grupo_comissao || user?.fgtsGroup || user?.cltGroup;
    setCommissions(db.commissions.getAll(user?.role, userGroup));
  };

  useEffect(() => {
    if (user) {
      refreshCommissions();
    }
  }, [user]);

  const addCommission = (commission: Omit<CommissionTable, 'id' | 'data_criacao' | 'data_atualizacao' | 'status'>) => {
    if (!user) return;
    try {
      db.commissions.create({ ...commission, status: 'Ativo' }, user.role, user.id);
      refreshCommissions();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const updateCommission = (id: string, updates: Partial<CommissionTable>) => {
    if (!user) return;
    try {
      db.commissions.update(id, updates, user.role, user.id);
      refreshCommissions();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const deleteCommission = (id: string) => {
    if (!user) return;
    if (confirm('Tem certeza que deseja excluir esta tabela?')) {
      try {
        db.commissions.delete(id, user.role, user.id);
        refreshCommissions();
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const importCommissions = (newCommissions: Omit<CommissionTable, 'id' | 'data_criacao' | 'data_atualizacao'>[]) => {
    if (!user) return;
    try {
      const imported = db.commissions.import(newCommissions, user.role, user.id);
      
      // Log the import
      db.logs.add({
        user: user.name,
        linesProcessed: newCommissions.length,
        errorsFound: 0,
        fileName: 'Importação Excel'
      });

      refreshCommissions();
      alert(`${imported.length} tabelas importadas com sucesso!`);
    } catch (error: any) {
      alert(error.message);
      // Log the error
      db.logs.add({
        user: user.name,
        linesProcessed: newCommissions.length,
        errorsFound: newCommissions.length,
        fileName: 'Falha na Importação'
      });
    }
  };

  return (
    <CommissionContext.Provider value={{ commissions, addCommission, updateCommission, deleteCommission, importCommissions, refreshCommissions }}>
      {children}
    </CommissionContext.Provider>
  );
}

export function useCommission() {
  const context = useContext(CommissionContext);
  if (context === undefined) {
    throw new Error('useCommission must be used within a CommissionProvider');
  }
  return context;
}
