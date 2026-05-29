/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DatabaseService } from '../services/db';
import NotificationPanel from './NotificationPanel';
import { 
  Bell, 
  Sun, 
  Moon, 
  LogOut, 
  User, 
  Settings,
  Lock,
  ChevronDown,
  UserCheck,
  Edit2,
  Check,
  AlertCircle
} from 'lucide-react';

interface HeaderProps {
  onSeccaoAlternar: (seccao: 'dashboard' | 'chamados' | 'admin') => void;
  seccaoAtiva: string;
  onRefreshTickes: () => void;
  onOpenTicket: (id: string) => void;
}

export default function Header({ onSeccaoAlternar, seccaoAtiva, onRefreshTickes, onOpenTicket }: HeaderProps) {
  const { usuario, logout, modoEscuro, alternarModoEscuro, atualizarPerfil } = useAuth();
  
  const [mostrarNotif, setMostrarNotif] = useState(false);
  const [mostrarMenuId, setMostrarMenuId] = useState(false);
  const [mostrarPerfilModal, setMostrarPerfilModal] = useState(false);
  const [nLidasCount, setNLidasCount] = useState(0);

  // Profile fields state
  const [nomeForm, setNomeForm] = useState(usuario?.nome || '');
  const [loginForm, setLoginForm] = useState(usuario?.login || '');
  const [senhaForm, setSenhaForm] = useState('');
  const [confirmaSenhaForm, setConfirmaSenhaForm] = useState('');
  const [infoPerfil, setInfoPerfil] = useState<{ sucesso: boolean; msg: string } | null>(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const btnMenuRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    async function loadNLidas() {
      const list = await DatabaseService.getNotificacoes();
      setNLidasCount(list.filter(n => !n.lida).length);
    }
    loadNLidas();

    // Trigger update on notification events
    const handleUp = () => loadNLidas();
    window.addEventListener('mecanica_notif_fired', handleUp);
    
    // Check click outside profile dropdown
    const clickOutside = (e: MouseEvent) => {
      if (
        mostrarMenuId && 
        menuRef.current && 
        !menuRef.current.contains(e.target as Node) &&
        btnMenuRef.current &&
        !btnMenuRef.current.contains(e.target as Node)
      ) {
        setMostrarMenuId(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);

    return () => {
      window.removeEventListener('mecanica_notif_fired', handleUp);
      document.removeEventListener('mousedown', clickOutside);
    };
  }, [mostrarMenuId]);

  const handleSalvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoPerfil(null);

    if (!nomeForm.trim() || !loginForm.trim()) {
      setInfoPerfil({ sucesso: false, msg: 'Os campos de Nome e Login não podem ficar em branco.' });
      return;
    }

    if (senhaForm && senhaForm !== confirmaSenhaForm) {
      setInfoPerfil({ sucesso: false, msg: 'As senhas informadas não coincidem.' });
      return;
    }

    setCarregandoPerfil(true);
    try {
      await atualizarPerfil(nomeForm, loginForm, senhaForm || undefined);
      setInfoPerfil({ sucesso: true, msg: 'Seu perfil foi atualizado com sucesso!' });
      setSenhaForm('');
      setConfirmaSenhaForm('');
      onRefreshTickes(); // recarrega views se usar nomes
    } catch (err: any) {
      setInfoPerfil({ sucesso: false, msg: err.message || 'Houve um erro no processamento do perfil.' });
    } finally {
      setCarregandoPerfil(false);
    }
  };

  const getSeloPerfil = (perfil: string) => {
    switch (perfil) {
      case 'admin':
        return 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-400 border border-violet-200 dark:border-violet-850';
      case 'mecanico':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200 dark:border-sky-850';
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-850';
    }
  };

  return (
    <>
      <header id="app_header" className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 px-6 z-40 transition-colors flex items-center justify-between">
        
        {/* Lado Esquerdo - Logotipo & Seções */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSeccaoAlternar('dashboard')}>
            <div className="p-2 bg-sky-600 rounded-xl text-white">
              <Settings className="h-5 w-5 animate-spin-slow" />
            </div>
            <div className="hidden sm:block">
              <span className="font-extrabold text-slate-900 dark:text-white tracking-tight block text-base">MecanicPro</span>
              <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-widest leading-none">Manutenção</span>
            </div>
          </div>

          {/* Abas Principais de Navegação */}
          <nav className="flex items-center gap-1.5">
            <button
              onClick={() => onSeccaoAlternar('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                seccaoAtiva === 'dashboard'
                  ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onSeccaoAlternar('chamados')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                seccaoAtiva === 'chamados'
                  ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              Chamados
            </button>
            {usuario?.perfil === 'admin' && (
              <button
                onClick={() => onSeccaoAlternar('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  seccaoAtiva === 'admin'
                    ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                Configurações & Painel
              </button>
            )}
          </nav>
        </div>

        {/* Lado Direito - Ações, Notificações, Tema, Usuário */}
        <div className="flex items-center gap-4">
          
          {/* Botão Escuro/Claro */}
          <button
            onClick={alternarModoEscuro}
            title={modoEscuro ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-250 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            {modoEscuro ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>

          {/* Botão de Notoriedades */}
          <div className="relative">
            <button
              onClick={() => setMostrarNotif(!mostrarNotif)}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-250 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition relative"
            >
              <Bell className="h-4.5 w-4.5" />
              {nLidasCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-500 rounded-full animate-pulse"></span>
              )}
            </button>

            {mostrarNotif && (
              <NotificationPanel 
                onClose={() => setMostrarNotif(false)} 
                onTicketClick={(ticketId) => {
                  setMostrarNotif(false);
                  onOpenTicket(ticketId);
                }}
              />
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

          {/* Dropdown de Identidade do Usuário */}
          <div className="relative">
            <button
              ref={btnMenuRef}
              onClick={() => setMostrarMenuId(!mostrarMenuId)}
              className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
            >
              <div className="h-7 w-7 rounded-md bg-sky-500 text-white flex items-center justify-center font-bold text-xs select-none shadow">
                {usuario?.nome.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left select-none">
                <span className="block text-xs font-bold leading-none text-slate-900 dark:text-white max-w-[124px] truncate">{usuario?.nome}</span>
                <span className="block text-[8px] font-extrabold uppercase text-slate-405 group mt-0.5 max-w-[124px] truncate text-slate-500">{usuario?.perfil}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {mostrarMenuId && (
              <div 
                ref={menuRef}
                className="absolute right-0 top-11 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 z-50 text-slate-700 dark:text-slate-300 divide-y divide-slate-100 dark:divide-slate-800"
              >
                
                {/* Cabeçalho informativo no menu */}
                <div className="p-3 text-xs">
                  <p className="font-semibold text-slate-900 dark:text-white">{usuario?.nome}</p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase">Login: @{usuario?.login}</p>
                  
                  <div className="mt-2 text-[10px] inline-block font-extrabold">
                    <span className={`px-2 py-0.5 rounded-full ${getSeloPerfil(usuario?.perfil || '')}`}>
                      {usuario?.perfil}
                    </span>
                  </div>
                </div>

                {/* Ações */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setMostrarMenuId(false);
                      setMostrarPerfilModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2"
                  >
                    <User className="h-4 w-4 text-slate-400" />
                    <span>Meu Perfil</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      logout();
                      window.location.reload();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-955/20 transition flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4 text-rose-500" />
                    <span>Encerrar Sessão</span>
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>
      </header>

      {/* MODAL CONFIGURAÇÃO DO PERFIL DO USUÁRIO */}
      {mostrarPerfilModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 transition-all animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6.5 relative">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-150 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-sky-500" />
                Configurar Perfil do Usuário
              </h3>
              <button
                onClick={() => {
                  setMostrarPerfilModal(false);
                  setInfoPerfil(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 cursor-pointer"
              >
                Fechar
              </button>
            </div>

            {infoPerfil && (
              <div className={`p-3 border mt-4 rounded-lg text-xs flex items-center gap-2 ${
                infoPerfil.sucesso
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-50 dark:bg-rose-950/20 border-rose-250 dark:border-rose-900/50 text-rose-600 dark:text-rose-400'
              }`}>
                {infoPerfil.sucesso ? <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" /> : <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0" />}
                <span>{infoPerfil.msg}</span>
              </div>
            )}

            <form onSubmit={handleSalvarPerfil} className="space-y-4 mt-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Seu Nome Completo</label>
                <input
                  type="text"
                  value={nomeForm}
                  onChange={(e) => setNomeForm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Login Cadastrado (UserName)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-450">@</span>
                  <input
                    type="text"
                    value={loginForm}
                    onChange={(e) => setLoginForm(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-805/50 space-y-3">
                <p className="text-[10px] font-bold text-slate-450 uppercase flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> Alterar Senha de Acesso (Deixe em branco se não desejar alterar)
                </p>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-601 dark:text-slate-350">Nova Senha</label>
                  <input
                    type="password"
                    value={senhaForm}
                    onChange={(e) => setSenhaForm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-601 dark:text-slate-350">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    value={confirmaSenhaForm}
                    onChange={(e) => setConfirmaSenhaForm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarPerfilModal(false);
                    setInfoPerfil(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={carregandoPerfil}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-400 text-white rounded-lg text-xs font-semibold transition"
                >
                  {carregandoPerfil ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}
