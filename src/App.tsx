/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DatabaseService, subscreverNotificacoesLocais } from './services/db';
import { Chamado, Notificacao } from './types';
import Login from './components/Login';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TicketList from './components/TicketList';
import AdminPanel from './components/AdminPanel';
import TicketFormModal from './components/TicketFormModal';
import AtendimentoFormModal from './components/AtendimentoFormModal';
import TicketDetailModal from './components/TicketDetailModal';
import SecretariaVirtual from './components/SecretariaVirtual';
import { 
  Bell, 
  X, 
  AlertTriangle, 
  Wrench, 
  CheckSquare, 
  ArrowRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';

function AppContent() {
  const { usuario, modoEscuro } = useAuth();
  
  // Navigation
  const [seccaoAtiva, setSeccaoAtiva] = useState<'dashboard' | 'chamados' | 'admin'>('dashboard');

  // Shared Data
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [carregandoChamados, setCarregandoChamados] = useState(true);

  // Modal Triggers
  const [visualizarChamadoId, setVisualizarChamadoId] = useState<string | null>(null);
  const [novoChamadoAberto, setNovoChamadoAberto] = useState(false);
  const [editarChamadoId, setEditarChamadoId] = useState<string | null>(null);
  const [atendimentoChamadoId, setAtendimentoChamadoId] = useState<string | null>(null);

  // Toast systems
  const [toasts, setToasts] = useState<Notificacao[]>([]);

  // Periodical reload or manual trigger
  const recarregarChamados = async () => {
    setCarregandoChamados(true);
    try {
      const list = await DatabaseService.getChamados();
      setChamados(list);
    } catch (e) {
      console.error('Falha de sincronização de chamados:', e);
    } finally {
      setCarregandoChamados(false);
    }
  };

  useEffect(() => {
    if (usuario) {
      recarregarChamados();
      // Enforce correct tabs authorization fallback
      if (usuario.perfil === 'mecanico' && seccaoAtiva === 'admin') {
        setSeccaoAtiva('chamados');
      }
    }
  }, [usuario, seccaoAtiva]);

  // Hook-up real-time offline local/supabase pub-sub notifications
  useEffect(() => {
    if (!usuario) return;

    const unsubscribe = subscreverNotificacoesLocais((novaNotif: Notificacao) => {
      // Append new toast
      setToasts(prev => [novaNotif, ...prev].slice(0, 5));

      // Quick audio feedback click
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(660, audioCtx.currentTime); // A5 note
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // Slide upward
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (err) {
        // Safe fail block if browser blocks audioContext interaction
      }

      // Auto dismiss after 6.5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== novaNotif.id));
      }, 6500);

      // Reload tickets automatically to make the lists dynamic
      recarregarChamados();
    });

    return () => {
      unsubscribe();
    };
  }, [usuario]);

  // Mechanics action to pick up / claim tickets
  const handleAssumirChamado = async (id: string) => {
    if (!usuario?.id) return;
    try {
      await DatabaseService.assumirChamado(id, usuario.id);
      await recarregarChamados();
    } catch (err: any) {
      alert(err.message || 'Erro ao tentar assumir este chamado do painel.');
    }
  };

  const abrirEdicaoChamado = (id: string) => {
    setEditarChamadoId(id);
    setNovoChamadoAberto(true);
  };

  const fecharNovoChamadoForm = () => {
    setEditarChamadoId(null);
    setNovoChamadoAberto(false);
  };

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // If session is empty or unauthorized, show split screen login block
  if (!usuario) {
    return <Login />;
  }

  return (
    <div className={`min-h-screen font-sans bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300 ${modoEscuro ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
      
      {/* HEADER COORDINATOR */}
      <Header
        onSeccaoAlternar={(seccao) => setSeccaoAtiva(seccao)}
        seccaoAtiva={seccaoAtiva}
        onRefreshTickes={recarregarChamados}
        onOpenTicket={(id) => setVisualizarChamadoId(id)}
      />

      {/* FLOATING AUDIO-VISUAL REAL-TIME TOAST OVERLAYS */}
      {toasts.length > 0 && (
        <div id="toast_notification_layer" className="fixed top-16 right-4 z-55 flex flex-col gap-2.5 max-w-sm w-full leading-snug">
          {toasts.map(t => (
            <div 
              key={t.id} 
              className={`p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex gap-3 animate-slide-in relative overflow-hidden`}
            >
              {/* Top Accent Indicator color */}
              <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                t.tipo === 'chamado_critico' ? 'bg-rose-500' : t.tipo === 'chamado_finalizado' ? 'bg-emerald-500' : 'bg-sky-505'
              }`}></div>

              <div className="flex-1 pl-1 min-w-0">
                <div className="flex justify-between items-start gap-1">
                  <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Notificação Técnica</span>
                  <button 
                    onClick={() => handleDismissToast(t.id)} 
                    className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                  {t.tipo === 'chamado_critico' ? (
                    <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                  ) : t.tipo === 'chamado_finalizado' ? (
                    <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Wrench className="h-4 w-4 text-sky-500 shrink-0" />
                  )}
                  <span className="truncate">{t.titulo}</span>
                </h4>

                <p className="text-[11px] text-slate-600 dark:text-slate-350 mt-1 pb-1">
                  {t.mensagem}
                </p>

                {t.chamado_id && (
                  <button
                    onClick={() => { setVisualizarChamadoId(t.chamado_id!); handleDismissToast(t.id); }}
                    className="mt-1 inline-flex items-center gap-1 font-bold text-[10px] text-sky-655 hover:underline"
                  >
                    <span>Ficha técnica &rarr;</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CORE ACTIVE WORKSPACE */}
      <main className="flex-grow">
        {seccaoAtiva === 'dashboard' && (
          <Dashboard 
            chamados={chamados} 
          />
        )}

        {seccaoAtiva === 'chamados' && (
          <TicketList
            chamados={chamados}
            onOpenTicket={(id) => setVisualizarChamadoId(id)}
            onOpenNovoChamado={() => setNovoChamadoAberto(true)}
            onAssumirChamado={handleAssumirChamado}
          />
        )}

        {seccaoAtiva === 'admin' && usuario.perfil === 'admin' && (
          <AdminPanel onNotifyParametrosChanged={recarregarChamados} />
        )}
      </main>

      {/* CONSOLIDATED MODALS CONTAINER OVERLAYS */}
      
      {/* 1. Ticket Form Modal (Create & Edit Operator) */}
      {novoChamadoAberto && (
        <TicketFormModal
          chamadoIdParaEditar={editarChamadoId}
          onClose={fecharNovoChamadoForm}
          onRefresh={recarregarChamados}
        />
      )}

      {/* 2. Mechanics Reparo Intervention Modal */}
      {atendimentoChamadoId && (
        <AtendimentoFormModal
          chamadoId={atendimentoChamadoId}
          onClose={() => setAtendimentoChamadoId(null)}
          onRefresh={recarregarChamados}
        />
      )}

      {/* 3. Ticket Detail Card Sheet Sheet */}
      {visualizarChamadoId && (
        <TicketDetailModal
          chamadoId={visualizarChamadoId}
          onClose={() => setVisualizarChamadoId(null)}
          onRefresh={recarregarChamados}
          onEditTicket={abrirEdicaoChamado}
          onRegistrarAtendimento={(id) => setAtendimentoChamadoId(id)}
        />
      )}

      {/* Floating virtual AI secretary assistant */}
      <SecretariaVirtual />

      {/* FOOTER METRICS AND PLATFORM ACCENTS */}
      <footer className="py-5 bg-white dark:bg-slate-905 border-t border-slate-200 dark:border-slate-800 px-6 block text-center md:text-left select-none text-[10px]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2">
          
          <div className="flex items-center gap-1 text-slate-500 font-semibold leading-none">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Unidade Operacional Sincronizada</span>
            <span className="text-slate-350 dark:text-slate-650 px-1">|</span>
            <span>Perfil: @{usuario.login} ({usuario.perfil.toUpperCase()})</span>
          </div>

          <div className="text-slate-400 dark:text-slate-500 font-medium">
            MecanicPro v2.4.0 • Sistema Integrado de Chamados e Manutenção • {new Date().getFullYear()}
          </div>

        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
