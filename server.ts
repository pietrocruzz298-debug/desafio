/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Ensure Gemini is initialized server-side using 'aistudio-build' telemetry user agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Chat API endpoint supporting Groq and Gemini
  app.post('/api/chat', async (req: any, res: any) => {
    try {
      const { prompt, history, systemContext } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'O prompt de mensagem é obrigatório.' });
      }

      // Compile current live operational context format
      let systemContextString = '';
      if (systemContext) {
        const { chamados, usuarios, parametros, usuarioLogado } = systemContext;

        systemContextString = `
=== CONTEXTO EM TEMPO REAL DO SISTEMA MECANICPRO ===
Usuário Ativo Consultando:
- Nome: ${usuarioLogado?.nome || 'N/A'}
- Perfil de Acesso: ${usuarioLogado?.perfil || 'N/A'} (Login: @${usuarioLogado?.login || 'N/A'})

Configurações e Parâmetros Ativos:
- Período Limite SLA para Chamados Críticos: ${parametros?.tempoMaximoCriticoHoras || 4} horas
- Execução Obrigatoriedade de Checklist LOTO: ${parametros?.checklistObrigatorio ? 'Incondicional' : 'Facultativo'}
- Assinatura Física por Desenho (Canvas) Ativa: ${parametros?.permitirAssinaturaDigital ? 'Sim, Exigido no Encerramento' : 'Não habilitado'}
- Lista de Setores Operacionais: ${(parametros?.setoresDisponiveis || []).join(', ')}
- Lista de Oficinas Técnicas: ${(parametros?.oficinasDisponiveis || []).join(', ')}

Funcionários e Perfis Cadastrados (${(usuarios || []).length}):
${(usuarios || []).map((u: any) => `- Co-membro: $${u.nome} (Acesso: ${u.perfil}, Login: @${u.login})`).join('\n')}

Ordens de Trabalho e Chamados Registrados (${(chamados || []).length}):
${(chamados || []).slice(0, 45).map((c: any) => {
  return `- Ficha #${c.numero_chamado || 'Sem Código'} [Maquinário: ${c.equipamento} | Patrimônio: ${c.patrimonio || 'N/A'}]
  Localização Física: ${c.localizacao} (Setor: ${c.setor})
  Alinhamento Gravidade: ${c.prioridade.toUpperCase()} | Status de Execução: ${c.status}
  Autor da Abertura: ${c.operador_nome}
  Mecânico em Atendimento: ${c.mecanico_nome || 'Nenhum Mecânico Alocado (Disponível)'}
  Detalhamento da Falha: ${c.descricao}
  Data Abertura do Chamado: ${c.data_abertura ? new Date(c.data_abertura).toLocaleString('pt-BR') : 'N/A'}`;
}).join('\n\n')}
==================================================
`;
      }

      // Defining Sophia's detailed secretarial prompt characteristics
      const systemInstruction = `
Você é a Sofia, secretária virtual executiva de alto nível e assistente técnica inteligente oficial da plataforma MecanicPro.
Seu papel de secretária é responder a dúvidas dos usuários com clareza máxima, extrema polidez, precisão rigorosa e organização impecável.

Diretrizes indispensáveis para a sua persona de Secretária:
1. Comunicação Simpática e Polida: Inicie as conversas informando que está à disposição para ajudar. Use frases típicas de secretária corporativa dedicada: "Olá! Seja bem-vindo ao suporte executivo da MecanicPro.", "Como posso ajudar no seu dia de trabalho hoje?", "Pois não, estou levantando esta informação para o senhor/senhora.", "Algo mais que eu possa fazer para otimizar suas tarefas?".
2. Conexão Completa de Dados: Você tem acesso aos dados operacionais mostrados no contexto em tempo real do sistema. Utilize-os para dar respostas concretas e imediatas para perguntas como:
   - "Quais são as máquinas com problemas agora?"
   - "Quantos chamados de risco crítico temos pendentes?"
   - "Existe alguma prensa hidráulica com vazamento?"
   - "Qual o limite de tempo (SLA) para resolver chamados urgentes?"
   - "Quem são as pessoas registradas na empresa?"
3. Organização e Estética Visual: Secretárias eficientes entregam relatórios limpos. Sempre estruture suas respostas usando tópicos com marcadores claros, listas ordenadas, tabelas em Markdown e negritos estratégicos para que o operador possa ler as informações com rapidez na fábrica agitada.
4. Explicação do Sistema: Se perguntada sobre o site ou a plataforma, descreva o MecanicPro de forma orgulhosa e profissional:
   - O MecanicPro é um sofisticado software focado em otimizar a confiabilidade e disponibilidade mecânica, elétrica e predial nas instalações.
   - Fornece recursos como abertura intuitiva de reparos rápidos à beira da máquina, relatórios gerenciais e acompanhamentos dinâmicos de metas operacionais (SLA/MTTR), checklists de integridade física e travamento com bloqueio elétrico de chaves LOTO (Lockout/Tagout), e laudos técnicos de fechamento colhendo rubricas do gestor por assinatura eletrônica manual.
5. Foco e Moderação: Caso o usuário realize perguntas aleatórias ou fora do universo de manutenção industrial e do MecanicPro, responda com sua delicadeza diplomática natural de secretária, direcionando o assunto de volta às rotinas da empresa, mas dando uma breve ajuda se for conveniente.
`.trim();

      // Setup call logic
      const hasGroqKey = !!process.env.GROQ_API_KEY;

      if (hasGroqKey) {
        try {
          console.log('[MecanicPro Server ID] Routing message using Groq Llama-3.3 Cloud Service...');
          const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'system', content: `Contextualizador operacional ativo:\n${systemContextString}` },
                ...(history || []).map((h: any) => ({
                  role: h.role === 'user' ? 'user' : 'assistant',
                  content: h.text
                })),
                { role: 'user', content: prompt }
              ],
              temperature: 0.6,
              max_tokens: 1536
            })
          });

          if (groqResponse.ok) {
            const groqData = await groqResponse.json();
            const reply = groqData.choices?.[0]?.message?.content;
            if (reply) {
              return res.json({ response: reply, provider: 'Groq (Llama)' });
            }
          }
          console.warn('[MecanicPro AI Routing] Groq API returned failure response. Cascading to Gemini API automatically.');
        } catch (groqErr) {
          console.error('[MecanicPro AI Routing Error] Groq call integration exception:', groqErr);
        }
      }

      // Defaulting to powerful server-side Gemini Model Client
      console.log('[MecanicPro Server ID] Routing message using Gemini API Service...');
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Nenhuma credencial de API (Gemini/Groq) está configurada no ambiente.' });
      }

      const contents = [];
      if (history && history.length > 0) {
        for (const turn of history) {
          contents.push({
            role: turn.role === 'user' ? 'user' : 'model',
            parts: [{ text: turn.text }]
          });
        }
      }

      // Frame final request
      contents.push({
        role: 'user',
        parts: [{ text: `${systemContextString}\n\nPergunta do usuário: ${prompt}` }]
      });

      const geminiResult = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.6,
        }
      });

      return res.json({ response: geminiResult.text || 'Sem resposta disponível.', provider: 'Gemini' });

    } catch (routeErr: any) {
      console.error('[MecanicPro Server API Exception] Error executing chat generation:', routeErr);
      return res.status(500).json({ error: routeErr.message || 'Erro interno no processador da assistente virtual.' });
    }
  });

  // Handle serving Vite Assets & Routing Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MecanicPro Server] Full-stack engine listening on http://localhost:${PORT}`);
  });
}

startServer();
