import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Bell, Video, AlertTriangle, Info, Calendar } from 'lucide-react';
import { db } from '@/services/db';
import { Announcement } from '@/types';
import { Button } from '@/components/ui/Button';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      // Fetch active announcements sorted by date (newest first)
      const all = await db.announcements.getAll();
      const active = all
        .filter((a: any) => a.active)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAnnouncements(active);
    };
    fetchAnnouncements();
  }, []);

  if (announcements.length === 0) return null;

  const getIcon = (type: Announcement['type']) => {
    switch (type) {
      case 'Reunião': return <Video className="h-5 w-5 text-blue-500" />;
      case 'Importante': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'Manutenção': return <Info className="h-5 w-5 text-amber-500" />;
      default: return <Bell className="h-5 w-5 text-slate-500" />;
    }
  };

  const getBgColor = (type: Announcement['type']) => {
    switch (type) {
      case 'Reunião': return 'bg-blue-50 border-blue-100';
      case 'Importante': return 'bg-red-50 border-red-100';
      case 'Manutenção': return 'bg-amber-50 border-amber-100';
      default: return 'bg-slate-50 border-slate-100';
    }
  };

  return (
    <Card className="mb-6 border-slate-200 shadow-sm">
      <CardHeader className="pb-3 border-b bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-slate-700" />
          <CardTitle className="text-lg text-slate-800">Mural de Avisos</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {announcements.map((item) => (
          <div key={item.id} className={`p-4 rounded-lg border ${getBgColor(item.type)} flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between`}>
            <div className="flex gap-3 items-start">
              <div className="mt-1 p-2 bg-white rounded-full shadow-sm">
                {getIcon(item.type)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-900">{item.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white border shadow-sm text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{item.message}</p>
              </div>
            </div>
            
            {item.type === 'Reunião' && item.link && (
              <Button 
                className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                onClick={() => window.open(item.link, '_blank')}
              >
                <Video className="w-4 h-4 mr-2" />
                Entrar na Reunião
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
