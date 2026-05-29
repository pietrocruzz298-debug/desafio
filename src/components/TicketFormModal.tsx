/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DatabaseService } from '../services/db';
import { Chamado, PrioridadeChamado } from '../types';
import { 
  X, 
  Wrench, 
  Hash, 
  MapPin, 
  Flame, 
  FileText, 
  AlertCircle,
  Paperclip,
  UploadCloud,
  Check
} from 'lucide-react';

interface TicketFormModalProps {
  chamadoIdParaEditar?: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export default function TicketFormModal({ chamadoIdParaEditar, onClose, onRefresh }: TicketFormModalProps) {
  const { usuario, parametros } = useAuth();
  
  const [carregandoInterno, setCarregandoInterno] = useState(false);
  const [erros, setErros] = useState('');
  const [listaSetores, setListaSetores] = useState<string[]>([]);
  
  // Fields state
  const [equipamento, setEquipamento] = useState('');
  const [patrimonio, setPatrimonio] = useState('');
  const [setor, setSetor] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [prioridade, setPrioridade] = useState<PrioridadeChamado>('media');
  const [descricao, setDescricao] = useState('');
  const [sintomasObservados, setSintomasObservados] = useState('');
  
  // Attachments temp state
  const [anexosPre, setAnexosPre] = useState<{ nome: string; base64: string; tamanhoStr: string }[]>([]);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    // Collect sectors dynamically or falling back
    if (parametros?.setoresDisponiveis) {
      setListaSetores(parametros.setoresDisponiveis);
      if (!chamadoIdParaEditar) setSetor(parametros.setoresDisponiveis[0] || '');
    } else {
      setListaSetores(['Estamparia', 'Soldagem', 'Pintura', 'Montagem', 'Usinagem', 'Forjaria', 'Logística']);
      if (!chamadoIdParaEditar) setSetor('Estamparia');
    }

    // Is Edit mode active?
    if (chamadoIdParaEditar) {
      async function loadEdicao() {
        setCarregandoInterno(true);
        try {
          const chamados = await DatabaseService.getChamados();
          const match = chamados.find(c => c.id === chamadoIdParaEditar);
          if (match) {
            setEquipamento(match.equipamento);
            setPatrimonio(match.patrimonio);
            setSetor(match.setor);
            setLocalizacao(match.localizacao);
            setPrioridade(match.prioridade);
            setDescricao(match.descricao);
            setSintomasObservados(match.sintomas_observados || '');
          }
        } catch (e) {
          setErros('Não foi possível carregar a ordem para edição.');
        } finally {
          setCarregandoInterno(false);
        }
      }
      loadEdicao();
    }
  }, [chamadoIdParaEditar, parametros]);

  // File drag-handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processarArquivos = (files: FileList) => {
    Array.from(files).forEach(file => {
      // Limit file size to 2.5MB representing base64 size limits in localStorage
      if (file.size > 2.5 * 1024 * 1024) {
        alert(`Arquivo "${file.name}" excede o limite máximo recomendado de 2.5MB para salvaguarda no banco offline.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result as string) {
          const tamanhoMB = (file.size / (1024 * 1024)).toFixed(2);
          setAnexosPre(prev => [
            ...prev,
            {
              nome: file.name,
              base64: event.target?.result as string,
              tamanhoStr: `${tamanhoMB} MB`
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processarArquivos(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processarArquivos(e.target.files);
    }
  };

  const removerPreAnexo = (index: number) => {
    setAnexosPre(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErros('');

    if (!equipamento.trim() || !patrimonio.trim() || !setor.trim() || !localizacao.trim() || !descricao.trim()) {
      setErros('Por favor, preencha todos os campos obrigatórios identificados.');
      return;
    }

    if (!usuario?.id) return;

    setCarregandoInterno(true);
    try {
      if (chamadoIdParaEditar) {
        // Edit flow
        await DatabaseService.editarChamadoOperador(chamadoIdParaEditar, {
          equipamento,
          patrimonio,
          setor,
          localizacao,
          prioridade,
          descricao,
          sintomas_observados: sintomasObservados,
        }, usuario.id);
        
        // Save new attachments
        for (const file of anexosPre) {
          await DatabaseService.salvarAnexo(chamadoIdParaEditar, file.nome, file.base64, file.tamanhoStr);
        }

      } else {
        // Create Flow
        const novo = await DatabaseService.criarChamado({
          equipamento,
          patrimonio,
          setor,
          localizacao,
          prioridade,
          descricao,
          sintomas_observados: sintomasObservados,
          operador_id: usuario.id
        });

        // Save attachments associated to the new generated ticket ID
        for (const file of anexosPre) {
          await DatabaseService.salvarAnexo(novo.id, file.nome, file.base64, file.tamanhoStr);
        }
      }

      onRefresh();
      onClose();
    } catch (err: any) {
      setErros(err.message || 'Erro durante a gravação das informações.');
    } finally {
      setCarregandoInterno(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
      <div id="ticket_form_modal" className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-600 rounded-xl text-white">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                {chamadoIdParaEditar ? 'Editar Chamado de Manutenção' : 'Abertura de Chamado de Manutenção'}
              </h3>
              <p className="text-[10px] text-slate-500 font-semibold tracking-wide">Preencha os indicadores de linha para encaminhar ao painel</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs scrollbar-thin">
          
          {erros && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-900/50 rounded-lg flex items-start gap-2 text-rose-600 dark:text-rose-450">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{erros}</span>
            </div>
          )}

          {/* Dados Gerais Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-1">
              <label className="font-bold text-slate-600 dark:text-slate-350 flex items-center gap-1">
                Equipamento Mau Funcionamento <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Wrench className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ex: Prensa Hidráulica 500T, Torno CNC, etc."
                  value={equipamento}
                  onChange={(e) => setEquipamento(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-sky-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-600 dark:text-slate-350 flex items-center gap-1">
                Código do Patrimônio <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ex: PAT-89240 ou registro interno"
                  value={patrimonio}
                  onChange={(e) => setPatrimonio(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-sky-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-600 dark:text-slate-350">
                Setor Fabril Responsável <span className="text-rose-500">*</span>
              </label>
              <select
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                required
              >
                {listaSetores.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-600 dark:text-slate-350 flex items-center gap-1">
                Localização Exata na Planta de Linha <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ex: Galpão 3 - Linha B, Anexo 2"
                  value={localizacao}
                  onChange={(e) => setLocalizacao(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-sky-500"
                  required
                />
              </div>
            </div>

          </div>

          {/* Prioridade / Gravidade */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <label className="font-bold text-slate-600 dark:text-slate-350 flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-rose-500" />
              Prioridade / Nível de Urgência Operacional <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {([
                { k: 'baixa', l: 'Baixa', c: 'border-emerald-250 select-none text-emerald-600 hover:bg-emerald-500/5', active: 'bg-emerald-500 text-white hover:bg-emerald-650' },
                { k: 'media', l: 'Média', c: 'border-yellow-250 select-none text-yellow-600 hover:bg-yellow-500/5', active: 'bg-yellow-500 text-slate-950 font-bold hover:bg-yellow-550' },
                { k: 'alta', l: 'Alta', c: 'border-orange-255 select-none text-orange-600 hover:bg-orange-500/5', active: 'bg-orange-500 text-white hover:bg-orange-550' },
                { k: 'critica', l: 'Crítica 🚨', c: 'border-rose-250 select-none text-rose-600 hover:bg-rose-500/5', active: 'bg-rose-500 text-white hover:bg-rose-550' }
              ] as const).map(op => (
                <button
                  key={op.k}
                  type="button"
                  onClick={() => setPrioridade(op.k)}
                  className={`py-2 px-3 border rounded-lg text-xs font-bold transition flex justify-center items-center gap-1 cursor-pointer ${
                    prioridade === op.k ? op.active : `bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-705 ${op.c}`
                  }`}
                >
                  <span>{op.l}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Descrição TextAreas */}
          <div className="space-y-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            
            <div className="space-y-1">
              <label className="font-bold text-slate-600 dark:text-slate-350 flex items-center gap-1">
                <FileText className="h-4 w-4 text-slate-400" />
                Descrição Detalhada do Problema / Evento <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Insira detalhes completos técnicos do comportamento anômalo da máquina. Detalhe se houve intercorrências estruturais ou se afeta a produtividade geral."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-950 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-sky-500"
                required
              ></textarea>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-600 dark:text-slate-350">
                Sintomas Observados / Anomalias Perceptíveis
              </label>
              <textarea
                rows={2}
                placeholder="Exemplo: Vibração extrema, superaquecimento, vazamento de óleo visível, ruído excessivo, faíscas elétricas..."
                value={sintomasObservados}
                onChange={(e) => setSintomasObservados(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-955 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-sky-500"
              ></textarea>
            </div>

          </div>

          {/* Anexos arquivos */}
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <label className="font-bold text-slate-600 dark:text-slate-350 flex items-center gap-1">
              <Paperclip className="h-4 w-4 text-slate-400" />
              Anexar Fotos do Problema ou Manuais Técnicos
            </label>

            {/* Dragg Uploader zone */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition ${
                dragActive 
                  ? 'border-sky-500 bg-sky-502/10 dark:bg-sky-500/5' 
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/30'
              }`}
            >
              <UploadCloud className="h-9 w-9 text-slate-400 mx-auto stroke-1" />
              <p className="mt-2 text-slate-600 dark:text-slate-300 font-semibold text-xs">Arraste e solte seus arquivos ou fotos aqui</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Limite recomendado de até 2.5 MB por arquivo (Formato PNG, JPEG, PDF, etc)</p>
              
              <input
                type="file"
                id="file_input"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept="image/*, application/pdf"
              />
              <label 
                htmlFor="file_input"
                className="mt-3.5 inline-flex items-center px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-bold text-xs cursor-pointer shadow-sm"
              >
                Selecionar Arquivos...
              </label>
            </div>

            {/* File List pre-queued */}
            {anexosPre.length > 0 && (
              <div className="space-y-2 pt-1 transition">
                <p className="text-[10px] font-bold text-slate-450 uppercase flex items-center gap-1">
                  <Check className="h-3.5 w-3.5 text-emerald-500" /> Arquivos prontos para envio ({anexosPre.length}):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {anexosPre.map((f, i) => (
                    <div key={i} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-750 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                        <span className="truncate font-semibold text-slate-750 dark:text-slate-300 max-w-[140px] block">{f.nome}</span>
                        <span className="text-[9px] text-slate-400 shrink-0">({f.tamanhoStr})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerPreAnexo(i)}
                        className="text-slate-400 hover:text-rose-550 p-1 rounded"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </form>

        {/* Action bounds buttons Footer */}
        <div className="p-4 border-t border-slate-150 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex justify-between items-center shrink-0">
          <div className="text-[10px] text-slate-505 dark:text-slate-450 flex items-center gap-1 leading-none">
            <span className="h-1.5 w-1.5 bg-sky-500 rounded-full"></span>
            <span>Registrador ativo: @{usuario?.login}</span>
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold select-none transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={carregandoInterno}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-505 disabled:bg-slate-400 text-white rounded-lg text-xs font-bold shadow-md shadow-sky-500/15"
            >
              {carregandoInterno ? 'Validando...' : chamadoIdParaEditar ? 'Salvar Edição' : 'Cadastrar Chamado'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
