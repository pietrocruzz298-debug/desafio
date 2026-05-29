/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { 
  Usuario, 
  Chamado, 
  Atendimento, 
  PecaUtilizada, 
  Anexo, 
  AuditLog, 
  Notificacao, 
  ParametrosSistema,
  PerfilUsuario,
  PrioridadeChamado,
  StatusChamado
} from '../types';

// ==========================================
// OFF-LINE LOCAL DATABASE SEED DATA
// ==========================================

const INDICE_USUARIOS_OFFLINE = 'mecanica_usuarios';
const INDICE_CHAMADOS_OFFLINE = 'mecanica_chamados';
const INDICE_ATENDIMENTOS_OFFLINE = 'mecanica_atendimentos';
const INDICE_PECAS_OFFLINE = 'mecanica_pecas';
const INDICE_ANEXOS_OFFLINE = 'mecanica_anexos';
const INDICE_AUDIT_OFFLINE = 'mecanica_audit';
const INDICE_NOTIFICACAO_OFFLINE = 'mecanica_notificacoes';
const INDICE_PARAMETROS_OFFLINE = 'mecanica_parametros';

const USUARIOS_PADRAO: Usuario[] = [
  { id: 'usr-1', nome: 'Administrador do Sistema', login: 'admin', senha: 'admin123', perfil: 'admin', created_at: new Date('2026-05-10T10:00:00Z').toISOString() },
  { id: 'usr-2', nome: 'Operador de Linha Sênior', login: 'operador', senha: 'operador123', perfil: 'operador', created_at: new Date('2026-05-11T09:00:00Z').toISOString() },
  { id: 'usr-3', nome: 'Mecânico de Manutenção Sênior', login: 'mecanico', senha: 'mecanico123', perfil: 'mecanico', created_at: new Date('2026-05-12T08:00:00Z').toISOString() },
  { id: 'usr-4', nome: 'Carlos Henrique (Mecânica Hidráulica)', login: 'carlos', senha: 'mecanico123', perfil: 'mecanico', created_at: new Date('2026-05-13T07:30:00Z').toISOString() },
  { id: 'usr-5', nome: 'Juliana Silva (Operadora Linha B)', login: 'juliana', senha: 'operador123', perfil: 'operador', created_at: new Date('2026-05-14T08:15:00Z').toISOString() }
];

const PARAMETROS_PADRAO: ParametrosSistema = {
  tempoMaximoCriticoHoras: 4,
  permitirAssinaturaDigital: true,
  checklistObrigatorio: true,
  setoresDisponiveis: ['Estamparia', 'Soldagem', 'Pintura', 'Montagem', 'Usinagem', 'Forjaria', 'Logística'],
  oficinasDisponiveis: ['Oficina Central', 'Motos e Hidráulica', 'Elétrica-Mecânica', 'Manutenção Preventiva']
};

