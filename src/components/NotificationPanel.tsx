/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { DatabaseService, subscreverNotificacoesLocais } from '../services/db';
import { Notificacao } from '../types';
import { Bell, Check, Trash2, X, AlertTriangle, Play, CheckCircle2 } from 'lucide-react';

interface NotificationPanelProps {
  onClose?: () => void;
  onTicketClick?: (ticketId: string) => void;
}

export default function NotificationPanel({ onClose, onTicketClick }: NotificationPanelProps) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);

  useEffect(() => {
    // Load initial
    async function load() {
      const list = await DatabaseService.getNotificacoes();
      setNotificacoes(list);
    }
    load();

    // Listen to live events (Supabase or Local Offline pub-sub)
    const unsubOffline = subscreverNotificacoesLocais((n) => {
      setNotificacoes(prev => [n, ...prev].slice(0, 50));
    });

    return () => {
      unsubOffline();
    };
  }, []);

  const handleMarcarLida = async (id: string) => {
    await DatabaseService.marcarNotificacaoLida(id);
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  };

  const handleLimparLidas = async () => {
    await DatabaseService.limparNotificacoesLidas();
    setNotificacoes(prev => prev.filter(n => !n.lida));
  };

  const getIcone = (tipo: Notificacao['tipo']) => {
    switch (tipo) {
      case 'chamado_critico':
        return <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />;
      case 'chamado_assumido':
        return <Play className="h-4.5 w-4.5 text-sky-500" />;
      case 'chamado_finalizado':
        return <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />;
      default:
        return <Bell className="h-4.5 w-4.5 text-slate-400" />;
    }
  };

  const nLidasCount = notificacoes.filter(n => !n.lida).length;

  return (
    <div id="notif_dropdown" className="absolute right-0 top-12 w-80 md:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 flex flex-col max-h-[480px]">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-xl">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            Notificações 
            {nLidasCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] bg-sky-500 text-white rounded-full font-semibold">
                {nLidasCount} novas
              </span>
            )}
          </h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">Tempo real ativo</p>
        </div>
        
        <div className="flex items-center gap-2">
          {notificacoes.some(n => n.lida) && (
            <button
              onClick={handleLimparLidas}
              title="Limpar notificações lidas"
              className="p-1 px-2 text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Limpar</span>
            </button>
          )}
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin">
        {notificacoes.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            <Bell className="h-8 w-8 mx-auto stroke-1 mb-2 text-slate-300" />
            <p className="text-xs">Nenhuma notificação registrada</p>
          </div>
        ) : (
          notificacoes.map((item) => (
            <div 
              key={item.id} 
              className={`p-3.5 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer relative group ${
                !item.lida ? 'bg-sky-50/40 dark:bg-sky-500/5' : ''
              }`}
              onClick={() => {
                if (item.chamado_id && onTicketClick) {
                  onTicketClick(item.chamado_id);
                }
              }}
            >
              <div className="mt-0.5 p-1.5 flex h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 items-center justify-center shrink-0">
                {getIcone(item.tipo)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-1">
                  <h4 className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                    {item.titulo}
                  </h4>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 shrink-0 select-none">
                    {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5 break-words">
                  {item.mensagem}
                </p>

                {!item.lida && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarcarLida(item.id);
                    }}
                    className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 font-semibold"
                  >
                    <Check className="h-3 w-3" />
                    <span>Marcar como lida</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Inline Toast manager for alert bubbles
export function RealtimeToastOverlay({ onTicketClick }: { onTicketClick: (ticketId: string) => void }) {
  const [toast, setToast] = useState<Notificacao | null>(null);

  useEffect(() => {
    const unsub = subscreverNotificacoesLocais((n) => {
      // Trigger native desktop sound or simple browser alert fallback if active
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav');
        audio.volume = 0.2;
        audio.play().catch(() => {});
      } catch(e) {}
      
      setToast(n);
      const timer = setTimeout(() => {
        setToast(null);
      }, 5500);
      return () => clearTimeout(timer);
    });

    return () => unsub();
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 max-w-sm bg-slate-900 dark:bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl p-4 flex gap-3.5 z-50 animate-bounce cursor-pointer hover:bg-slate-800 transition"
         onClick={() => {
           if (toast.chamado_id) {
             onTicketClick(toast.chamado_id);
           }
           setToast(null);
         }}>
      <div className="p-2 h-9 w-9 rounded-lg bg-sky-500/10 text-sky-400 items-center justify-center shrink-0 flex mt-0.5">
        <Bell className="h-5 w-5 animate-swing" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h4 className="font-bold text-xs text-white uppercase tracking-wider">{toast.titulo}</h4>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setToast(null);
            }} 
            className="text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-slate-300 mt-1 leading-normal line-clamp-3">
          {toast.mensagem}
        </p>
        <span className="text-[10px] text-sky-400 mt-2 block font-semibold hover:underline">
          Clique para abrir ficha técnica &rarr;
        </span>
      </div>
    </div>
  );
}
