import React, { createContext, useContext, useState, useEffect } from 'react';
import { CommissionTable } from '@/types';
import { db } from '@/services/db';

interface CommissionContextType {
  commissions: CommissionTable[];
  addCommission: (commission: Omit<CommissionTable, 'id' | 'updatedAt' | 'status'>) => void;
  updateCommission: (id: string, updates: Partial<CommissionTable>) => void;
  deleteCommission: (id: string) => void;
  importCommissions: (newCommissions: Omit<CommissionTable, 'id' | 'updatedAt'>[]) => void;
  refreshCommissions: () => void;
}

const CommissionContext = createContext<CommissionContextType | undefined>(undefined);

export function CommissionProvider({ children }: { children: React.ReactNode }) {
  const [commissions, setCommissions] = useState<CommissionTable[]>([]);

  const refreshCommissions = () => {
    setCommissions(db.commissions.getAll());
  };

  useEffect(() => {
    refreshCommissions();
  }, []);

  const addCommission = (commission: Omit<CommissionTable, 'id' | 'updatedAt' | 'status'>) => {
    try {
      db.commissions.create({ ...commission, status: 'Ativo' });
      refreshCommissions();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const updateCommission = (id: string, updates: Partial<CommissionTable>) => {
    try {
      db.commissions.update(id, updates);
      refreshCommissions();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const deleteCommission = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta tabela?')) {
      db.commissions.delete(id);
      refreshCommissions();
    }
  };

  const importCommissions = (newCommissions: Omit<CommissionTable, 'id' | 'updatedAt'>[]) => {
    try {
      const imported = db.commissions.import(newCommissions);
      
      // Log the import
      db.logs.add({
        user: 'Sistema', // Ideally get from auth context if available here, or pass as arg
        linesProcessed: newCommissions.length,
        errorsFound: 0, // db.commissions.import throws on error, so if we are here, 0 errors in the batch (or it's all-or-nothing)
        fileName: 'Importação Excel'
      });

      refreshCommissions();
      alert(`${imported.length} tabelas importadas com sucesso!`);
    } catch (error: any) {
      alert(error.message);
      // Log the error
      db.logs.add({
        user: 'Sistema',
        linesProcessed: newCommissions.length,
        errorsFound: newCommissions.length, // Assuming all failed if one failed in this simple implementation
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