const CHAMADOS_PADRAO: Chamado[] = [
  {
    id: 'ch-101',
    numero_chamado: 'CH-2026-0001',
    equipamento: 'Prensa Hidráulica 500T',
    patrimonio: 'PAT-89240',
    setor: 'Estamparia',
    localizacao: 'Galpão 3 - Linha B',
    prioridade: 'critica',
    descricao: 'Vazamento excessivo de óleo pelas vedações do prensa-chapa principal e perda rápida de pressão secundária durante ciclos de conformação profunda.',
    sintomas_observados: 'Nível de óleo hidráulico abaixo do mínimo de segurança, ruídos de cavitação na bomba dupla, ciclo de descida lento.',
    status: 'aberto',
    operador_id: 'usr-2',
    operador_nome: 'Operador de Linha Sênior',
    data_abertura: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(), // 3.5h ago
    created_at: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString()
  },
  {
    id: 'ch-102',
    numero_chamado: 'CH-2026-0002',
    equipamento: 'Torno CNC Haas ST-20',
    patrimonio: 'PAT-41103',
    setor: 'Usinagem',
    localizacao: 'Anexo 1 - Célula de Comando 4',
    prioridade: 'media',
    descricao: 'Ruído metálico agudo constante e alarmes intermitentes de sobrecorrente e superaquecimento no servo-motor do fuso principal após períodos de corte pesado.',
    sintomas_observados: 'Superaquecimento localizado no cabeçote móvel, vibração excessiva de desalinhamento na peça final usinada.',
    status: 'em_manutencao',
    operador_id: 'usr-5',
    operador_nome: 'Juliana Silva (Operadora Linha B)',
    mecanico_id: 'usr-3',
    mecanico_nome: 'Mecânico de Manutenção Sênior',
    data_abertura: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), // 12h ago
    data_inicio: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  },
  {
    id: 'ch-103',
    numero_chamado: 'CH-2026-0003',
    equipamento: 'Robô de Solda Fanuc ArcMate 120i',
    patrimonio: 'PAT-70331',
    setor: 'Soldagem',
    localizacao: 'Célula de Solda Automática 3',
    prioridade: 'alta',
    descricao: 'Falha recorrente na alimentação do arame de soldagem mig e quebra sistemática do bico de contato de cobre na extremidade do braço automatizado.',
    sintomas_observados: 'Arame engatando nos roletes do tracionador de alimentação, instabilidade térmica extrema no arco visual de solda.',
    status: 'aguardando_peca',
    operador_id: 'usr-2',
    operador_nome: 'Operador de Linha Sênior',
    mecanico_id: 'usr-4',
    mecanico_nome: 'Carlos Henrique (Mecânica Hidráulica)',
    data_abertura: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // 1 day ago
    data_inicio: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'ch-104',
    numero_chamado: 'CH-2026-0004',
    equipamento: 'Esteira Transportadora de Cavacos',
    patrimonio: 'PAT-15024',
    setor: 'Usinagem',
    localizacao: 'Fosso de Coleta de Resíduos',
    prioridade: 'baixa',
    descricao: 'Correia de transmissão patinando nos eixos finais e desalinhamento suave dos elos de arrasto da corrente de descarga metálica.',
    sintomas_observados: 'Acúmulo de sujeira fina nas engrenagens tratoras, ligeira folga na calha guia direita.',
    status: 'finalizado',
    operador_id: 'usr-5',
    operador_nome: 'Juliana Silva (Operadora Linha B)',
    mecanico_id: 'usr-3',
    mecanico_nome: 'Mecânico de Manutenção Sênior',
    data_abertura: new Date(Date.now() - 48 * 3600 * 1000).toISOString(), // 2 days ago
    data_inicio: new Date(Date.now() - 45 * 3600 * 1000).toISOString(),
    data_encerramento: new Date(Date.now() - 43 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  },
  {
    id: 'ch-105',
    numero_chamado: 'CH-2026-0005',
    equipamento: 'Compressores de Ar de Parafuso Atlas Copco',
    patrimonio: 'PAT-90025',
    setor: 'Logística',
    localizacao: 'Casa de Máquinas Central',
    prioridade: 'alta',
    descricao: 'Temperatura de descarga de ar comprimido próxima do limite crítico de desligamento por sobreaquecimento da unidade compressora.',
    sintomas_observados: 'Indicador térmico marcando 107°C intermitente, obstrução visual parcial por poeira nas aletas dos trocadores de calor refrigerados a ar.',
    status: 'em_analise',
    operador_id: 'usr-2',
    operador_nome: 'Operador de Linha Sênior',
    mecanico_id: 'usr-4',
    mecanico_nome: 'Carlos Henrique (Mecânica Hidráulica)',
    data_abertura: new Date(Date.now() - 6 * 3600 * 1000).toISOString(), // 6h ago
    data_inicio: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString()
  },
  {
    id: 'ch-106',
    numero_chamado: 'CH-2026-0006',
    equipamento: 'Ponte Rolante de Carga 15T',
    patrimonio: 'PAT-33827',
    setor: 'Forjaria',
    localizacao: 'Vão de Lingotamento - Colunas 14 a 18',
    prioridade: 'critica',
    descricao: 'Triscos e solavancos bruscos na frenagem magnética do carro de translação longitudinal e folga notável no cabo de aço de elevação principal do tambor.',
    sintomas_observados: 'Desgaste mecânico irregular nos frisos de rodagem das rodas de aço, ruídos de atrito seco nas engrenagens da caixa redutora.',
    status: 'finalizado',
    operador_id: 'usr-2',
    operador_nome: 'Operador de Linha Sênior',
    mecanico_id: 'usr-3',
    mecanico_nome: 'Mecânico de Manutenção Sênior',
    data_abertura: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), // 5 days ago
    data_inicio: new Date(Date.now() - 5 * 24 * 3600 * 1000 + 1 * 3600 * 1000).toISOString(),
    data_encerramento: new Date(Date.now() - 5 * 24 * 3600 * 1000 + 4.5 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
  }
];

const ATENDIMENTOS_PADRAO: Atendimento[] = [
  {
    id: 'at-104',
    chamado_id: 'ch-104',
    diagnostico: 'Rolamentos com acúmulo severo de cavaco e folgas na chaveta de acoplamento do redutor principal da esteira.',
    causa_raiz: 'Falta de lubrificação programada no plano quinzenal e ausência de vedações de cobertura protetora no mancal trator.',
    solucao: 'Realizada limpeza profunda de todos os eixos, substituição de dois rolamentos blindados do mancal, aperto estrutural geral e instalação de uma chapa deflectora para desviar cavacos e respingos.',
    horas_trabalhadas: 2.0,
    observacoes: 'Engrenagens principais ainda possuem cerca de 85% de vida útil útil. Recomendo ajuste no plano preventivo.',
    checklist_conclusao: [
      { id: '1', descricao: 'Isolamento de energia (LOTO) efetuado', checked: true },
      { id: '2', descricao: 'Limpeza e desobstrução da área', checked: true },
      { id: '3', descricao: 'Testes funcionais sem carga', checked: true },
      { id: '4', descricao: 'Validação operacional em carga de trabalho', checked: true }
    ],
    assinatura_digital: 'Mecânico de Manutenção Sênior - Assinado Digitalmente',
    created_at: new Date(Date.now() - 43 * 3600 * 1000).toISOString()
  },
  {
    id: 'at-106',
    chamado_id: 'ch-106',
    diagnostico: 'Desgaste por fricção excessiva nas sapatas de freio eletromagnético (freno KEB) e fadiga por uso severo nas ranhuras do carretel do cabo de aço.',
    causa_raiz: 'Excesso de ciclos de frenagem extrema na movimentação de lingotes incandescentes pesados acima da média projetada.',
    solucao: 'Desmontagem das pinças eletromagnéticas, troca total das pastilhas de fricção, usinagem leve dos tambores de frenagem e tensionamento assistido do cabo de aço principal com lubrificação por deposição.',
    horas_trabalhadas: 3.5,
    observacoes: 'A ponte foi testada com carga monitorada de 10T e 15T e não apresentou escorregamento axial. Liberada com segurança.',
    checklist_conclusao: [
      { id: '1', descricao: 'Isolamento de energia (LOTO) efetuado', checked: true },
      { id: '2', descricao: 'Limpeza e desobstrução da área', checked: true },
      { id: '3', descricao: 'Testes funcionais sem carga', checked: true },
      { id: '4', descricao: 'Validação operacional em carga de trabalho', checked: true }
    ],
    assinatura_digital: 'José Roberto - Mecânico de Pontes',
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000 + 4 * 3600 * 1000).toISOString()
  }
];

