/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PerfilUsuario = 'operador' | 'mecanico' | 'admin';

export interface Usuario {
  id: string;
  nome: string;
  login: string;
  senha?: string;
  perfil: PerfilUsuario;
  created_at?: string;
}

export type PrioridadeChamado = 'baixa' | 'media' | 'alta' | 'critica';

export type StatusChamado = 
  | 'aberto' 
  | 'em_analise' 
  | 'aguardando_peca' 
  | 'em_manutencao' 
  | 'teste_realizado' 
  | 'finalizado' 
  | 'cancelado';

export interface Chamado {
  id: string;
  numero_chamado: string;
  equipamento: string;
  patrimonio: string;
  setor: string;
  localizacao: string;
  prioridade: PrioridadeChamado;
  descricao: string;
  sintomas_observados?: string;
  status: StatusChamado;
  operador_id: string;
  mecanico_id?: string;
  data_abertura: string;
  data_inicio?: string;
  data_encerramento?: string;
  created_at: string;
  // Dynamic fields loaded for UI convenience
  operador_nome?: string;
  mecanico_nome?: string;
}

export interface ChecklistItem {
  id: string;
  descricao: string;
  checked: boolean;
}

export interface Atendimento {
  id: string;
  chamado_id: string;
  diagnostico: string;
  causa_raiz: string;
  solucao: string;
  horas_trabalhadas: number;
  observacoes?: string;
  assinatura_digital?: string; // DataURL or name representation
  checklist_conclusao?: ChecklistItem[];
  created_at: string;
}

export interface PecaUtilizada {
  id: string;
  chamado_id: string; // directly bound to ticket for simpler fallback query
  atendimento_id?: string;
  nome_peca: string;
  quantidade: number;
  created_at?: string;
}

export interface Anexo {
  id: string;
  chamado_id: string;
  url_arquivo: string; // Base64 data-URL in offline mode, Supabase Storage URL otherwise
  nome_arquivo: string;
  tipo_arquivo?: string;
  tamanho?: string;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  chamado_id?: string;
  numero_chamado?: string;
  usuario_id: string;
  usuario_nome: string;
  acao: string; // 'Criar chamado', 'Assumir chamado', 'Atualizar status', 'Preencher atendimento', 'Cancelar chamado'
  data_alteracao: string;
  detalhes: string; // Readable details of changes
}

export interface Notificacao {
  id: string;
  chamado_id?: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  tipo: 'novo_chamado' | 'chamado_assumido' | 'chamado_finalizado' | 'chamado_critico' | 'sistema';
  created_at: string;
}

export interface ParametrosSistema {
  tempoMaximoCriticoHoras: number; // e.g., 4 hours
  permitirAssinaturaDigital: boolean;
  checklistObrigatorio: boolean;
  setoresDisponiveis: string[];
  oficinasDisponiveis: string[];
}
