/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DatabaseService } from '../services/db';
import { Chamado, Atendimento, PecaUtilizada, Anexo, AuditLog } from '../types';
import { 
  X, 
  Wrench, 
  MapPin, 
  Flame, 
  Maximize2, 
  Printer, 
  FileText, 
  History, 
  User, 
  Clock, 
  Paperclip,
  Check,
  AlertTriangle,
  Edit2
} from 'lucide-react';

interface TicketDetailModalProps {
  chamadoId: string;
  onClose: () => void;
  onRefresh: () => void;
  onEditTicket: (id: string) => void;
  onRegistrarAtendimento: (id: string) => void;
}

export default function TicketDetailModal({ chamadoId, onClose, onRefresh, onEditTicket, onRegistrarAtendimento }: TicketDetailModalProps) {
  const { usuario } = useAuth();
  
  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [atendimento, setAtendimento] = useState<Atendimento | null>(null);
  const [pecas, setPecas] = useState<PecaUtilizada[]>([]);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  
  // States for cancel parameters
  const [modoCancelar, setModoCancelar] = useState(false);
  const [justificativaCancel, setJustificativaCancel] = useState('');

  useEffect(() => {
    async function loadFichaCompleta() {
      setCarregando(true);
      try {
        const list = await DatabaseService.getChamados();
        const found = list.find(c => c.id === chamadoId);
        if (found) {
          setChamado(found);

          // Get accompanying data
          const [attData, pecasData, anexosData, logsData] = await Promise.all([
            DatabaseService.getAtendimentoPorChamado(chamadoId),
            DatabaseService.getPecasPorChamado(chamadoId),
            DatabaseService.getAnexosPorChamado(chamadoId),
            DatabaseService.getAuditLogs(chamadoId)
          ]);

          setAtendimento(attData);
          setPecas(pecasData);
          setAnexos(anexosData);
          setLogs(logsData);
        } else {
          setErro('Chamado técnico inexistente ou excluído.');
        }
      } catch (err) {
        setErro('Erro ao processar as informações da ocorrência.');
      } finally {
        setCarregando(false);
      }
    }
    loadFichaCompleta();
  }, [chamadoId]);

  const handleCancelarChamado = async () => {
    if (!justificativaCancel.trim()) {
      alert('Por favor, informe a justificativa técnica para o cancelamento.');
      return;
    }
    if (!usuario?.id) return;

    try {
      await DatabaseService.cancelarChamado(chamadoId, usuario.id, justificativaCancel);
      onRefresh();
      onClose();
    } catch (e: any) {
      alert(e.message || 'Houve um erro ao realizar o cancelamento.');
    }
  };

  const handleImprimirChamadoIndividual = () => {
    if (!chamado) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Bloqueador de pop-ups ativo! Ative para imprimir o roteiro de manutenção.');
      return;
    }

    const pecasStr = pecas.map(p => `<li>${p.nome_peca} - Quantidade: ${p.quantidade}</li>`).join('') || '<li>Nenhuma peça utilizada no atendimento</li>';
    const checkStr = atendimento?.checklist_conclusao?.map(i => `
      <div style="display: flex; align-items: center; gap: 8px; margin-top: 5px;">
        <span style="font-weight: bold; font-family: monospace; color: ${i.checked ? 'green' : 'red'};">${i.checked ? '[X]' : '[ ]'}</span>
        <span>${i.descricao}</span>
      </div>
    `).join('') || 'Sem checklist associado';

    const sAbertura = new Date(chamado.data_abertura).toLocaleString('pt-BR');
    const sInicio = chamado.data_inicio ? new Date(chamado.data_inicio).toLocaleString('pt-BR') : 'Não iniciado';
    const sFim = chamado.data_encerramento ? new Date(chamado.data_encerramento).toLocaleString('pt-BR') : 'Sem encerramento';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ordem de Serviço #${chamado.numero_chamado}</title>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #334155; padding: 30px; line-height: 1.4; }
            .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase; font-weight: bold; }
            .table-spec { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .table-spec td, .table-spec th { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 13px; }
            .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 5px; margin-top: 25px; margin-bottom: 12px; }
            @media print {
              button { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #0f172a; padding-bottom: 15px;">
            <div>
              <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #0f172a;">FICHA TÉCNICA DA ORDEM DE SERVIÇO</h1>
              <span style="font-size: 12px; color: #64748b;">MecanicPro S.A. • Controle de Manutenção Mecânica</span>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 18px; font-weight: bold; font-family: monospace;">Nº: ${chamado.numero_chamado}</span><br>
              <span style="font-size: 11px; color: #94a3b8;">DATA EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          <table class="table-spec">
            <tr>
              <th>EQUIPAMENTO</th>
              <td>${chamado.equipamento}</td>
              <th>PATRIMÔNIO</th>
              <td>${chamado.patrimonio}</td>
            </tr>
            <tr>
              <th>SETOR FABRIL</th>
              <td>${chamado.setor}</td>
              <th>LOCALIZAÇÃO</th>
              <td>${chamado.localizacao}</td>
            </tr>
            <tr>
              <th>GRAVIDADE</th>
              <td>${chamado.prioridade.toUpperCase()}</td>
              <th>STATUS ATUAL</th>
              <td>${chamado.status.replace('_', ' ').toUpperCase()}</td>
            </tr>
            <tr>
              <th>OPERADOR SOLICITANTE</th>
              <td>${chamado.operador_nome || 'Operador'}</td>
              <th>MECÂNICO DE CONTROLE</th>
              <td>${chamado.mecanico_nome || 'Nenhum'}</td>
            </tr>
          </table>

          <div class="section-title">Informativo Geral da Solicitação</div>
          <p style="font-size: 13px; margin: 0; padding: 10px; background-color: #f8fafc; border-radius: 6px;">
            <strong>Ocorrência:</strong> ${chamado.descricao}
          </p>
          ${chamado.sintomas_observados ? `
            <p style="font-size: 13px; margin: 10px 0 0 0; padding: 10px; background-color: #f8fafc; border-radius: 6px;">
              <strong>Sintomas observados:</strong> ${chamado.sintomas_observados}
            </p>
          ` : ''}

          <div class="section-title">Informações Cronológicas Técnicas</div>
          <table class="table-spec">
            <tr>
              <th>Data de Abertura</th>
              <td>${sAbertura}</td>
            </tr>
            <tr>
              <th>Início do Atendimento</th>
              <td>${sInicio}</td>
            </tr>
            <tr>
              <th>Encerramento Técnico</th>
              <td>${sFim}</td>
            </tr>
          </table>

          ${atendimento ? `
            <div class="section-title">Laudo de Atendimento de Manutenção</div>
            <table class="table-spec">
              <tr>
                <th style="width: 25%;">Laudo Técnico</th>
                <td>${atendimento.diagnostico}</td>
              </tr>
              <tr>
                <th>Causa Raiz</th>
                <td>${atendimento.causa_raiz}</td>
              </tr>
              <tr>
                <th>Solução Aplicada</th>
                <td>${atendimento.solucao}</td>
              </tr>
              <tr>
                <th>Tempo Técnico</th>
                <td>${atendimento.horas_trabalhadas} Horas Trabalhadas</td>
              </tr>
              ${atendimento.observacoes ? `
                <tr>
                  <th>Observações Técnicas</th>
                  <td>${atendimento.observacoes}</td>
                </tr>
              ` : ''}
            </table>

            <div class="section-title">Materiais e Peças Utilizadas</div>
            <ul style="font-size: 13px; padding-left: 20px; margin: 0;">
              ${pecasStr}
            </ul>

            <div class="section-title">Validação do Checklist Operacional</div>
            <div style="font-size: 12px; font-family: sans-serif;">
              ${checkStr}
            </div>

            <div class="section-title">Assinaturas Responsáveis</div>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; font-size: 12px;">
              <div style="width: 45%; border-top: 1px solid #475569; text-align: center; padding-top: 5px;">
                ${chamado.operador_nome || 'Linha Operador'}<br>Solicitante
              </div>
              <div style="width: 45%; border-top: 1px solid #475569; text-align: center; padding-top: 5px;">
                ${atendimento.assinatura_digital && !atendimento.assinatura_digital.startsWith('data:') ? atendimento.assinatura_digital : chamado.mecanico_nome || 'Mecânico Regulador'}<br>Equipe Mecânica
              </div>
            </div>
          ` : `
            <div style="margin-top: 30px; text-align: center; font-size: 13px; color: #94a3b8; font-style: italic; border: 1px dashed #cbd5e1; padding: 20px; border-radius: 6px;">
              A Ordem de Serviço encontra-se em status administrativo de andamento básico. Sem registro de laudo de conclusão técnico até o momento.
            </div>
          `}

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // Color mappings
  const getSeloPrioridade = (p: string) => {
    switch (p) {
      case 'critica':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-205';
      case 'alta':
        return 'bg-orange-100 text-orange-850 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-205';
      case 'media':
        return 'bg-yellow-105 text-yellow-850 dark:bg-yellow-950/40 dark:text-yellow-400 border border-yellow-205';
      default:
        return 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-205';
    }
  };

  const hasClosing = () => chamado?.status === 'finalizado';

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in text-xs">
      <div id="ticket_detail_sheet" className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-600 rounded-xl text-white">
              <FileText className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                Ficha Técnica do Chamado {chamado?.numero_chamado}
              </h3>
              <p className="text-[10px] text-slate-500 font-semibold tracking-wide">Relatório consolidado técnico da ordem de serviço</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {chamado && (
              <button
                onClick={handleImprimirChamadoIndividual}
                title="Imprimir ordem de serviço individual"
                className="p-1.5 hover:bg-slate-105 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-705 text-slate-700 dark:text-slate-300 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="h-4.5 w-4.5" />
                <span>Imprimir OS</span>
              </button>
            )}
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Panel Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
          
          {carregando ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500">
              <Clock className="h-8 w-8 mx-auto animate-spin mb-2" />
              <span>Carregando dados consolidados...</span>
            </div>
          ) : erro ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>{erro}</span>
            </div>
          ) : chamado && (
            <>
              {/* Properties Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border border-slate-150 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-900/30">
                
                <div className="space-y-0.5">
                  <span className="block text-[10px] font-bold text-slate-450 uppercase leading-none">Equipamento</span>
                  <span className="block font-bold text-slate-900 dark:text-white truncate">{chamado.equipamento}</span>
                </div>

                <div className="space-y-0.5">
                  <span className="block text-[10px] font-bold text-slate-450 uppercase leading-none">Nº Patrimônio</span>
                  <span className="block font-semibold text-slate-700 dark:text-slate-350">{chamado.patrimonio}</span>
                </div>

                <div className="space-y-0.5">
                  <span className="block text-[10px] font-bold text-slate-450 uppercase leading-none">Setor Fabril</span>
                  <span className="block font-semibold text-slate-700 dark:text-slate-350">{chamado.setor}</span>
                </div>

                <div className="space-y-0.5">
                  <span className="block text-[10px] font-bold text-slate-450 uppercase leading-none">Localização Fina</span>
                  <span className="block font-semibold text-slate-700 dark:text-slate-350">{chamado.localizacao}</span>
                </div>

                <div className="space-y-0.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 md:pt-0 md:border-t-0">
                  <span className="block text-[10px] font-bold text-slate-450 uppercase leading-none">Complexidade</span>
                  <span className={`inline-block px-2 mt-1 rounded font-black text-[9px] uppercase tracking-wider ${getSeloPrioridade(chamado.prioridade)}`}>
                    {chamado.prioridade}
                  </span>
                </div>

                <div className="space-y-0.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 md:pt-0 md:border-t-0">
                  <span className="block text-[10px] font-bold text-slate-450 uppercase leading-none">Estado Atual</span>
                  <span className="block font-bold mt-1 text-slate-850 dark:text-slate-205 lowercase truncate">
                    • {chamado.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-0.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 md:pt-0 md:border-t-0">
                  <span className="block text-[10px] font-bold text-slate-450 uppercase leading-none">Operador Relator</span>
                  <span className="block font-semibold text-slate-700 dark:text-slate-350">{chamado.operador_nome || 'Operador'}</span>
                </div>

                <div className="space-y-0.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 md:pt-0 md:border-t-0">
                  <span className="block text-[10px] font-bold text-slate-450 uppercase leading-none font-sans">Mecânico Escalado</span>
                  <span className="block font-semibold text-slate-700 dark:text-slate-350">{chamado.mecanico_nome || 'Aguardando Atendente'}</span>
                </div>

              </div>

              {/* Informações detalhadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-650 dark:text-slate-350 uppercase tracking-wide flex items-center gap-1">
                    <FileText className="h-4 w-4 text-slate-400" /> Descrição do Problema Registrada
                  </h4>
                  <div className="p-3 border border-slate-150 dark:border-slate-805 rounded-xl bg-slate-50 dark:bg-slate-900/50 leading-relaxed text-slate-755 dark:text-slate-300">
                    {chamado.descricao}
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-slate-655 dark:text-slate-350 uppercase tracking-wide flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-slate-450" /> Sintomas Técnicos Observados
                  </h4>
                  <div className="p-3 border border-slate-155 dark:border-slate-805 rounded-xl bg-slate-50 dark:bg-slate-900/50 leading-relaxed text-slate-755 dark:text-slate-300 italic">
                    {chamado.sintomas_observados || 'Nenhum sintoma físico visual pré-anotado pelo operador.'}
                  </div>
                </div>

              </div>

              {/* ATENDIMENTO DO MECANICO (LAUDO) */}
              {atendimento ? (
                <div className="space-y-3.5 p-4.5 border border-violet-100 dark:border-violet-950/40 rounded-2xl bg-violet-500/5 animate-fade-in">
                  
                  <div className="flex items-center justify-between pb-2 border-b border-violet-100 dark:border-violet-950/30">
                    <h4 className="font-extrabold text-[11px] text-violet-850 dark:text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Wrench className="h-4.5 w-4.5" /> Laudo de Avaliação e Desempenho Mecânico
                    </h4>
                    <span className="text-[10px] font-bold text-violet-600 bg-violet-500/10 px-2 py-0.5 rounded-full uppercase">
                      Tempo de Atendimento: {atendimento.horas_trabalhadas} Horas Work
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    
                    <div className="p-3 bg-white dark:bg-slate-900 border border-violet-500/10 rounded-xl">
                      <span className="block font-bold text-slate-500 text-[10px] uppercase">Diagnóstico Diagnóstico</span>
                      <p className="mt-1 leading-normal text-slate-750 dark:text-slate-300 font-semibold">{atendimento.diagnostico}</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 border border-violet-500/10 rounded-xl">
                      <span className="block font-bold text-slate-500 text-[10px] uppercase">Causa Raiz</span>
                      <p className="mt-1 leading-normal text-slate-750 dark:text-slate-300 font-semibold">{atendimento.causa_raiz}</p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 border border-violet-500/10 rounded-xl">
                      <span className="block font-bold text-slate-500 text-[10px] uppercase">Solução Aplicada</span>
                      <p className="mt-1 leading-normal text-slate-750 dark:text-slate-300 font-semibold">{atendimento.solucao}</p>
                    </div>

                  </div>

                  {atendimento.observacoes && (
                    <div className="p-3 bg-white dark:bg-slate-900 border border-violet-500/10 rounded-xl">
                      <span className="block font-bold text-slate-550 text-[10px] uppercase">Recomendações e Observações de Engenharia</span>
                      <p className="mt-1 text-slate-600 dark:text-slate-400 leading-normal">{atendimento.observacoes}</p>
                    </div>
                  )}

                  {/* Peças e Checklist flex row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Lista peças */}
                    <div className="space-y-1.5">
                      <span className="block font-bold text-violet-800 dark:text-violet-405 text-[10px] uppercase">Peças Substituídas Utilizadas</span>
                      <div className="border border-violet-500/10 bg-white dark:bg-slate-900 rounded-xl p-3 space-y-1 text-slate-750">
                        {pecas.length === 0 ? (
                          <span className="italic text-slate-400">Nenhum componente técnico substituído.</span>
                        ) : (
                          pecas.map(p => (
                            <div key={p.id} className="flex justify-between items-center py-1 border-b border-slate-50 dark:border-slate-805 text-xs">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{p.nome_peca}</span>
                              <span className="font-extrabold text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded leading-none">Qtd: {p.quantidade}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Checklist final */}
                    <div className="space-y-1.5">
                      <span className="block font-bold text-violet-800 dark:text-violet-405 text-[10px] uppercase">Checklist e Conformidades de Fechamento</span>
                      <div className="border border-violet-500/10 bg-white dark:bg-slate-900 rounded-xl p-3 space-y-1.5">
                        {atendimento.checklist_conclusao?.map(i => (
                          <div key={i.id} className="flex items-center gap-2 text-xs font-semibold">
                            <span className={`text-[10px] font-bold ${i.checked ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'} px-1.5 rounded leading-none`}>
                              {i.checked ? '✔ OK' : '✘ Pendente'}
                            </span>
                            <span className="text-slate-700 dark:text-slate-350 font-normal leading-tight">{i.descricao}</span>
                          </div>
                        )) || <span className="italic text-slate-400">Sem checklist técnico anexado.</span>}
                      </div>
                    </div>

                  </div>

                  {/* Assinatura Digital visual */}
                  {atendimento.assinatura_digital && (
                    <div className="pt-2 border-t border-violet-100 dark:border-violet-950/30">
                      <span className="block font-bold text-violet-800 dark:text-violet-405 text-[10px] uppercase">Assinatura Digital de Entrega Técnico</span>
                      {atendimento.assinatura_digital.startsWith('data:') ? (
                        <div className="mt-1.5 inline-block bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 pl-4">
                          <img 
                            src={atendimento.assinatura_digital} 
                            alt="Rubrica Digital" 
                            className="h-10 object-contain block dark:invert" 
                            referrerPolicy="no-referrer"
                          />
                          <span className="text-[9px] text-slate-450 block text-right border-t border-slate-100 mt-1 uppercase">Membro Mecânico Credenciado</span>
                        </div>
                      ) : (
                        <span className="inline-block mt-1 pl-3 border-l-2 border-sky-500 italic font-mono text-slate-805 dark:text-slate-300 font-semibold bg-white dark:bg-slate-800 py-1 px-3.5 rounded-md">
                          "{atendimento.assinatura_digital}"
                        </span>
                      )}
                    </div>
                  )}

                </div>
              ) : (
                <div className="p-6 border border-dashed border-amber-200 dark:border-amber-900/40 rounded-2xl bg-amber-500/5 flex flex-col items-center text-center justify-center space-y-2 animate-fade-in">
                  <Clock className="h-9 w-9 text-amber-500 animate-spin-slow stroke-1 shrink-0" />
                  <p className="font-extrabold text-xs text-amber-800 dark:text-amber-400 uppercase tracking-widest leading-none">Aguardando Resolução Preventiva/Corretiva</p>
                  <p className="text-slate-500 dark:text-slate-400 max-w-sm text-[11px] leading-normal pt-1.5">
                    O diagnóstico oficial das peças necessárias, checklists funcionais sob o LOTO e assinatura técnica estarão disponíveis nesta visualização assim que o mecânico responsável finalizar seu laudo de intervention.
                  </p>
                </div>
              )}

              {/* Anexos Ficheiro download list */}
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <h4 className="font-bold text-slate-650 dark:text-slate-350 uppercase tracking-wide flex items-center gap-1">
                  <Paperclip className="h-4 w-4 text-slate-401" /> Fotos de Apoio ou Anexos de Ordem ({anexos.length})
                </h4>

                {anexos.length === 0 ? (
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 italic">Nenhum anexo fotográfico ou manual associado a este registro de chamado.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {anexos.map(an => (
                      <div key={an.id} className="border border-slate-150 dark:border-slate-805 rounded-xl bg-slate-50 dark:bg-slate-900/40 overflow-hidden flex flex-col">
                        {/* Se for imagem previsualiza */}
                        {an.url_arquivo.startsWith('data:image/') ? (
                          <div className="h-24 bg-slate-205 dark:bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-100 dark:border-slate-850">
                            <img 
                              src={an.url_arquivo} 
                              alt={an.nome_arquivo} 
                              className="w-full h-full object-cover block"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="h-24 bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center border-b border-indigo-100 dark:border-indigo-950/40">
                            <FileText className="h-8 w-8 text-indigo-400" />
                          </div>
                        )}
                        <div className="p-2 flex flex-col justify-between flex-1 gap-1.5">
                          <span className="truncate block font-semibold text-slate-750 dark:text-slate-300 font-mono text-[10px]" title={an.nome_arquivo}>
                            {an.nome_arquivo}
                          </span>
                          <a 
                            href={an.url_arquivo} 
                            download={an.nome_arquivo}
                            className="text-[9px] font-bold text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 block select-none uppercase"
                          >
                            Baixar Arquivo &darr;
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TIMELINE DE LOGS DE AUDITORIA */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <h4 className="font-bold text-slate-650 dark:text-slate-350 uppercase tracking-wide flex items-center gap-1.5">
                  <History className="h-4.5 w-4.5 text-slate-401" /> Logs de Alterações e Trilha de Auditoria Técnica
                </h4>

                <div className="space-y-3.5 pl-3 relative border-l-2 border-slate-200 dark:border-slate-800">
                  {logs.map(lg => (
                    <div key={lg.id} className="relative animate-fade-in leading-tight pl-4">
                      {/* Bullet indicador */}
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-805 border-2 border-white dark:border-slate-900"></span>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 select-none">
                        <span className="font-bold text-slate-805 dark:text-white uppercase tracking-wider text-[10px]">
                          {lg.acao} • {lg.usuario_nome}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(lg.data_alteracao).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-slate-650 dark:text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
                        {lg.detalhes}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </>
          )}

        </div>

        {/* Action button bar controls Footer */}
        <div className="p-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex justify-between items-center shrink-0">
          
          <div className="flex gap-2">
            {/* Botão Cancelar Chamado (disponível para operador criador/admin e estados em aberto) */}
            {chamado && chamado.status !== 'finalizado' && chamado.status !== 'cancelado' && (
              <>
                {!modoCancelar ? (
                  <button
                    onClick={() => setModoCancelar(true)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-955/20 dark:border-rose-900 dark:text-rose-400 rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    Cancelar OS
                  </button>
                ) : (
                  <div className="flex items-center gap-2 flex-1 max-w-md bg-white border dark:bg-slate-950 p-2 border-rose-500 rounded-xl">
                    <input
                      type="text"
                      placeholder="Justificativa técnica de cancelamento corporativa..."
                      value={justificativaCancel}
                      onChange={(e) => setJustificativaCancel(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-205 py-1 px-2.5 rounded-lg text-slate-955"
                    />
                    <button
                      onClick={handleCancelarChamado}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => { setModoCancelar(false); setJustificativaCancel(''); }}
                      className="text-[10px] text-slate-500 hover:underline px-1.5"
                    >
                      Voltar
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Operator edit button is visible ONLY if status === 'aberto' */}
            {chamado && chamado.status === 'aberto' && (usuario?.perfil === 'operador' || usuario?.perfil === 'admin') && (
              <button
                onClick={() => { onEditTicket(chamado.id); onClose(); }}
                className="px-3.5 py-1.5 bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-850 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Editar Ordem</span>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {/* Mechanics action button, if claimed the ticket */}
            {chamado && chamado.status !== 'finalizado' && chamado.status !== 'cancelado' && chamado.mecanico_id === usuario?.id && (
              <button
                onClick={() => { onRegistrarAtendimento(chamado.id); onClose(); }}
                className="px-4 py-2 bg-violet-605 text-white bg-violet-600 hover:bg-violet-500 text-xs font-bold rounded-lg transition shadow-md shadow-violet-500/10 flex items-center gap-1.5"
              >
                <Wrench className="h-4 w-4" />
                <span>Encerrar OS Técnica &rarr;</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-705 dark:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
            >
              Fechar Visualização
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