const PECAS_PADRAO: PecaUtilizada[] = [
  { id: 'pc-1', chamado_id: 'ch-104', atendimento_id: 'at-104', nome_peca: 'Rolamento SKF 6205-2DSH', quantidade: 2 },
  { id: 'pc-2', chamado_id: 'ch-104', atendimento_id: 'at-104', nome_peca: 'Chaveta retangular 8x7x20mm', quantidade: 1 },
  { id: 'pc-3', chamado_id: 'ch-106', atendimento_id: 'at-106', nome_peca: 'Pastilha de freio KEB 140W', quantidade: 4 },
  { id: 'pc-4', chamado_id: 'ch-106', atendimento_id: 'at-106', nome_peca: 'Grais Lubrificante Industrial NLGI 2 (Unidades 1kg)', quantidade: 2 }
];

const LOGS_PADRAO: AuditLog[] = [
  {
    id: 'log-1',
    chamado_id: 'ch-106',
    numero_chamado: 'CH-2026-0006',
    usuario_id: 'usr-2',
    usuario_nome: 'Operador de Linha Sênior',
    acao: 'Criar chamado',
    data_alteracao: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    detalhes: 'Abertura do chamado para ponte rolante PAT-33827 devido a falha nos freios.'
  },
  {
    id: 'log-2',
    chamado_id: 'ch-106',
    numero_chamado: 'CH-2026-0006',
    usuario_id: 'usr-3',
    usuario_nome: 'Mecânico de Manutenção Sênior',
    acao: 'Assumir chamado',
    data_alteracao: new Date(Date.now() - 5 * 24 * 3600 * 1000 + 1 * 3600 * 1000).toISOString(),
    detalhes: 'O chamado foi assumido pelo mecânico responsável.'
  },
  {
    id: 'log-3',
    chamado_id: 'ch-106',
    numero_chamado: 'CH-2026-0006',
    usuario_id: 'usr-3',
    usuario_nome: 'Mecânico de Manutenção Sênior',
    acao: 'Preencher atendimento',
    data_alteracao: new Date(Date.now() - 5 * 24 * 3600 * 1000 + 4 * 3600 * 1000).toISOString(),
    detalhes: 'Diagnóstico e peças registradas. Pastilhas de freio substituídas.'
  },
  {
    id: 'log-4',
    chamado_id: 'ch-106',
    numero_chamado: 'CH-2026-0006',
    usuario_id: 'usr-3',
    usuario_nome: 'Mecânico de Manutenção Sênior',
    acao: 'Atualizar status',
    data_alteracao: new Date(Date.now() - 5 * 24 * 3600 * 1000 + 4.5 * 3600 * 1000).toISOString(),
    detalhes: "Status alterado de 'Em manutenção' para 'Finalizado'."
  }
];

const NOTIFICACOES_PADRAO: Notificacao[] = [
  {
    id: 'not-1',
    chamado_id: 'ch-101',
    titulo: '⚠️ Novo Chamado Crítico Criado',
    mensagem: 'Prensa Hidráulica 500T (PAT-89240) na Estamparia precisa de atenção imediata: "Vazamento de óleo e perda de prensa".',
    lida: false,
    tipo: 'chamado_critico',
    created_at: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString()
  },
  {
    id: 'not-2',
    chamado_id: 'ch-102',
    titulo: '🛠️ Chamado Assumido por Mecânico',
    mensagem: 'Mecânico de Manutenção Sênior assumiu o atendimento do Torno CNC Haas (PAT-41103) na Usinagem.',
    lida: true,
    tipo: 'chamado_assumido',
    created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
  }
];

// Helper to initialize local storage if empty
function inicializarBancoOffline() {
  if (!localStorage.getItem(INDICE_USUARIOS_OFFLINE)) {
    localStorage.setItem(INDICE_USUARIOS_OFFLINE, JSON.stringify(USUARIOS_PADRAO));
  }
  if (!localStorage.getItem(INDICE_CHAMADOS_OFFLINE)) {
    localStorage.setItem(INDICE_CHAMADOS_OFFLINE, JSON.stringify(CHAMADOS_PADRAO));
  }
  if (!localStorage.getItem(INDICE_ATENDIMENTOS_OFFLINE)) {
    localStorage.setItem(INDICE_ATENDIMENTOS_OFFLINE, JSON.stringify(ATENDIMENTOS_PADRAO));
  }
  if (!localStorage.getItem(INDICE_PECAS_OFFLINE)) {
    localStorage.setItem(INDICE_PECAS_OFFLINE, JSON.stringify(PECAS_PADRAO));
  }
  if (!localStorage.getItem(INDICE_ANEXOS_OFFLINE)) {
    localStorage.setItem(INDICE_ANEXOS_OFFLINE, JSON.stringify([]));
  }
  if (!localStorage.getItem(INDICE_AUDIT_OFFLINE)) {
    localStorage.setItem(INDICE_AUDIT_OFFLINE, JSON.stringify(LOGS_PADRAO));
  }
  if (!localStorage.getItem(INDICE_NOTIFICACAO_OFFLINE)) {
    localStorage.setItem(INDICE_NOTIFICACAO_OFFLINE, JSON.stringify(NOTIFICACOES_PADRAO));
  }
  if (!localStorage.getItem(INDICE_PARAMETROS_OFFLINE)) {
    localStorage.setItem(INDICE_PARAMETROS_OFFLINE, JSON.stringify(PARAMETROS_PADRAO));
  }
}

inicializarBancoOffline();

// Realtime listeners subscription lists for offline mode pub-sub
type NotificacaoCallback = (notificacao: Notificacao) => void;
const notificacaoListeners: Set<NotificacaoCallback> = new Set();

