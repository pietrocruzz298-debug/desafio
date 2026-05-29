/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Chamado, PrioridadeChamado, StatusChamado } from '../types';
import { exportarChamadosCSV, exportarChamadosPDF } from '../utils/exports';
import { 
  Search, 
  SlidersHorizontal, 
  ArrowUpDown, 
  Download, 
  Printer, 
  Plus, 
  Eye, 
  Wrench,
  AlertTriangle,
  Play,
  FileText,
  Clock,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Sparkles
} from 'lucide-react';

interface TicketListProps {
  chamados: Chamado[];
  onOpenTicket: (id: string) => void;
  onOpenNovoChamado: () => void;
  onAssumirChamado: (id: string) => void;
}

type SortField = 'numero_chamado' | 'equipamento' | 'prioridade' | 'status' | 'data_abertura';
type SortOrder = 'asc' | 'desc';

export default function TicketList({ chamados, onOpenTicket, onOpenNovoChamado, onAssumirChamado }: TicketListProps) {
  const { usuario } = useAuth();

  // Search & Filter state
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todos');
  const [filtroSetor, setFiltroSetor] = useState<string>('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');
  const [filtroMecanico, setFiltroMecanico] = useState<string>('todos');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('data_abertura');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  const listSectores = useMemo(() => {
    const setores = new Set<string>();
    chamados.forEach(c => c.setor && setores.add(c.setor));
    return Array.from(setores);
  }, [chamados]);

  const listMecanicos = useMemo(() => {
    const mecanicos = new Set<string>();
    chamados.forEach(c => c.mecanico_nome && mecanicos.add(c.mecanico_nome));
    return Array.from(mecanicos).filter(m => m !== 'Não atribuído');
  }, [chamados]);

  // Handle double column-based sorting toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPagina(1);
  };

  // Convert priorities to order indexes
  const getPrioridadeIndice = (p: PrioridadeChamado) => {
    const pesos: Record<PrioridadeChamado, number> = {
      critica: 4,
      alta: 3,
      media: 2,
      baixa: 1
    };
    return pesos[p] || 0;
  };

  // ==========================================
  // FILTERING LOGIC
  // ==========================================
  const chamadosFiltrados = useMemo(() => {
    return chamados.filter(ch => {
      // 1. Global Search Box index of match
      const pBusca = busca.toLowerCase().trim();
      const matchBusca = !pBusca || 
        ch.numero_chamado.toLowerCase().includes(pBusca) ||
        ch.equipamento.toLowerCase().includes(pBusca) ||
        ch.patrimonio.toLowerCase().includes(pBusca) ||
        ch.setor.toLowerCase().includes(pBusca) ||
        ch.descricao.toLowerCase().includes(pBusca) ||
        (ch.operador_nome && ch.operador_nome.toLowerCase().includes(pBusca)) ||
        (ch.mecanico_nome && ch.mecanico_nome.toLowerCase().includes(pBusca));

      // 2. Status Match
      const matchStatus = filtroStatus === 'todos' || ch.status === filtroStatus;

      // 3. Priority Match
      const matchPriority = filtroPrioridade === 'todos' || ch.prioridade === filtroPrioridade;

      // 4. Sector Match
      const matchSetor = filtroSetor === 'todos' || ch.setor === filtroSetor;

      // 5. Mechanic Match
      const matchMecanico = filtroMecanico === 'todos' || ch.mecanico_nome === filtroMecanico;

      // 6. Period Range Match
      let matchPeriodo = true;
      if (filtroPeriodo !== 'todos' && ch.data_abertura) {
        const dataAbertura = new Date(ch.data_abertura).getTime();
        const agora = Date.now();
        const umDiaMs = 24 * 3605 * 1000;

        if (filtroPeriodo === '24h') {
          matchPeriodo = agora - dataAbertura <= umDiaMs;
        } else if (filtroPeriodo === '7d') {
          matchPeriodo = agora - dataAbertura <= 7 * umDiaMs;
        } else if (filtroPeriodo === '30d') {
          matchPeriodo = agora - dataAbertura <= 30 * umDiaMs;
        }
      }

      return matchBusca && matchStatus && matchPriority && matchSetor && matchMecanico && matchPeriodo;
    }).sort((a, b) => {
      // Handle actual fields sorting
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'prioridade') {
        valA = getPrioridadeIndice(a.prioridade);
        valB = getPrioridadeIndice(b.prioridade);
      }

      if (typeof valA === 'string') {
        const compare = valA.localeCompare(valB || '');
        return sortOrder === 'asc' ? compare : -compare;
      }
      if (typeof valA === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      // Date ISO matches are strings standard comparison
      const compStr = String(valA).localeCompare(String(valB));
      return sortOrder === 'asc' ? compStr : -compStr;
    });
  }, [chamados, busca, filtroStatus, filtroPrioridade, filtroSetor, filtroMecanico, filtroPeriodo, sortField, sortOrder]);

  // ==========================================
  // PAGINATION COMPUTE
  // ==========================================
  const totalItens = chamadosFiltrados.length;
  const totalPaginas = Math.ceil(totalItens / porPagina) || 1;
  const indexInicial = (pagina - 1) * porPagina;
  const chamadosPaginados = useMemo(() => {
    return chamadosFiltrados.slice(indexInicial, indexInicial + porPagina);
  }, [chamadosFiltrados, indexInicial, porPagina]);

  const handleMudarPagina = (nova: number) => {
    if (nova >= 1 && nova <= totalPaginas) {
      setPagina(nova);
    }
  };

  // String descriptive of filters for PDF banner
  const getFiltrosAtivosString = () => {
    const list: string[] = [];
    if (busca) list.push(`Busca: "${busca}"`);
    if (filtroStatus !== 'todos') list.push(`Status: ${filtroStatus.toUpperCase()}`);
    if (filtroPrioridade !== 'todos') list.push(`Prioridade: ${filtroPrioridade.toUpperCase()}`);
    if (filtroSetor !== 'todos') list.push(`Setor: ${filtroSetor}`);
    if (filtroMecanico !== 'todos') list.push(`Mecânico: ${filtroMecanico}`);
    if (filtroPeriodo !== 'todos') list.push(`Período: Últimas ${filtroPeriodo}`);
    return list.join(' | ') || 'Nenhum filtro ativo (Todos os registros)';
  };

  // Color mappings
  const getBadgePrioridade = (p: PrioridadeChamado) => {
    switch (p) {
      case 'critica':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-450 border-rose-200 dark:border-rose-900 border';
      case 'alta':
        return 'bg-orange-100 text-orange-850 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-900 border';
      case 'media':
        return 'bg-yellow-100 text-yellow-850 dark:bg-yellow-950/40 dark:text-yellow-400 border-yellow-250 dark:border-yellow-905 border';
      default:
        return 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900 border';
    }
  };

  const getBadgeStatus = (st: StatusChamado) => {
    switch (st) {
      case 'aberto':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900';
      case 'em_analise':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900';
      case 'aguardando_peca':
        return 'bg-amber-100 text-amber-850 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900';
      case 'em_manutencao':
        return 'bg-indigo-100 text-indigo-850 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900';
      case 'teste_realizado':
        return 'bg-purple-100 text-purple-850 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-250 dark:border-purple-900';
      case 'finalizado':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-350 border border-slate-200 dark:border-slate-750';
      case 'cancelado':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-955/15 dark:text-rose-400 border border-rose-200 dark:border-rose-900';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto animate-fade-in text-slate-900 dark:text-slate-200">
      
      {/* Botões do Topo - Ações Rápidas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Painel Operacional de Chamados</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Gerencie, filtre e tome ações sobre ordens de serviço preventivas e corretivas</p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Botão Exportar CSV */}
          <button
            onClick={() => exportarChamadosCSV(chamadosFiltrados)}
            className="px-3.5 py-2 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Excel (CSV)</span>
          </button>

          {/* Botão Exportar PDF */}
          <button
            onClick={() => exportarChamadosPDF(chamadosFiltrados, getFiltrosAtivosString())}
            className="px-3.5 py-2 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span>PDF Geral</span>
          </button>

          {/* Botão Criar Chamado (Operator e Admin) */}
          {(usuario?.perfil === 'operador' || usuario?.perfil === 'admin') && (
            <button
              onClick={onOpenNovoChamado}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-505/10 hover:-translate-y-0.5 transform"
            >
              <Plus className="h-4 w-4" />
              <span>Abrir Chamado</span>
            </button>
          )}
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm space-y-4">
        
        {/* Barra de Busca e Range de Datas */}
        <div className="flex flex-col lg:flex-row gap-3">
          
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisa global (nº do chamado, equipamento, patrimônio, setor, operador...)"
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 inline-flex items-center gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filtragem Rápida:
            </span>

            {/* Período */}
            <select
              value={filtroPeriodo}
              onChange={(e) => { setFiltroPeriodo(e.target.value); setPagina(1); }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="todos">Todo o Período</option>
              <option value="24h">Últimas 24 Horas</option>
              <option value="7d">Últimos 7 Dias</option>
              <option value="30d">Últimos 30 Dias</option>
            </select>
          </div>
        </div>

        {/* Linha secundária de filtros detalhados */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          
          {/* Status */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-450 uppercase leading-none">Filtrar por Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => { setFiltroStatus(e.target.value); setPagina(1); }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-350 py-1.5 focus:outline-none"
            >
              <option value="todos">Todos os Status</option>
              <option value="aberto">Abertos</option>
              <option value="em_analise">Em análise</option>
              <option value="aguardando_peca">Aguardando peça</option>
              <option value="em_manutencao">Em manutenção</option>
              <option value="teste_realizado">Teste realizado</option>
              <option value="finalizado">Finalizados</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>

          {/* Urgência/Prioridade */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-450 uppercase leading-none">Filtrar Gravidade</label>
            <select
              value={filtroPrioridade}
              onChange={(e) => { setFiltroPrioridade(e.target.value); setPagina(1); }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-350 py-1.5 focus:outline-none"
            >
              <option value="todos">Todas Prioridades</option>
              <option value="critica">Crítica 🚨</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>

          {/* Setores */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-450 uppercase leading-none">Filtrar Setor</label>
            <select
              value={filtroSetor}
              onChange={(e) => { setFiltroSetor(e.target.value); setPagina(1); }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-350 py-1.5 focus:outline-none"
            >
              <option value="todos">Todos os Setores</option>
              {listSectores.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Mecânico encarregado */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-450 uppercase leading-none">Filtrar Mecânico</label>
            <select
              value={filtroMecanico}
              onChange={(e) => { setFiltroMecanico(e.target.value); setPagina(1); }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-350 py-1.5 focus:outline-none"
            >
              <option value="todos">Qualquer Profissional</option>
              {listMecanicos.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* TABELA DE REGISTROS / CHIP DE FEEDBACK */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Indicativo de total no filtro */}
        <div className="px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Mostrando <strong>{totalItens > 0 ? indexInicial + 1 : 0}</strong> a <strong>{Math.min(indexInicial + porPagina, totalItens)}</strong> de <strong>{totalItens}</strong> chamados filtrados</span>
          <span className="text-[10px] text-sky-505 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{sortField.replace('_',' ')}: {sortOrder.toUpperCase()}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-white" onClick={() => handleSort('numero_chamado')}>
                  <div className="flex items-center gap-1.5">
                    <span>Nº CHAMADO</span>
                    <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-white" onClick={() => handleSort('equipamento')}>
                  <div className="flex items-center gap-1.5">
                    <span>EQUIPAMENTO</span>
                    <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400">SETOR / FACILIDADE</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-white" onClick={() => handleSort('prioridade')}>
                  <div className="flex items-center gap-1.5">
                    <span>SEVERIDADE</span>
                    <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-white" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1.5">
                    <span>STATUS</span>
                    <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400">RESPONSÁVEL</th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-white" onClick={() => handleSort('data_abertura')}>
                  <div className="flex items-center gap-1.5">
                    <span>ABERTURA</span>
                    <ArrowUpDown className="h-3 w-3 shrink-0" />
                  </div>
                </th>
                <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 text-right">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {chamadosPaginados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 dark:text-slate-500">
                    <SlidersHorizontal className="h-10 w-10 mx-auto stroke-1 text-slate-300 mb-2" />
                    <p className="font-semibold text-sm">Nenhum chamado de manutenção localizado</p>
                    <p className="text-xs pt-1">Experimente remover alguns critérios ou termos adicionados de busca.</p>
                  </td>
                </tr>
              ) : (
                chamadosPaginados.map(ch => (
                  <tr key={ch.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-800/20 transition-all">
                    
                    {/* Número Chamado */}
                    <td className="p-4 font-bold text-xs text-slate-900 dark:text-white font-mono shrink-0">
                      {ch.numero_chamado}
                    </td>

                    {/* Equipamento */}
                    <td className="p-4">
                      <span className="block text-xs font-bold text-slate-950 dark:text-white">{ch.equipamento}</span>
                      <span className="block text-[10px] text-slate-500 font-medium">Pat: {ch.patrimonio}</span>
                    </td>

                    {/* Setor */}
                    <td className="p-4 text-xs font-semibold text-slate-650 dark:text-slate-350">
                      <span className="block">{ch.setor}</span>
                      <span className="block text-[10px] text-slate-500 font-normal leading-tight">{ch.localizacao}</span>
                    </td>

                    {/* Severidade */}
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-wider select-none ${getBadgePrioridade(ch.prioridade)}`}>
                        {ch.prioridade}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-widest select-none ${getBadgeStatus(ch.status)}`}>
                        {ch.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Responsável */}
                    <td className="p-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {ch.mecanico_nome && ch.mecanico_nome !== 'Não atribuído' ? (
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 w-5 rounded bg-violet-600 text-white flex items-center justify-center font-bold text-[9px]">
                            {ch.mecanico_nome.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[124px] inline-block">{ch.mecanico_nome}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-500 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded-md uppercase">Aguardando</span>
                      )}
                    </td>

                    {/* Abertura */}
                    <td className="p-4 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(ch.data_abertura).toLocaleDateString('pt-BR')} 
                      <span className="block text-[9px] text-slate-400 mt-0.5">{new Date(ch.data_abertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>

                    {/* Ações */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* Botão Visualizar */}
                        <button
                          onClick={() => onOpenTicket(ch.id)}
                          title="Ficha técnica completa"
                          className="p-1 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-400" />
                          <span>Ficha</span>
                        </button>

                        {/* Botão Mecânico Assumir (se perfil mecânico e em aberto) */}
                        {usuario?.perfil === 'mecanico' && ch.status === 'aberto' && (
                          <button
                            onClick={() => onAssumirChamado(ch.id)}
                            className="p-1 px-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 rounded transition shadow-sm"
                          >
                            <Wrench className="h-3.5 w-3.5" />
                            <span>Assumir</span>
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINAÇÃO FOOTER */}
        {totalItens > 0 && (
          <div className="px-5 py-4.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Escolha por página */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Mostrar por página:</span>
              <select
                value={porPagina}
                onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1); }}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 focus:outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Controles de página */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleMudarPagina(pagina - 1)}
                disabled={pagina === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => handleMudarPagina(n)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                      pagina === n
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/10'
                        : 'text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleMudarPagina(pagina + 1)}
                disabled={pagina === totalPaginas}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
