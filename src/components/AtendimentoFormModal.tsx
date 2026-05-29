/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { DatabaseService } from '../services/db';
import { Chamado, StatusChamado, ChecklistItem, Atendimento } from '../types';
import { 
  X, 
  Wrench, 
  Clock, 
  Trash2, 
  Check, 
  Signature, 
  PenTool, 
  CheckSquare, 
  AlertCircle 
} from 'lucide-react';

interface AtendimentoFormModalProps {
  chamadoId: string;
  onClose: () => void;
  onRefresh: () => void;
}

interface TempPeca {
  nome: string;
  quantidade: number;
}

export default function AtendimentoFormModal({ chamadoId, onClose, onRefresh }: AtendimentoFormModalProps) {
  const { usuario, parametros } = useAuth();
  
  const [chamado, setChamado] = useState<Chamado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Atendimento Fields
  const [diagnostico, setDiagnostico] = useState('');
  const [causaRaiz, setCausaRaiz] = useState('');
  const [solucao, setSolucao] = useState('');
  const [horasTrabalhadas, setHorasTrabalhadas] = useState<number>(1);
  const [observacoes, setObservacoes] = useState('');
  const [statusFinal, setStatusFinal] = useState<StatusChamado>('finalizado');
  
  // Custom checklist items
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'chk-1', descricao: 'Energia elétrica e comandos hidráulicos isolados (LOTO)', checked: false },
    { id: 'chk-2', descricao: 'Retirados detritos, graxas residuais e cavacos da área', checked: false },
    { id: 'chk-3', descricao: 'Efetuado teste estático funcional fora de produção', checked: false },
    { id: 'chk-4', descricao: 'Validação operacional do sensor térmico e de pressões', checked: false }
  ]);

  // Peças Utilizadas List
  const [pecas, setPecas] = useState<TempPeca[]>([]);
  const [novaPecaNome, setNovaPecaNome] = useState('');
  const [novaPecaQtd, setNovaPecaQtd] = useState(1);

  // Signature state
  const [assinaturaTipo, setAssinaturaTipo] = useState<'desenho' | 'texto'>('texto');
  const [assinaturaTexto, setAssinaturaTexto] = useState(usuario?.nome || '');
  const [carregandoGravacao, setCarregandoGravacao] = useState(false);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    async function loadData() {
      try {
        const chamados = await DatabaseService.getChamados();
        const found = chamados.find(c => c.id === chamadoId);
        if (found) {
          setChamado(found);
          // Auto populate text signature with user's name
          setAssinaturaTexto(usuario?.nome || '');
        } else {
          setErro('Chamado não localizado na base corporativa.');
        }
      } catch (e) {
        setErro('Erro de comunicação ao carregar a ficha do chamado.');
      } finally {
        setCarregando(false);
      }
    }
    loadData();
  }, [chamadoId, usuario]);

  // Hook-up drawing events when 'desenho' mode is active
  useEffect(() => {
    if (assinaturaTipo === 'desenho' && canvasRef.current) {
      limparAssinaturaCanvas();
    }
  }, [assinaturaTipo]);

  // Canvas Drawing Utils
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawing.current = true;
    const pos = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b'; // slate colors

    const pos = getCoords(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Check if TouchEvent or MouseEvent
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const limparAssinaturaCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw horizontal dashed line helper
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(10, canvas.height - 25);
    ctx.lineTo(canvas.width - 10, canvas.height - 25);
    ctx.stroke();
    // Default restore lines
    ctx.setLineDash([]);
  };

  const handleCheckItem = (id: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  // Peças handling
  const handleAddPeca = () => {
    if (!novaPecaNome.trim()) return;
    if (novaPecaQtd <= 0) return;

    setPecas(prev => [...prev, { nome: novaPecaNome.trim(), quantidade: novaPecaQtd }]);
    setNovaPecaNome('');
    setNovaPecaQtd(1);
  };

  const handleRemoverPeca = (index: number) => {
    setPecas(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!diagnostico.trim() || !causaRaiz.trim() || !solucao.trim()) {
      setErro('Os campos Diagnóstico, Causa Raiz e Solução Aplicada são obrigatórios para encerramento.');
      return;
    }

    if (parametros?.checklistObrigatorio && checklist.some(i => !i.checked)) {
      setErro('O checklist de segurança e conclusão é obrigatório de acordo com as diretrizes do administrador.');
      return;
    }

    if (!usuario?.id) return;

    setCarregandoGravacao(true);
    try {
      // Gather signature representation
      let assinaturaFinal = assinaturaTexto;
      if (assinaturaTipo === 'desenho' && canvasRef.current) {
        // Collect dataURL
        assinaturaFinal = canvasRef.current.toDataURL('image/png');
      }

      const payloadAtendimento: Omit<Atendimento, 'id' | 'chamado_id' | 'created_at'> = {
        diagnostico,
        causa_raiz: causaRaiz,
        solucao,
        horas_trabalhadas: Number(horasTrabalhadas) || 1,
        observacoes,
        checklist_conclusao: checklist,
        assinatura_digital: assinaturaFinal || `${usuario?.nome} - Assinado`
      };

      // Call database closure transaction
      await DatabaseService.encerrarChamado(
        chamadoId, 
        usuario.id, 
        payloadAtendimento, 
        pecas.map(p => ({ nome_peca: p.nome, quantidade: p.quantidade }))
      );

      onRefresh();
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro durante a gravação das informações técnicas.');
    } finally {
      setCarregandoGravacao(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in text-xs">
      <div id="atendimento_form_modal" className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-violet-600 rounded-xl text-white">
              <Signature className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                Ficha de Execução de Manutenção
              </h3>
              {chamado && (
                <p className="text-[10px] text-slate-550 font-bold">FECHAMENTO DA ORDEM: {chamado.numero_chamado} • {chamado.equipamento}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs scrollbar-thin">
          
          {erro && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-lg flex items-start gap-2 text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 animate-pulse" />
              <span>{erro}</span>
            </div>
          )}

          {/* Diagnóstico técnico */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="col-span-2 space-y-1">
              <label className="font-bold text-slate-600 dark:text-slate-300">
                Laudo de Diagnóstico Técnico Realizado <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Descreva as condições reais da ocorrência encontradas no local durante sua análise."
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-sky-500"
                required
              ></textarea>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-600 dark:text-slate-305">
                Causa Raiz Identificada <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Exemplo: Falta de lubrificação, fadiga mecânica, sobretensão primária..."
                value={causaRaiz}
                onChange={(e) => setCausaRaiz(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-sky-500"
                required
              ></textarea>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-600 dark:text-slate-305">
                Solução Aplicada Efetuada <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Exemplo: Substituição de válvula solenóide pneumática e re-calibração mecânica..."
                value={solucao}
                onChange={(e) => setSolucao(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-sky-500"
                required
              ></textarea>
            </div>

          </div>

          {/* Horas e Status Encerramento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            
            <div className="space-y-1">
              <label className="font-bold text-slate-600 dark:text-slate-350 flex items-center gap-1">
                <Clock className="h-4 w-4 text-slate-400" />
                Tempo de Manutenção (Horas Trabalhadas) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                value={horasTrabalhadas}
                onChange={(e) => setHorasTrabalhadas(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:ring-1 focus:ring-sky-500"
                required
              />
              <span className="text-[9px] text-slate-400">Insira valores decimais de fração técnica se necessário (Ex: 1.5 para 1h e 30m)</span>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-600 dark:text-slate-350">
                Observações Técnicas Complementares
              </label>
              <input
                type="text"
                placeholder="Ex: Próxima preventiva recomendada em 180h de operação..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-sky-500"
              />
            </div>

          </div>

          {/* PEÇAS UTILIZADAS SEÇÃO */}
          <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <h4 className="font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1 bg-slate-50 dark:bg-slate-800/20 py-1.5 px-2.5 rounded border border-slate-200/50 dark:border-slate-800">
              Controle de Peças e Insumos Mecânicos Utilizados
            </h4>

            {/* Inputs de peça rápida */}
            <div className="flex gap-2.5">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Nome do componente técnico (Ex: Retentor Parker Ø45mm)"
                  value={novaPecaNome}
                  onChange={(e) => setNovaPecaNome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-955 dark:text-white placeholder-slate-400"
                />
              </div>
              <div className="w-24">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={novaPecaQtd}
                  onChange={(e) => setNovaPecaQtd(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-lg text-slate-955 dark:text-white"
                />
              </div>
              <button
                type="button"
                onClick={handleAddPeca}
                className="px-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg transition"
              >
                Inserir
              </button>
            </div>

            {/* Peças inseridas list */}
            {pecas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {pecas.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-violet-500/5 border border-violet-500/10 rounded-lg">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                      <div className="h-5 w-5 bg-violet-600 text-white flex items-center justify-center rounded font-bold text-[10px]">
                        {p.quantidade}
                      </div>
                      <span className="truncate max-w-[140px] block">{p.nome}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoverPeca(idx)}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-450 dark:text-slate-500 italic pb-1">Nenhum componente técnico foi adicionado ao atendimento até o momento.</p>
            )}

          </div>

          {/* CHECKLIST DE CONCLUSÃO */}
          <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <h4 className="font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1 bg-slate-50 dark:bg-slate-800/20 py-1.5 px-2.5 rounded border border-slate-200/50 dark:border-slate-800">
              <CheckSquare className="h-4 w-4 text-emerald-500" />
              Checklist de Conclusão Técnica e de Riscos Integrada {parametros?.checklistObrigatorio && (
                <span className="ml-1 text-[9px] bg-rose-500 text-white font-black px-1.5 rounded uppercase">Obrigatório</span>
              )}
            </h4>

            <div className="space-y-2 border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-900/50">
              {checklist.map(item => (
                <label 
                  key={item.id} 
                  className="flex items-start gap-2.5 p-1.5 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer select-none transition"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleCheckItem(item.id)}
                    className="mt-0.5 rounded border-slate-305 dark:border-slate-700 font-bold bg-white text-emerald-600 h-4 w-4 cursor-pointer"
                  />
                  <span>{item.descricao}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ASSINATURA DIGITAL */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/20 py-1 px-2.5 rounded border border-slate-200/50 dark:border-slate-800">
              <h4 className="font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                <PenTool className="h-4 w-4 text-sky-500" />
                Assinatura de Entrega Técnica Digital
              </h4>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAssinaturaTipo('texto')}
                  className={`px-2 py-0.5 rounded font-bold text-[10px] ${assinaturaTipo === 'texto' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}
                >
                  Digitar
                </button>
                <button
                  type="button"
                  onClick={() => setAssinaturaTipo('desenho')}
                  className={`px-2 py-0.5 rounded font-bold text-[10px] ${assinaturaTipo === 'desenho' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'}`}
                >
                  Desenhar Touch/Mouse
                </button>
              </div>
            </div>

            {assinaturaTipo === 'texto' ? (
              <div className="space-y-1">
                <label className="font-bold text-slate-600 dark:text-slate-350">Digite sua rubrica de mecânico corporativo para validar</label>
                <input
                  type="text"
                  value={assinaturaTexto}
                  onChange={(e) => setAssinaturaTexto(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-150 dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-lg text-slate-955 dark:text-white placeholder-slate-400 italic"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-450 dark:text-slate-500">Desenhe diretamente no painel demarcado abaixo</span>
                  <button
                    type="button"
                    onClick={limparAssinaturaCanvas}
                    className="text-[10px] font-bold text-rose-500 hover:underline"
                  >
                    Recomeçar desenho
                  </button>
                </div>

                <div className="bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden h-32 relative">
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={128}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-full block cursor-crosshair bg-transparent"
                  />
                </div>
              </div>
            )}

          </div>

        </form>

        {/* Footer controls */}
        <div className="p-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex justify-between items-center shrink-0">
          <span className="text-[10px] text-slate-505 dark:text-slate-450">Operador mecânico registrado: @{usuario?.login}</span>

          <div className="flex gap-2 border-slate-205">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold select-none transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={carregandoGravacao}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-505 text-white font-bold rounded-lg text-xs shadow-md shadow-violet-500/10"
            >
              {carregandoGravacao ? 'Validando...' : 'Encerrar Chamado Técnico'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
