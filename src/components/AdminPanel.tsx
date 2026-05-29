/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DatabaseService } from '../services/db';
import { Usuario, PerfilUsuario, ParametrosSistema, AuditLog } from '../types';
import { 
  Users, 
  UserPlus, 
  Settings, 
  Trash2, 
  Shield, 
  Check, 
  Plus, 
  X, 
  AlertCircle,
  FileClock,
  Briefcase,
  ToggleLeft,
  ToggleRight,
  Database,
  History,
  Lock,
  Search
} from 'lucide-react';

interface AdminPanelProps {
  onNotifyParametrosChanged: () => void;
}

export default function AdminPanel({ onNotifyParametrosChanged }: AdminPanelProps) {
  const { usuario, recarregarParametros_ } = useAuth();
  
  const [abaAtiva, setAbaAtiva] = useState<'usuarios' | 'parametros' | 'auditoria'>('usuarios');
  const [carregando, setCarregando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [mensagemErro, setMensagemErro] = useState('');

  // 1. USUÁRIOS STATE
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [criarModo, setCriarModo] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoLogin, setNovoLogin] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [novoPerfil, setNovoPerfil] = useState<PerfilUsuario>('operador');

  // 2. PARÂMETROS STATE
  const [parametros, setParametros] = useState<ParametrosSistema | null>(null);
  const [novoSetor, setNovoSetor] = useState('');
  const [novaOficina, setNovaOficina] = useState('');

  // 3. AUDITORIA TIMELINE LOGS
  const [logsAuditoria, setLogsAuditoria] = useState<AuditLog[]>([]);
  const [buscaLogs, setBuscaLogs] = useState('');

  useEffect(() => {
    carregarTudo();
  }, [abaAtiva]);

  // Unified load trigger
  const carregarTudo = async () => {
    setCarregando(true);
    setMensagemErro('');
    try {
      if (abaAtiva === 'usuarios') {
        const usrs = await DatabaseService.getUsuarios();
        setUsuarios(usrs);
      } else if (abaAtiva === 'parametros') {
        const params = await DatabaseService.getParametros();
        setParametros(params);
      } else if (abaAtiva === 'auditoria') {
        // Collect global logs from db.ts
        const chamados = await DatabaseService.getChamados();
        const logsPromises = chamados.map(ch => DatabaseService.getAuditLogs(ch.id));
        const resolvedLogs = await Promise.all(logsPromises);
        // Flatten and sort descending
        const allLogs = resolvedLogs.flat().sort(
          (a, b) => new Date(b.data_alteracao).getTime() - new Date(a.data_alteracao).getTime()
        );
        setLogsAuditoria(allLogs);
      }
    } catch (e: any) {
      setMensagemErro('Falha ao processar sincronização de registros administrativos.');
    } finally {
      setCarregando(false);
    }
  };

  // ==========================================
  // USUÁRIOS CONTROLS
  // ==========================================
  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro('');
    setMensagemSucesso('');

    if (!novoNome.trim() || !novoLogin.trim() || !novaSenha.trim()) {
      setMensagemErro('Preencha o Nome, Login e Senha para realizar o cadastramento.');
      return;
    }

    // Check pre-existing logins to prevent duplicating offline indexes
    const loginFormatado = novoLogin.trim().toLowerCase();
    const loginInUse = usuarios.some(u => u.login.toLowerCase() === loginFormatado);
    if (loginInUse) {
      setMensagemErro(`O identificador "${novoLogin}" já está associado a outro funcionário do corporativo.`);
      return;
    }

    try {
      await DatabaseService.criarUsuario({
        nome: novoNome.trim(),
        login: loginFormatado,
        senha: novaSenha.trim(),
        perfil: novoPerfil
      });

      setMensagemSucesso(`Colaborador "${novoNome}" registrado com sucesso.`);
      setNovoNome('');
      setNovoLogin('');
      setNovaSenha('');
      setCriarModo(false);
      carregarTudo();
    } catch (err: any) {
      setMensagemErro(err.message || 'Erro durante o cadastro de usuário.');
    }
  };

  const handleExcluirUsuario = async (id: string, nomeExcluido: string) => {
    if (!window.confirm(`Tem certeza de que deseja remover o acesso do colaborador: "${nomeExcluido}"?`)) return;
    
    setMensagemErro('');
    setMensagemSucesso('');
    if (!usuario?.id) return;

    try {
      await DatabaseService.excluirUsuario(id, usuario.id);
      setMensagemSucesso(`Acesso de "${nomeExcluido}" revogado do sistema.`);
      carregarTudo();
    } catch (err: any) {
      setMensagemErro(err.message || 'Falha de exclusão física.');
    }
  };

  // ==========================================
  // PARÂMETROS CONTROLS
  // ==========================================
  const handleSalvarParametrosGerais = async (campo: keyof ParametrosSistema, valor: any) => {
    if (!parametros) return;
    setMensagemErro('');
    setMensagemSucesso('');

    const novosParams = {
      ...parametros,
      [campo]: valor
    };

    try {
      const resp = await DatabaseService.salvarParametros(novosParams);
      setParametros(resp);
      setMensagemSucesso('Parâmetros operacionais gravados com sucesso.');
      
      // Notify parent contexts
      if (recarregarParametros_) {
        recarregarParametros_();
      }
      onNotifyParametrosChanged();
    } catch (e) {
      setMensagemErro('Falha durante gravação de parâmetros.');
    }
  };

  const handleAddTagSetor = async () => {
    if (!novoSetor.trim() || !parametros) return;
    if (parametros.setoresDisponiveis.includes(novoSetor.trim())) {
      setMensagemErro('Setor já catalogado nas diretrizes.');
      return;
    }

    const novosSectores = [...parametros.setoresDisponiveis, novoSetor.trim()];
    await handleSalvarParametrosGerais('setoresDisponiveis', novosSectores);
    setNovoSetor('');
  };

  const handleRemoverTagSetor = async (setor: string) => {
    if (!parametros) return;
    const novosSectores = parametros.setoresDisponiveis.filter(s => s !== setor);
    await handleSalvarParametrosGerais('setoresDisponiveis', novosSectores);
  };

  const handleAddTagOficina = async () => {
    if (!novaOficina.trim() || !parametros) return;
    if (parametros.oficinasDisponiveis.includes(novaOficina.trim())) {
      setMensagemErro('Oficina já registrada.');
      return;
    }

    const novasOficinas = [...parametros.oficinasDisponiveis, novaOficina.trim()];
    await handleSalvarParametrosGerais('oficinasDisponiveis', novasOficinas);
    setNovaOficina('');
  };

  const handleRemoverTagOficina = async (oficina: string) => {
    if (!parametros) return;
    const novasOficinas = parametros.oficinasDisponiveis.filter(o => o !== oficina);
    await handleSalvarParametrosGerais('oficinasDisponiveis', novasOficinas);
  };

  // Filter logs list based on user search string
  const logsFiltrados = logsAuditoria.filter(log => {
    if (!buscaLogs) return true;
    const term = buscaLogs.toLowerCase();
    return (
      (log.numero_chamado && log.numero_chamado.toLowerCase().includes(term)) ||
      log.acao.toLowerCase().includes(term) ||
      log.usuario_nome.toLowerCase().includes(term) ||
      (log.detalhes && log.detalhes.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-150 dark:text-white tracking-tight flex items-center gap-2">
          <Shield className="h-5.5 w-5.5 text-sky-505" /> Painel de Administração e Auditoria
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Configure as permissões operacionais de usuários, regras de checklist e visualize tempos e histórico completo</p>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 select-none">
        {([
          { id: 'usuarios', l: 'Gestão de Usuários', i: Users },
          { id: 'parametros', l: 'Parâmetros do Sistema', i: Settings },
          { id: 'auditoria', l: 'Trilha de Auditoria (Logs)', i: History }
        ] as const).map(tab => {
          const Icon = tab.i;
          return (
            <button
              key={tab.id}
              onClick={() => { setAbaAtiva(tab.id); setMensagemSucesso(''); setMensagemErro(''); }}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-bold transition-all relative border-b-2 cursor-pointer ${
                abaAtiva === tab.id
                  ? 'border-sky-500 text-sky-600 dark:text-white'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:border-slate-205'
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              <span>{tab.l}</span>
            </button>
          );
        })}
      </div>

      {/* SUCCESS / ERROR FEEDBACK OUTLETS */}
      {mensagemSucesso && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-xs">
          <Check className="h-4.5 w-4.5 text-emerald-500 rounded-full" />
          <span>{mensagemSucesso}</span>
        </div>
      )}
      {mensagemErro && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 flex items-start gap-2 text-xs">
          <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
          <span>{mensagemErro}</span>
        </div>
      )}

      {/* ==========================================
          TAB 1: USUÁRIOS WORKSPACE
          ========================================== */}
      {abaAtiva === 'usuarios' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* List de Usuários Table */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/40">
              <span className="font-extrabold text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Users className="h-4 w-4" /> Usuários Ativos no Sistema ({usuarios.length})
              </span>
              <button
                onClick={() => setCriarModo(!criarModo)}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-505 text-white font-bold text-xs rounded-lg transition shadow-sm cursor-pointer flex items-center gap-1"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>{criarModo ? 'Ocultar Form' : 'Adicionar Usuário'}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 text-slate-500">
                    <th className="p-4 font-bold">NOME COMPLETO</th>
                    <th className="p-4 font-bold">IDENTIFICADOR / LOGIN</th>
                    <th className="p-4 font-bold">PERFIL OPEROCIONAL</th>
                    <th className="p-4 font-bold">SISTEMA PASSWORD</th>
                    <th className="p-4 font-bold text-right">CONTROLE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {usuarios.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/10">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        {u.nome} {u.id === usuario?.id && <span className="ml-1 text-[9px] bg-sky-500/10 text-sky-650 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Você</span>}
                      </td>
                      <td className="p-4 text-slate-505 font-semibold font-mono">@{u.login}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider ${
                          u.perfil === 'admin' 
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400' 
                            : u.perfil === 'mecanico' 
                            ? 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-400'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                        }`}>
                          {u.perfil}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 font-mono">
                        <div className="flex items-center gap-1 select-none">
                          <Lock className="h-3 w-3 inline" />
                          <span>•••••</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleExcluirUsuario(u.id, u.nome)}
                          disabled={u.id === usuario?.id}
                          className="p-1 px-2.5 bg-red-100 dark:bg-red-955/10 text-rose-600 hover:bg-rose-105 rounded text-[11px] font-black transition disabled:opacity-40 cursor-pointer"
                          title={u.id === usuario?.id ? 'Não é possível autodeletar o administrador ativo' : 'Desabilitar acesso'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          {/* Form Create */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4.5 space-y-4 h-fit">
            <h3 className="font-extrabold text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5 border-b pb-2.5">
              <UserPlus className="h-4.5 w-4.5" /> Registro de Funcionário
            </h3>

            <form onSubmit={handleCriarUsuario} className="space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-350">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Heitor"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-805 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-955 dark:text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-350">Login de Acesso Corporativo</label>
                <input
                  type="text"
                  placeholder="Login amigável sem caracteres especiais"
                  value={novoLogin}
                  onChange={(e) => setNovoLogin(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-805 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-955 dark:text-white font-mono lowercase"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-350">Senha Inicial</label>
                <input
                  type="password"
                  placeholder="Mínimo de 4 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-805 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-955 dark:text-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-350">Nível do Perfil de Acesso</label>
                <select
                  value={novoPerfil}
                  onChange={(e) => setNovoPerfil(e.target.value as PerfilUsuario)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-805 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-955 dark:text-white"
                  required
                >
                  <option value="operador">Operador (Linhas fabris e abertura)</option>
                  <option value="mecanico">Mecânico (Execução e laudos de reparo)</option>
                  <option value="admin">Administrador Geral</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full py-2 bg-sky-600 hover:bg-sky-505 text-white font-bold rounded-lg transition shadow shadow-sky-500/10 cursor-pointer"
              >
                Cadastrar Colaborador &rarr;
              </button>

            </form>
          </div>

        </div>
      )}

      {/* ==========================================
          TAB 2: CONFIGURAÇÕES / PARÂMETROS
          ========================================== */}
      {abaAtiva === 'parametros' && parametros && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Configurações básicas */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-4.5">
            <h3 className="font-extrabold text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5 border-b pb-2.5">
              <Settings className="h-4.5 w-4.5" /> Configurações de Regra Operacional
            </h3>

            {/* Tempo crítico */}
            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-850 gap-4">
              <div className="space-y-0.5">
                <span className="block font-bold text-slate-750 dark:text-slate-300">Tempo de Resolução Crítica Máxima</span>
                <span className="block text-[10px] text-slate-450 dark:text-slate-500">Definição do teto referencial crítico em horas operacionais para SLAs de ordens graves de produção.</span>
              </div>
              <div className="w-24 shrink-0">
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={parametros.tempoMaximoCriticoHoras}
                  onChange={(e) => handleSalvarParametrosGerais('tempoMaximoCriticoHoras', Number(e.target.value))}
                  className="w-full text-center py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Checklist obrigatório */}
            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-850 gap-4">
              <div className="space-y-0.5">
                <span className="block font-bold text-slate-755 dark:text-slate-300">Exigir Preenchimento Completo do Checklist</span>
                <span className="block text-[10px] text-slate-455 dark:text-slate-500">Impede que o mecânico finalize o chamado se houver alguma pendência nos itens de LOTO e checagens estáticas.</span>
              </div>
              <button
                type="button"
                onClick={() => handleSalvarParametrosGerais('checklistObrigatorio', !parametros.checklistObrigatorio)}
                className="text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {parametros.checklistObrigatorio ? (
                  <ToggleRight className="h-9 w-9 text-sky-500 stroke-1" />
                ) : (
                  <ToggleLeft className="h-9 w-9 text-slate-400 stroke-1" />
                )}
              </button>
            </div>

            {/* Assinatura digital obrigatoriedade */}
            <div className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-850 gap-4">
              <div className="space-y-0.5">
                <span className="block font-bold text-slate-755 dark:text-slate-300">Habilitar Assinatura Digital Manual (Canvas)</span>
                <span className="block text-[10px] text-slate-455 dark:text-slate-500">Expõe blocos de desenho touch ou mouse para validação física da equipe técnica de qualidade.</span>
              </div>
              <button
                type="button"
                onClick={() => handleSalvarParametrosGerais('permitirAssinaturaDigital', !parametros.permitirAssinaturaDigital)}
                className="text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {parametros.permitirAssinaturaDigital ? (
                  <ToggleRight className="h-9 w-9 text-sky-500 stroke-1" />
                ) : (
                  <ToggleLeft className="h-9 w-9 text-slate-400 stroke-1" />
                )}
              </button>
            </div>

            <div className="p-3 bg-blue-500/5 dark:bg-sky-500/10 border border-sky-505/10 rounded-xl flex gap-2">
              <Database className="h-4.5 w-4.5 text-sky-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="block font-bold text-sky-850 dark:text-sky-400 text-[10px] uppercase">Engine Router Integrada</span>
                <p className="text-[10px] text-slate-550 dark:text-slate-400 leading-normal font-medium">Os parâmetros salvos acima são replicados instantaneamente tanto no banco local SQLite/LocalStorage quanto nas tabelas do Supabase, se configuradas.</p>
              </div>
            </div>

          </div>

          {/* Dicionário de setores e oficinas */}
          <div className="space-y-6">
            
            {/* Setores catalogados */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="font-extrabold text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Setores de Operação Catalogados</h4>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Novo setor corporativo... (Ex: Galvanoplastia)"
                  value={novoSetor}
                  onChange={(e) => setNovoSetor(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddTagSetor}
                  className="px-3 bg-sky-600 hover:bg-sky-550 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {parametros.setoresDisponiveis.map(s => (
                  <div key={s} className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-750 dark:text-slate-300 rounded-md font-semibold border border-slate-200 dark:border-slate-750">
                    <span>{s}</span>
                    <button onClick={() => handleRemoverTagSetor(s)} className="text-slate-400 hover:text-rose-500 text-[10px]">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Oficinas catalogadas */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="font-extrabold text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400">Oficinas Técnicas Internas</h4>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nova oficina técnica... (Ex: Tornearia)"
                  value={novaOficina}
                  onChange={(e) => setNovaOficina(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddTagOficina}
                  className="px-3 bg-sky-600 hover:bg-sky-550 text-white font-bold rounded-lg text-xs cursor-pointer flex items-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {parametros.oficinasDisponiveis.map(o => (
                  <div key={o} className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-750 dark:text-slate-300 rounded-md font-semibold border border-slate-200 dark:border-slate-750">
                    <span>{o}</span>
                    <button onClick={() => handleRemoverTagOficina(o)} className="text-slate-400 hover:text-rose-500 text-[10px]">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ==========================================
          TAB 3: TIMELINE AUDITORIA LOGS LIST
          ========================================== */}
      {abaAtiva === 'auditoria' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden p-5 space-y-4">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b pb-3 border-slate-100 dark:border-slate-800">
            <span className="font-extrabold text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileClock className="h-4.5 w-4.5" /> Trilha de Verificação Geral ({logsFiltrados.length} Logs localizados)
            </span>

            {/* Input buscar log */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por chamado, ação ou usuário..."
                value={buscaLogs}
                onChange={(e) => setBuscaLogs(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] scrollbar-thin">
            <table className="w-full text-left font-sans text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 text-slate-500">
                  <th className="p-3 font-bold">DATA / HORÁRIO</th>
                  <th className="p-3 font-bold">Nº CHAMADO</th>
                  <th className="p-3 font-bold">AÇÃO EXECUTADA</th>
                  <th className="p-3 font-bold">OPERADOR REGISTRADOS</th>
                  <th className="p-3 font-bold">HISTÓRICO DETALHADO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {logsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-400 dark:text-slate-500">
                      Nenhum registro de auditoria localizado para os filtros informados.
                    </td>
                  </tr>
                ) : (
                  logsFiltrados.map(lg => (
                    <tr key={lg.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/10">
                      <td className="p-3 text-slate-500 select-none whitespace-nowrap">
                        {new Date(lg.data_alteracao).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3 font-bold text-sky-655 font-mono select-all">
                        {lg.numero_chamado || 'Sistema'}
                      </td>
                      <td className="p-3">
                        <span className="font-extrabold uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-700 dark:text-slate-350 tracking-wide">
                          {lg.acao}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-300">
                        {lg.usuario_nome}
                      </td>
                      <td className="p-3 font-semibold text-slate-600 dark:text-slate-400 capitalize-first leading-relaxed">
                        {lg.detalhes}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
}
