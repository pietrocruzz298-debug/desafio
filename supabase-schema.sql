-- 
-- SCRIPT SQL DE CRIAÇÃO E CONFIGURAÇÃO DO BANCO DE DADOS (SUPABASE)
-- Sistema de Gestão de Chamados de Manutenção Mecânica
-- 

-- Habilitar a extensão UUID se disponível
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    login VARCHAR(50) UNIQUE NOT NULL,
    senha VARCHAR(100) NOT NULL, -- Senha guardada em texto limpo ou hash simples para testes rápidos
    perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('operador', 'mecanico', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. TABELA DE CHAMADOS
CREATE TABLE IF NOT EXISTS public.chamados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_chamado VARCHAR(30) UNIQUE NOT NULL,
    equipamento VARCHAR(100) NOT NULL,
    patrimonio VARCHAR(50) NOT NULL,
    setor VARCHAR(50) NOT NULL,
    localizacao VARCHAR(100) NOT NULL,
    prioridade VARCHAR(20) NOT NULL CHECK (prioridade IN ('baixa', 'media', 'alta', 'critica')),
    descricao TEXT NOT NULL,
    sintomas_observados TEXT,
    status VARCHAR(30) DEFAULT 'aberto' NOT NULL CHECK (status IN ('aberto', 'em_analise', 'aguardando_peca', 'em_manutencao', 'teste_realizado', 'finalizado', 'cancelado')),
    operador_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    mecanico_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    data_abertura TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    data_inicio TIMESTAMP WITH TIME ZONE,
    data_encerramento TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. TABELA DE ATENDIMENTOS (Mecânicos)
CREATE TABLE IF NOT EXISTS public.atendimentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chamado_id UUID NOT NULL UNIQUE REFERENCES public.chamados(id) ON DELETE CASCADE,
    diagnostico TEXT NOT NULL,
    causa_raiz TEXT NOT NULL,
    solucao TEXT NOT NULL,
    horas_trabalhadas NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    observacoes TEXT,
    assinatura_digital TEXT, -- Armazena a assinatura em formato Base64 ou texto
    checklist_conclusao JSONB, -- Checklist em formato JSON array
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. TABELA DE PEÇAS UTILIZADAS
CREATE TABLE IF NOT EXISTS public.pecas_utilizadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    atendimento_id UUID REFERENCES public.atendimentos(id) ON DELETE CASCADE,
    chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
    nome_peca VARCHAR(100) NOT NULL,
    quantidade INT NOT NULL CHECK (quantidade > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELA DE ANEXOS
CREATE TABLE IF NOT EXISTS public.anexos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chamado_id UUID NOT NULL REFERENCES public.chamados(id) ON DELETE CASCADE,
    url_arquivo TEXT NOT NULL, -- Link público do Supabase Storage ou Data URL
    nome_arquivo VARCHAR(255) NOT NULL,
    tipo_arquivo VARCHAR(100),
    tamanho VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. TABELA DE LOGS DE AUDITORIA
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chamado_id UUID REFERENCES public.chamados(id) ON DELETE SET NULL,
    numero_chamado VARCHAR(30),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    usuario_nome VARCHAR(100) NOT NULL,
    acao VARCHAR(100) NOT NULL,
    data_alteracao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    detalhes TEXT NOT NULL
);

-- 7. TABELA DE NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chamado_id UUID REFERENCES public.chamados(id) ON DELETE CASCADE,
    titulo VARCHAR(150) NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT FALSE NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('novo_chamado', 'chamado_assumido', 'chamado_finalizado', 'chamado_critico', 'sistema')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. TABELA DE PARÂMETROS DO SISTEMA
CREATE TABLE IF NOT EXISTS public.parametros_sistema (
    id INT PRIMARY KEY DEFAULT 1,
    tempo_maximo_critico_horas INT DEFAULT 4 NOT NULL,
    permitir_assinatura_digital BOOLEAN DEFAULT TRUE NOT NULL,
    checklist_obrigatorio BOOLEAN DEFAULT TRUE NOT NULL,
    setores_disponiveis TEXT[] DEFAULT ARRAY['Estamparia', 'Soldagem', 'Pintura', 'Montagem', 'Usinagem', 'Forjaria', 'Logística'],
    oficinas_disponiveis TEXT[] DEFAULT ARRAY['Oficina Central', 'Motos e Hidráulica', 'Elétrica-Mecânica', 'Manutenção Preventiva']
);

-- Habilitar Row Level Security (RLS) em todas as tabelas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pecas_utilizadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros_sistema ENABLE ROW LEVEL SECURITY;

-- Exemplo simplificado de Políticas de Acesso Livre para facilitar testes e configuração
-- OBS: Em produção, estas regras podem ser refinadas conforme nível de acesso JWT Auth.
CREATE POLICY "Permitir acesso completo para todos" ON public.usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo para todos" ON public.chamados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo para todos" ON public.atendimentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo para todos" ON public.pecas_utilizadas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo para todos" ON public.anexos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo para todos" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo para todos" ON public.notificacoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir acesso completo para todos" ON public.parametros_sistema FOR ALL USING (true) WITH CHECK (true);


-- ==========================================
-- SCRIPT DE SEED PARAS USUÁRIOS E DADOS INICIAIS
-- ==========================================

-- Limpar dados existentes antes de inserir (opcional, cuidado em produção!)
-- TRUNCATE TABLE public.usuarios CASCADE;

-- Inserir Usuários Iniciais de Teste
INSERT INTO public.usuarios (id, nome, login, senha, perfil) VALUES
('a1111111-1111-1111-1111-11111111111a', 'Administrador do Sistema', 'admin', 'admin123', 'admin')
ON CONFLICT (login) DO UPDATE SET nome = EXCLUDED.nome, senha = EXCLUDED.senha;

INSERT INTO public.usuarios (id, nome, login, senha, perfil) VALUES
('b2222222-2222-2222-2222-22222222222b', 'Operador de Linha Sênior', 'operador', 'operador123', 'operador')
ON CONFLICT (login) DO UPDATE SET nome = EXCLUDED.nome, senha = EXCLUDED.senha;

INSERT INTO public.usuarios (id, nome, login, senha, perfil) VALUES
('c3333333-3333-3333-3333-33333333333c', 'Mecânico de Manutenção Sênior', 'mecanico', 'mecanico123', 'mecanico')
ON CONFLICT (login) DO UPDATE SET nome = EXCLUDED.nome, senha = EXCLUDED.senha;

-- Configuração Básica de Parâmetros
INSERT INTO public.parametros_sistema (id, tempo_maximo_critico_horas, permitir_assinatura_digital, checklist_obrigatorio)
VALUES (1, 4, true, true)
ON CONFLICT (id) DO NOTHING;

-- Exemplo de Chamado Seed
INSERT INTO public.chamados (
    id, 
    numero_chamado, 
    equipamento, 
    patrimonio, 
    setor, 
    localizacao, 
    prioridade, 
    descricao, 
    sintomas_observados, 
    status, 
    operador_id,
    data_abertura
) VALUES (
    'd4444444-4444-4444-4444-44444444444d', 
    'CH-2026-0001', 
    'Prensa Hidráulica 500T', 
    'PAT-89240', 
    'Estamparia', 
    'Galpão 3 - Linha B', 
    'alta', 
    'Fuga excessiva de óleo pelas conexões do cilindro principal e perda de pressão de prensagem durante operação.', 
    'Ruído alto na bomba mecânica, pressão nominal oscilando e manchas acumuladas no solo.', 
    'aberto', 
    'b2222222-2222-2222-2222-22222222222b',
    NOW() - INTERVAL '3 hours'
) ON CONFLICT (numero_chamado) DO NOTHING;

-- Exemplo de Chamado Atendido Seed
INSERT INTO public.chamados (
    id, 
    numero_chamado, 
    equipamento, 
    patrimonio, 
    setor, 
    localizacao, 
    prioridade, 
    descricao, 
    sintomas_observados, 
    status, 
    operador_id,
    mecanico_id,
    data_abertura,
    data_inicio
) VALUES (
    'e5555555-5555-5555-5555-55555555555e', 
    'CH-2026-0002', 
    'Torno CNC Haas ST-20', 
    'PAT-41103', 
    'Usinagem', 
    'Anexo 1 - Célula 4', 
    'media', 
    'Barulho intermitente e superaquecimento no motor do fuso principal após 1h de operação contínua.', 
    'Vibração de desalinhamento na peça usinada, alarmes técnicos intermitentes no painel.', 
    'em_manutencao', 
    'b2222222-2222-2222-2222-22222222222b',
    'c3333333-3333-3333-3333-33333333333c',
    NOW() - INTERVAL '5 hours',
    NOW() - INTERVAL '4 hours'
) ON CONFLICT (numero_chamado) DO NOTHING;