export function subscreverNotificacoesLocais(callback: NotificacaoCallback) {
  notificacaoListeners.add(callback);
  return () => {
    notificacaoListeners.delete(callback);
  };
}

function dispararNotificacaoLocal(notificacao: Notificacao) {
  notificacaoListeners.forEach(listener => {
    try {
      listener(notificacao);
    } catch (e) {
      console.error('Erro ao processar popup de notificação real-time:', e);
    }
  });
}


// ==========================================
// DATABASE ENGINE ROUTER (SUPABASE vs OFFLINE)
// ==========================================

export const DatabaseService = {

  // ==========================================
  // USUÁRIOS
  // ==========================================
  
  async getUsuarios(): Promise<Usuario[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .order('nome', { ascending: true });
        
        if (error) throw error;
        return data as Usuario[];
      } catch (e) {
        console.error('Erro Supabase, caindo para local:', e);
      }
    }
    
    return JSON.parse(localStorage.getItem(INDICE_USUARIOS_OFFLINE) || '[]');
  },

  async criarUsuario(usuario: Omit<Usuario, 'id' | 'created_at'>): Promise<Usuario> {
    const novoUsuario: Usuario = {
      ...usuario,
      id: isSupabaseConfigured ? undefined as any : 'usr-' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .insert([usuario])
          .select();
        
        if (error) throw error;
        return data[0] as Usuario;
      } catch (e) {
        console.error('Erro Supabase criarUsuario, usando local:', e);
      }
    }

    const lista = await this.getUsuarios();
    lista.push(novoUsuario);
    localStorage.setItem(INDICE_USUARIOS_OFFLINE, JSON.stringify(lista));
    return novoUsuario;
  },

  async excluirUsuario(id: string, operadorAtualId: string): Promise<boolean> {
    if (id === operadorAtualId) {
      throw new Error('Não é possível excluir o usuário que está atualmente logado.');
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('usuarios')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return true;
      } catch (e) {
        console.error('Erro Supabase excluirUsuario, usando local:', e);
      }
    }

    const lista = await this.getUsuarios();
    const novaLista = lista.filter(u => u.id !== id);
    localStorage.setItem(INDICE_USUARIOS_OFFLINE, JSON.stringify(novaLista));
    return true;
  },

  // ==========================================
  // CHAMADOS
  // ==========================================

  async getChamados(): Promise<Chamado[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('chamados')
          .select(`
            *,
            operador:usuarios!operador_id(nome),
            mecanico:usuarios!mecanico_id(nome)
          `)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Map join names back for convenience
        return (data || []).map(ch => ({
          ...ch,
          operador_nome: ch.operador?.nome || 'Operador',
          mecanico_nome: ch.mecanico?.nome || 'Não atribuído'
        })) as Chamado[];
      } catch (e) {
        console.error('Erro Supabase getChamados:', e);
      }
    }

    // Offline logic with map names joins
    const chamados: Chamado[] = JSON.parse(localStorage.getItem(INDICE_CHAMADOS_OFFLINE) || '[]');
    const usuarios = await this.getUsuarios();
    
    return chamados.map(ch => {
      const op = usuarios.find(u => u.id === ch.operador_id);
      const mec = usuarios.find(u => u.id === ch.mecanico_id);
      return {
        ...ch,
        operador_nome: op ? op.nome : 'Op. Offline',
        mecanico_nome: mec ? mec.nome : 'Não atribuído'
      };
    }).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async criarChamado(chamado: Omit<Chamado, 'id' | 'numero_chamado' | 'status' | 'created_at' | 'data_abertura'>): Promise<Chamado> {
    const chamados = await this.getChamados();
    
    // Gerar número sequencial amigável do chamado
    const anoAtual = new Date().getFullYear();
    const count = chamados.filter(c => c.numero_chamado.includes(`CH-${anoAtual}`)).length + 1;
    const numero_chamado = `CH-${anoAtual}-${count.toString().padStart(4, '0')}`;

    const novoChamado: Chamado = {
      ...chamado,
      id: isSupabaseConfigured ? undefined as any : 'ch-' + Math.random().toString(36).substr(2, 9),
      numero_chamado,
      status: 'aberto',
      data_abertura: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const dbPayload = {
          numero_chamado,
          equipamento: chamado.equipamento,
          patrimonio: chamado.patrimonio,
          setor: chamado.setor,
          localizacao: chamado.localizacao,
          prioridade: chamado.prioridade,
          descricao: chamado.descricao,
          sintomas_observados: chamado.sintomas_observados,
          status: 'aberto',
          operador_id: chamado.operador_id,
          data_abertura: novoChamado.data_abertura
        };

        const { data, error } = await supabase
          .from('chamados')
          .insert([dbPayload])
          .select();
        
        if (error) throw error;
        
        const returnVal = data[0];
        
        // Criar log de auditoria automático
        await this.registrarAuditLog(
          returnVal.id,
          numero_chamado,
          chamado.operador_id,
          'Criar chamado',
          `Novo chamado criado por operador. Equipamento: ${chamado.equipamento}, Prioridade: ${chamado.prioridade.toUpperCase()}`
        );

        // Criar Notificação correspondente
        await this.criarNotificacao(
          returnVal.id,
          `🛠️ Novo Chamado Criado (#${numero_chamado})`,
          `O equipamento ${chamado.equipamento} (${chamado.patrimonio}) no setor ${chamado.setor} foi registrado com prioridade ${chamado.prioridade.toUpperCase()}.`,
          chamado.prioridade === 'critica' ? 'chamado_critico' : 'novo_chamado'
        );

        return returnVal;
      } catch (e) {
        console.error('Erro Supabase criarChamado:', e);
      }
    }

    // Gravação Local
    const lista = JSON.parse(localStorage.getItem(INDICE_CHAMADOS_OFFLINE) || '[]');
    lista.push(novoChamado);
    localStorage.setItem(INDICE_CHAMADOS_OFFLINE, JSON.stringify(lista));

    // Audit logs local
    await this.registrarAuditLog(
      novoChamado.id,
      numero_chamado,
      chamado.operador_id,
      'Criar chamado',
      `Novo chamado criado por operador. Equipamento: ${chamado.equipamento}, Prioridade: ${chamado.prioridade.toUpperCase()}`
    );

    // Notificação correspondente local
    await this.criarNotificacao(
      novoChamado.id,
      chamado.prioridade === 'critica' ? '⚠️ Chamado Crítico Criado' : '🛠️ Novo Chamado Criado',
      `Equipamento ${chamado.equipamento} (${chamado.patrimonio}) no setor ${chamado.setor} registrado com prioridade ${chamado.prioridade.toUpperCase()}.`,
      chamado.prioridade === 'critica' ? 'chamado_critico' : 'novo_chamado'
    );

    return novoChamado;
  },

  async editarChamadoOperador(id: string, dados: Partial<Chamado>, usuarioId: string): Promise<Chamado> {
    const chamados = await this.getChamados();
    const original = chamados.find(c => c.id === id);
    if (!original) throw new Error('Chamado não localizado.');
    if (original.status !== 'aberto') {
      throw new Error('Operadores somente podem editar chamados que ainda encontram-se em status Aberto.');
    }

    const alteracoes: string[] = [];
    if (dados.equipamento && dados.equipamento !== original.equipamento) alteracoes.push(`equipamento de '${original.equipamento}' para '${dados.equipamento}'`);
    if (dados.prioridade && dados.prioridade !== original.prioridade) alteracoes.push(`prioridade de '${original.prioridade}' para '${dados.prioridade}'`);
    if (dados.descricao && dados.descricao !== original.descricao) alteracoes.push('descrição do chamado');
    if (dados.setor && dados.setor !== original.setor) alteracoes.push(`setor de '${original.setor}' para '${dados.setor}'`);

    const chamadoAtualizado: Chamado = {
      ...original,
      ...dados,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('chamados')
          .update({
            equipamento: dados.equipamento,
            patrimonio: dados.patrimonio,
            setor: dados.setor,
            localizacao: dados.localizacao,
            prioridade: dados.prioridade,
            descricao: dados.descricao,
            sintomas_observados: dados.sintomas_observados,
          })
          .eq('id', id);

        if (error) throw error;

        if (alteracoes.length > 0) {
          await this.registrarAuditLog(
            id,
            original.numero_chamado,
            usuarioId,
            'Alterar chamado',
            `Dados alterados pelo operador: ${alteracoes.join(', ')}`
          );
        }

        return chamadoAtualizado;
      } catch (e) {
        console.error('Erro Supabase editarChamadoOperador:', e);
      }
    }

    // Local update
    const novaLista = chamados.map(c => c.id === id ? chamadoAtualizado : c);
    localStorage.setItem(INDICE_CHAMADOS_OFFLINE, JSON.stringify(novaLista));

    if (alteracoes.length > 0) {
      await this.registrarAuditLog(
        id,
        original.numero_chamado,
        usuarioId,
        'Alterar chamado',
        `Dados alterados pelo operador: ${alteracoes.join(', ')}`
      );
    }

    return chamadoAtualizado;
  },

  async assumirChamado(id: string, mecanicoId: string): Promise<Chamado> {
    const chamados = await this.getChamados();
    const chamado = chamados.find(c => c.id === id);
    if (!chamado) throw new Error('Chamado não localizado.');
    if (chamado.status !== 'aberto') {
      throw new Error('Apenas chamados com status Aberto podem ser assumidos por um mecânico.');
    }

    const agora = new Date().toISOString();
    const atualizado: Chamado = {
      ...chamado,
      mecanico_id: mecanicoId,
      status: 'em_analise',
      data_inicio: agora
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('chamados')
          .update({
            mecanico_id: mecanicoId,
            status: 'em_analise',
            data_inicio: agora
          })
          .eq('id', id);

        if (error) throw error;

        await this.registrarAuditLog(
          id,
          chamado.numero_chamado,
          mecanicoId,
          'Assumir chamado',
          `Chamado assumido pelo mecânico. Atendimento em análise iniciado.`
        );

        await this.criarNotificacao(
          id,
          `👨‍🔧 Chamado Assumido (#${chamado.numero_chamado})`,
          `O mecânico assumiu a manutenção do equipamento ${chamado.equipamento}. Status atualizado para Em Análise.`,
          'chamado_assumido'
        );

        return atualizado;
      } catch (e) {
        console.error('Erro Supabase assumirChamado:', e);
      }
    }

    const novaLista = chamados.map(c => c.id === id ? atualizado : c);
    localStorage.setItem(INDICE_CHAMADOS_OFFLINE, JSON.stringify(novaLista));

    await this.registrarAuditLog(
      id,
      chamado.numero_chamado,
      mecanicoId,
      'Assumir chamado',
      `Chamado assumido pelo mecânico. Atendimento iniciado.`
    );

    await this.criarNotificacao(
      id,
      '👨‍🔧 Chamado Assumido',
      `Atendimento técnico iniciado para a máquina ${chamado.equipamento} pelo seu mecânico responsável.`,
      'chamado_assumido'
    );

    return atualizado;
  },

  async alterarStatusMecanico(id: string, status: StatusChamado, mecanicoId: string, justificativa?: string): Promise<Chamado> {
    const chamados = await this.getChamados();
    const chamado = chamados.find(c => c.id === id);
    if (!chamado) throw new Error('Chamado não localizado.');
    if (chamado.mecanico_id !== mecanicoId) {
      throw new Error('Você só pode alterar o status de chamados sob sua responsabilidade técnica.');
    }

    const atualizado: Chamado = {
      ...chamado,
      status
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('chamados')
          .update({ status })
          .eq('id', id);

        if (error) throw error;

        await this.registrarAuditLog(
          id,
          chamado.numero_chamado,
          mecanicoId,
          'Atualizar status',
          `Alterou status de '${chamado.status.toUpperCase()}' para '${status.toUpperCase()}'. ${justificativa ? 'Justificativa: ' + justificativa : ''}`
        );

        return atualizado;
      } catch (e) {
        console.error('Erro Supabase alterarStatusMecanico:', e);
      }
    }

    const novaLista = chamados.map(c => c.id === id ? { ...c, status } : c);
    localStorage.setItem(INDICE_CHAMADOS_OFFLINE, JSON.stringify(novaLista));

    await this.registrarAuditLog(
      id,
      chamado.numero_chamado,
      mecanicoId,
      'Atualizar status',
      `Alterou status de '${chamado.status.toUpperCase()}' para '${status.toUpperCase()}'. ${justificativa ? 'Justificativa: ' + justificativa : ''}`
    );

    return atualizado;
  },

  async encerrarChamado(
    id: string, 
    mecanicoId: string, 
    atendimento: Omit<Atendimento, 'id' | 'chamado_id' | 'created_at'>,
    pecas: { nome_peca: string; quantidade: number }[]
  ): Promise<Chamado> {
    const chamados = await this.getChamados();
    const chamado = chamados.find(c => c.id === id);
    if (!chamado) throw new Error('Chamado não localizado.');

    const agora = new Date().toISOString();
    const atualizado: Chamado = {
      ...chamado,
      status: 'finalizado',
      data_encerramento: agora
    };

    // 1. SUPABASE FLOW
    if (isSupabaseConfigured && supabase) {
      try {
        // Encerra chamado
        const { error: chErr } = await supabase
          .from('chamados')
          .update({
            status: 'finalizado',
            data_encerramento: agora
          })
          .eq('id', id);
        
        if (chErr) throw chErr;

        // Salva atendimento
        const attPayload = {
          chamado_id: id,
          diagnostico: atendimento.diagnostico,
          causa_raiz: atendimento.causa_raiz,
          solucao: atendimento.solucao,
          horas_trabalhadas: atendimento.horas_trabalhadas,
          observacoes: atendimento.observacoes,
          assinatura_digital: atendimento.assinatura_digital,
          checklist_conclusao: atendimento.checklist_conclusao
        };

        const { data: attData, error: attErr } = await supabase
          .from('atendimentos')
          .insert([attPayload])
          .select();
        
        if (attErr) throw attErr;
        const novoAtt = attData[0];

        // Salva Peças
        if (pecas.length > 0) {
          const pecasPayload = pecas.map(p => ({
            atendimento_id: novoAtt.id,
            chamado_id: id,
            nome_peca: p.nome_peca,
            quantidade: p.quantidade
          }));

          const { error: pecErr } = await supabase
            .from('pecas_utilizadas')
            .insert(pecasPayload);

          if (pecErr) throw pecErr;
        }

        // Logs e Notificações
        await this.registrarAuditLog(
          id,
          chamado.numero_chamado,
          mecanicoId,
          'Preencher atendimento',
          `Atendimento técnico inserido. Fechamento total de ${atendimento.horas_trabalhadas}h.`
        );

        await this.registrarAuditLog(
          id,
          chamado.numero_chamado,
          mecanicoId,
          'Atualizar status',
          `Status do chamado alterado para FINALIZADO.`
        );

        await this.criarNotificacao(
          id,
          `✅ Chamado Finalizado (#${chamado.numero_chamado})`,
          `Equipamento ${chamado.equipamento} reparado e validado. Atendimento encerrado em ${atendimento.horas_trabalhadas} horas de trabalho mecânico.`,
          'chamado_finalizado'
        );

        return atualizado;
      } catch (e) {
        console.error('Erro Supabase encerrarChamado:', e);
      }
    }

    // 2. OFFLINE FLOW
    const novaListaChamados = chamados.map(c => c.id === id ? atualizado : c);
    localStorage.setItem(INDICE_CHAMADOS_OFFLINE, JSON.stringify(novaListaChamados));

    // Salvar atendimento
    const atendimentos: Atendimento[] = JSON.parse(localStorage.getItem(INDICE_ATENDIMENTOS_OFFLINE) || '[]');
    const novoAtendimentoOffline: Atendimento = {
      ...atendimento,
      id: 'at-' + Math.random().toString(36).substr(2, 9),
      chamado_id: id,
      created_at: agora
    };
    atendimentos.push(novoAtendimentoOffline);
    localStorage.setItem(INDICE_ATENDIMENTOS_OFFLINE, JSON.stringify(atendimentos));

    // Salvar Peças
    if (pecas.length > 0) {
      const pecasSalvas: PecaUtilizada[] = JSON.parse(localStorage.getItem(INDICE_PECAS_OFFLINE) || '[]');
      pecas.forEach(p => {
        pecasSalvas.push({
          id: 'pc-' + Math.random().toString(36).substr(2, 9),
          chamado_id: id,
          atendimento_id: novoAtendimentoOffline.id,
          nome_peca: p.nome_peca,
          quantidade: p.quantidade
        });
      });
      localStorage.setItem(INDICE_PECAS_OFFLINE, JSON.stringify(pecasSalvas));
    }

    // Registros locales
    await this.registrarAuditLog(
      id,
      chamado.numero_chamado,
      mecanicoId,
      'Preencher atendimento',
      `Atendimento técnico preenchido. Fechamento de ${atendimento.horas_trabalhadas}h trabalhadas.`
    );

    await this.registrarAuditLog(
      id,
      chamado.numero_chamado,
      mecanicoId,
      'Atualizar status',
      "Status modificado de 'Em manutenção' para 'Finalizado'."
    );

    await this.criarNotificacao(
      id,
      '✅ Chamado Finalizado',
      `Reparo concluído com sucesso e testado para a máquina ${chamado.equipamento}. Atendimento fechado.`,
      'chamado_finalizado'
    );

    return atualizado;
  },

  async cancelarChamado(id: string, usuarioId: string, justificativa: string): Promise<Chamado> {
    const chamados = await this.getChamados();
    const chamado = chamados.find(c => c.id === id);
    if (!chamado) throw new Error('Chamado não localizado.');

    const agora = new Date().toISOString();
    const atualizado: Chamado = {
      ...chamado,
      status: 'cancelado',
      data_encerramento: agora
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('chamados')
          .update({
            status: 'cancelado',
            data_encerramento: agora
          })
          .eq('id', id);

        if (error) throw error;

        await this.registrarAuditLog(
          id,
          chamado.numero_chamado,
          usuarioId,
          'Cancelar chamado',
          `Chamado cancelado administrativamente. Motivo: ${justificativa}`
        );

        return atualizado;
      } catch (e) {
        console.error('Erro Supabase cancelarChamado:', e);
      }
    }

    const novaLista = chamados.map(c => c.id === id ? atualizado : c);
    localStorage.setItem(INDICE_CHAMADOS_OFFLINE, JSON.stringify(novaLista));

    await this.registrarAuditLog(
      id,
      chamado.numero_chamado,
      usuarioId,
      'Cancelar chamado',
      `Chamado cancelado administrativamente. Motivo: ${justificativa}`
    );

    return atualizado;
  },

  // ==========================================
  // DETALHES RELACIONADOS DO ATENDIMENTO
  // ==========================================

  async getAtendimentoPorChamado(chamadoId: string): Promise<Atendimento | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('atendimentos')
          .select('*')
          .eq('chamado_id', chamadoId)
          .maybeSingle();

        if (error) throw error;
        return data as Atendimento | null;
      } catch (e) {
        console.error('Erro Supabase getAtendimento:', e);
      }
    }

    const atendimentos: Atendimento[] = JSON.parse(localStorage.getItem(INDICE_ATENDIMENTOS_OFFLINE) || '[]');
    return atendimentos.find(a => a.chamado_id === chamadoId) || null;
  },

  async getPecasPorChamado(chamadoId: string): Promise<PecaUtilizada[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('pecas_utilizadas')
          .select('*')
          .eq('chamado_id', chamadoId);

        if (error) throw error;
        return data as PecaUtilizada[];
      } catch (e) {
        console.error('Erro Supabase getPecas:', e);
      }
    }

    const pecas: PecaUtilizada[] = JSON.parse(localStorage.getItem(INDICE_PECAS_OFFLINE) || '[]');
    return pecas.filter(p => p.chamado_id === chamadoId);
  },

  // ==========================================
  // ANEXOS E ARQUIVOS (MOCK UPLOADS)
  // ==========================================

  async getAnexosPorChamado(chamadoId: string): Promise<Anexo[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('anexos')
          .select('*')
          .eq('chamado_id', chamadoId);

        if (error) throw error;
        return data as Anexo[];
      } catch (e) {
        console.error('Erro Supabase getAnexos:', e);
      }
    }

    const anexos: Anexo[] = JSON.parse(localStorage.getItem(INDICE_ANEXOS_OFFLINE) || '[]');
    return anexos.filter(a => a.chamado_id === chamadoId);
  },

  async salvarAnexo(chamadoId: string, nomeArquivo: string, base64Url: string, tamanho = '1.2 MB'): Promise<Anexo> {
    const novoAnexo: Anexo = {
      id: isSupabaseConfigured ? undefined as any : 'anx-' + Math.random().toString(36).substr(2, 9),
      chamado_id: chamadoId,
      url_arquivo: base64Url,
      nome_arquivo: nomeArquivo,
      tipo_arquivo: nomeArquivo.split('.').pop() || 'arquivo',
      tamanho,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('anexos')
          .insert([{
            chamado_id: chamadoId,
            url_arquivo: base64Url,
            nome_arquivo: nomeArquivo,
            tipo_arquivo: novoAnexo.tipo_arquivo,
            tamanho
          }])
          .select();

        if (error) throw error;
        return data[0] as Anexo;
      } catch (e) {
        console.error('Erro Supabase salvarAnexo:', e);
      }
    }

    const anexos: Anexo[] = JSON.parse(localStorage.getItem(INDICE_ANEXOS_OFFLINE) || '[]');
    anexos.push(novoAnexo);
    localStorage.setItem(INDICE_ANEXOS_OFFLINE, JSON.stringify(anexos));
    return novoAnexo;
  },

  // ==========================================
  // LOGS DE AUDITORIA
  // ==========================================

  async getAuditLogs(chamadoId?: string): Promise<AuditLog[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('audit_logs')
          .select('*')
          .order('data_alteracao', { ascending: false });

        if (chamadoId) {
          query = query.eq('chamado_id', chamadoId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as AuditLog[];
      } catch (e) {
        console.error('Erro Supabase getAuditLogs:', e);
      }
    }

    const logs: AuditLog[] = JSON.parse(localStorage.getItem(INDICE_AUDIT_OFFLINE) || '[]');
    let filtrado = logs;
    if (chamadoId) {
      filtrado = logs.filter(l => l.chamado_id === chamadoId);
    }
    return filtrado.sort((a,b) => new Date(b.data_alteracao).getTime() - new Date(a.data_alteracao).getTime());
  },

  async registrarAuditLog(chamadoId: string | undefined, numeroChamado: string | undefined, usuarioId: string, acao: string, detalhes: string): Promise<AuditLog> {
    const usuarios = await this.getUsuarios();
    const user = usuarios.find(u => u.id === usuarioId);
    const usuario_nome = user ? user.nome : 'Usuário';

    const novoLog: AuditLog = {
      id: isSupabaseConfigured ? undefined as any : 'log-' + Math.random().toString(36).substr(2, 9),
      chamado_id: chamadoId,
      numero_chamado: numeroChamado,
      usuario_id: usuarioId,
      usuario_nome,
      acao,
      detalhes,
      data_alteracao: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .insert([{
            chamado_id: chamadoId,
            numero_chamado: numeroChamado,
            usuario_id: usuarioId,
            usuario_nome,
            acao,
            detalhes
          }])
          .select();

        if (error) throw error;
        return data[0] as AuditLog;
      } catch (e) {
        console.error('Erro Supabase registrarAuditLog:', e);
      }
    }

    const logs: AuditLog[] = JSON.parse(localStorage.getItem(INDICE_AUDIT_OFFLINE) || '[]');
    logs.push(novoLog);
    localStorage.setItem(INDICE_AUDIT_OFFLINE, JSON.stringify(logs));
    return novoLog;
  },

  // ==========================================
  // NOTIFICAÇÕES (Em tempo real)
  // ==========================================

  async getNotificacoes(): Promise<Notificacao[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('notificacoes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        return data as Notificacao[];
      } catch (e) {
        console.error('Erro Supabase getNotificacoes:', e);
      }
    }

    const nots: Notificacao[] = JSON.parse(localStorage.getItem(INDICE_NOTIFICACAO_OFFLINE) || '[]');
    return nots.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async criarNotificacao(chamadoId: string | undefined, titulo: string, mensagem: string, tipo: Notificacao['tipo']): Promise<Notificacao> {
    const novaNotificacao: Notificacao = {
      id: isSupabaseConfigured ? undefined as any : 'not-' + Math.random().toString(36).substr(2, 9),
      chamado_id: chamadoId,
      titulo,
      mensagem,
      lida: false,
      tipo,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('notificacoes')
          .insert([novaNotificacao])
          .select();

        if (error) throw error;
        // Supabase trigger will dispatch it, locally we can also invoke real-time
        dispararNotificacaoLocal(data[0]);
        return data[0] as Notificacao;
      } catch (e) {
        console.error('Erro Supabase criarNotificacao:', e);
      }
    }

    const list: Notificacao[] = JSON.parse(localStorage.getItem(INDICE_NOTIFICACAO_OFFLINE) || '[]');
    list.push(novaNotificacao);
    localStorage.setItem(INDICE_NOTIFICACAO_OFFLINE, JSON.stringify(list));
    
    // Dispatch local real-time callback
    dispararNotificacaoLocal(novaNotificacao);

    return novaNotificacao;
  },

  async marcarNotificacaoLida(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('notificacoes')
          .update({ lida: true })
          .eq('id', id);

        if (error) throw error;
        return true;
      } catch (e) {
        console.error('Erro Supabase marcarNotificacaoLida:', e);
      }
    }

    const list: Notificacao[] = JSON.parse(localStorage.getItem(INDICE_NOTIFICACAO_OFFLINE) || '[]');
    const atualizada = list.map(n => n.id === id ? { ...n, lida: true } : n);
    localStorage.setItem(INDICE_NOTIFICACAO_OFFLINE, JSON.stringify(atualizada));
    return true;
  },

  async limparNotificacoesLidas(): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('notificacoes')
          .delete()
          .eq('lida', true);

        if (error) throw error;
        return true;
      } catch (e) {
        console.error('Erro Supabase limparNotificacoesLidas:', e);
      }
    }

    const list: Notificacao[] = JSON.parse(localStorage.getItem(INDICE_NOTIFICACAO_OFFLINE) || '[]');
    const atualizada = list.filter(n => !n.lida);
    localStorage.setItem(INDICE_NOTIFICACAO_OFFLINE, JSON.stringify(atualizada));
    return true;
  },

  // ==========================================
  // PARÂMETROS DO SISTEMA
  // ==========================================

  async getParametros(): Promise<ParametrosSistema> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('parametros_sistema')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          return {
            tempoMaximoCriticoHoras: data.tempo_maximo_critico_horas,
            permitirAssinaturaDigital: data.permitir_assinatura_digital,
            checklistObrigatorio: data.checklist_obrigatorio,
            setoresDisponiveis: data.setores_disponiveis || PARAMETROS_PADRAO.setoresDisponiveis,
            oficinasDisponiveis: data.oficinas_disponiveis || PARAMETROS_PADRAO.oficinasDisponiveis
          };
        }
      } catch (e) {
        console.error('Erro Supabase getParametros:', e);
      }
    }

    return JSON.parse(localStorage.getItem(INDICE_PARAMETROS_OFFLINE) || JSON.stringify(PARAMETROS_PADRAO));
  },

  async salvarParametros(parametros: ParametrosSistema): Promise<ParametrosSistema> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('parametros_sistema')
          .upsert({
            id: 1,
            tempo_maximo_critico_horas: parametros.tempoMaximoCriticoHoras,
            permitir_assinatura_digital: parametros.permitirAssinaturaDigital,
            checklist_obrigatorio: parametros.checklistObrigatorio,
            setores_disponiveis: parametros.setoresDisponiveis,
            oficinas_disponiveis: parametros.oficinasDisponiveis
          });

        if (error) throw error;
        return parametros;
      } catch (e) {
        console.error('Erro Supabase salvarParametros:', e);
      }
    }

    localStorage.setItem(INDICE_PARAMETROS_OFFLINE, JSON.stringify(parametros));
    return parametros;
  }
};
