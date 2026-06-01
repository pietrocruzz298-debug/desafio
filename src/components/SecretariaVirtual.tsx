/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { DatabaseService } from '../services/db';
import { Chamado, Usuario, ParametrosSistema } from '../types';
import { 
  Bot, 
  X, 
  Send, 
  MessageSquare, 
  HelpCircle, 
  Sparkles,
  ClipboardList,
  UserCheck,
  Building,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export default function SecretariaVirtual() {
  const { usuario } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [input, setInput] = useState('');
  const [mensagens, setMensagens] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Olá! Sou a **Sofia**, assessora inteligente e secretária virtual do sistema MecanicPro. 

Fui encarregada de organizar, analisar e apresentar relatórios para o senhor. Posso responder qualquer dúvida técnica ou extrair dados imediatos sobre chamados, parâmetros operacionais da fábrica e equipe ativa.

Como posso auxiliá-lo em nosso painel de operações hoje?`,
      timestamp: new Date()
    }
  ]);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Suggestions for rapid query execution
  const tagsSugestoes = [
    { label: '📋 Chamados abertos', prompt: 'Quantos chamados de manutenção estão abertos no momento e quais são?' },
    { label: '⚠️ Risco Crítico', prompt: 'Quais equipamentos estão classificados com prioridade CRÍTICA atualmente?' },
    { label: '⚙️ Regras do SLA', prompt: 'Qual o limite de tempo (SLA) para ordens graves e o checklist é obrigatório?' },
    { label: '👥 Equipe Registrada', prompt: 'Quem são os operadores e mecânicos cadastrados no MecanicPro?' },
  ];

  // Auto scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [mensagens, carregando, aberto]);

  const handleEnviarMsg = async (textoPrompt: string) => {
    if (!textoPrompt.trim() || carregando) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      text: textoPrompt,
      timestamp: new Date()
    };

    setMensagens(prev => [...prev, userMessage]);
    setInput('');
    setCarregando(true);

    try {
      // 1. Gather all system context to pass to node server
      const [chamados, usuarios, parametros] = await Promise.all([
        DatabaseService.getChamados(),
        DatabaseService.getUsuarios(),
        DatabaseService.getParametros()
      ]);

      const systemContext = {
        chamados,
        usuarios,
        parametros,
        usuarioLogado: usuario
      };

      // 2. Format history for API request
      // We pass the last 10 messages for conversational memory
      const history = mensagens
        .filter(m => m.id !== 'welcome')
        .slice(-10)
        .map(m => ({
          role: m.role,
          text: m.text
        }));

      // 3. Request `/api/chat`
      const rawRes = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: textoPrompt,
          history,
          systemContext
        })
      });

      if (!rawRes.ok) {
        throw new Error('Falha de resposta no processamento de linguagem artificial.');
      }

      const resData = await rawRes.json();

      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        text: resData.response || 'Desculpe, não consegui obter uma resposta.',
        timestamp: new Date()
      };

      setMensagens(prev => [...prev, assistantMessage]);

    } catch (err: any) {
      setMensagens(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          role: 'assistant',
          text: `Perdoe-me, mas enfrentei um obstáculo técnico para acessar as informações neste instante: **${err.message || 'Sem conexão com a IA'}**. 

Por favor, verifique se seu servidor back-end está ativo ou tente novamente em poucos segundos. estarei aguardando!`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setCarregando(false);
    }
  };

  // Helper function to render a simplified elegant markdown representation
  const renderizarTextoStylizado = (texto: string) => {
    const lines = texto.split('\n');
    return lines.map((line, idx) => {
      // Check if line represents a list bullet
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const cleanContent = formatarNegritos(line.trim().substring(2));
        return (
          <li key={idx} className="ml-4 list-disc text-xs leading-relaxed text-slate-800 dark:text-slate-350 my-1 font-sans">
            {cleanContent}
          </li>
        );
      }

      // Check if line is blockquote
      if (line.trim().startsWith('> ')) {
        return (
          <div key={idx} className="border-l-4 border-sky-502 bg-slate-50 dark:bg-slate-805/40 p-2.5 my-2 text-xs rounded-r-lg italic text-slate-600 dark:text-slate-400">
            {formatarNegritos(line.trim().substring(2))}
          </div>
        );
      }

      // Check if line is header
      if (line.trim().startsWith('###')) {
        return (
          <h5 key={idx} className="text-xs font-extrabold uppercase text-slate-900 dark:text-white mt-4 mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-sky-500 inline shrink-0" />
            {formatarNegritos(line.trim().substring(3))}
          </h5>
        );
      }
      if (line.trim().startsWith('##') || line.trim().startsWith('#')) {
        return (
          <h4 key={idx} className="text-sm font-extrabold text-slate-900 dark:text-white mt-4 mb-2 tracking-tight border-b border-slate-100 dark:border-slate-800 pb-1">
            {formatarNegritos(line.trim().replace(/^#+\s*/, ''))}
          </h4>
        );
      }

      // Normal text with potential bolding
      return (
        <p key={idx} className="text-xs leading-relaxed text-slate-800 dark:text-slate-300 font-sans mb-2 min-h-[0.5rem] break-words whitespace-pre-wrap">
          {formatarNegritos(line)}
        </p>
      );
    });
  };

  // Replace **bold** with actual React <strong> items
  const formatarNegritos = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-extrabold text-slate-950 dark:text-white bg-sky-500/5 dark:bg-sky-500/10 px-0.5 rounded">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <>
      {/* FLOATING INITIATING BUBBLE BUTTON */}
      <button
        type="button"
        id="toggle_virtual_secretary_button"
        onClick={() => setAberto(!aberto)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 bg-gradient-to-tr from-sky-600 to-sky-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all outline-none border border-white/20 select-none group cursor-pointer"
        title="Assistente Sofia - Secretaria MecanicPro"
      >
        {aberto ? (
          <X className="h-6 w-6 transform rotate-90 transition duration-300" />
        ) : (
          <div className="relative">
            <Bot className="h-6 w-6 group-hover:animate-bounce" />
            {/* Online glow badge */}
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-slate-50 dark:border-slate-950 animate-pulse"></span>
          </div>
        )}
      </button>

      {/* CORE CHAT DIALOG PANEL COLLAPSE */}
      {aberto && (
        <div 
          id="virtual_secretary_dialog_panel"
          className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] h-[520px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-slide-in"
        >
          {/* Header Panel */}
          <div className="p-4 bg-gradient-to-r from-sky-700 via-sky-600 to-sky-550 text-white flex justify-between items-center shrink-0 border-b border-sky-700 select-none">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                  <Bot className="h-5 w-5 text-sky-100" />
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-emerald-400 rounded-full border-2 border-sky-600"></span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight">Sofia</span>
                  <span className="text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Secretária</span>
                </div>
                <span className="text-[10px] text-sky-150 font-semibold block leading-none">Assessoria em Manutenção</span>
              </div>
            </div>

            <button
              onClick={() => setAberto(false)}
              className="p-1 px-2.5 hover:bg-white/10 rounded-lg text-white/85 hover:text-white transition cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Messages History Area Container */}
          <div 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/55 dark:bg-slate-950/25 scrollbar-thin"
          >
            {mensagens.map((msg) => {
              const eSecretaria = msg.role === 'assistant';
              return (
                <div 
                  key={msg.id}
                  className={`flex ${eSecretaria ? 'justify-start' : 'justify-end'} gap-2.5 items-start`}
                >
                  {/* Assistant custom circular emblem */}
                  {eSecretaria && (
                    <div className="h-7 w-7 rounded-lg bg-sky-100 dark:bg-sky-950/40 text-sky-655 border border-sky-200/50 dark:border-sky-850 flex items-center justify-center shrink-0 text-xs">
                      SF
                    </div>
                  )}

                  <div className={`max-w-[80%] rounded-2xl p-3.5 shadow-sm text-xs border ${
                    eSecretaria 
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-805 text-slate-800 dark:text-slate-200 rounded-tl-none font-sans'
                      : 'bg-gradient-to-tr from-sky-600 to-sky-505 border-sky-650 text-white rounded-tr-none font-sans font-medium'
                  }`}>
                    {renderizarTextoStylizado(msg.text)}
                    
                    <span className={`block text-[9px] text-right mt-1.5 font-mono select-none ${
                      eSecretaria ? 'text-slate-400' : 'text-sky-200'
                    }`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Simulated thinking indicator typing logs */}
            {carregando && (
              <div className="flex justify-start gap-2.5 items-start">
                <div className="h-7 w-7 rounded-lg bg-sky-100 dark:bg-sky-950/40 text-sky-655 border border-sky-200/50 dark:border-sky-850 flex items-center justify-center shrink-0">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600 dark:text-sky-400" />
                </div>

                <div className="rounded-2xl p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 text-slate-500 font-medium rounded-tl-none text-xs flex items-center gap-2 select-none active:scale-100 italic">
                  <span>Sofia está levantando o relatório técnico...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick-Prompt Suggestions */}
          {mensagens.length <= 2 && !carregando && (
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900 select-none shrink-0">
              <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase block mb-1">Perguntas Rápidas</span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {tagsSugestoes.map((tag, i) => (
                  <button
                    key={i}
                    onClick={() => handleEnviarMsg(tag.prompt)}
                    className="p-1 px-2.5 text-[10px] bg-slate-100 hover:bg-sky-50 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 hover:border-sky-305 text-slate-700 dark:text-slate-300 hover:text-sky-600 rounded-lg text-left transition duration-200 cursor-pointer shadow-sm font-semibold max-w-full truncate"
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Input Message */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEnviarMsg(input);
            }}
            className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2 shrink-0 select-none"
          >
            <input
              type="text"
              placeholder="Digite sua dúvida ou relatório para a secretaria..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={carregando}
              className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-805 border border-slate-200 dark:border-slate-755 rounded-xl text-slate-950 dark:text-white focus:outline-none focus:ring-1.5 focus:ring-sky-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={carregando || !input.trim()}
              className="p-2.5 bg-sky-600 hover:bg-sky-505 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 dark:disabled:text-slate-650 rounded-xl transition duration-200 outline-none shrink-0 cursor-pointer flex items-center justify-center focus:ring-2 focus:ring-sky-500/20"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
