-- ================================================================
-- TABELA: tab_secretarias (v2 - com foto_url e exercicio)
-- Rode isso no painel do Supabase (SQL Editor)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.tab_secretarias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    municipio_id UUID NOT NULL REFERENCES public.tab_municipios(id) ON DELETE CASCADE,
    nome_secretaria TEXT NOT NULL,
    nome_responsavel TEXT,
    cargo_responsavel TEXT,
    email TEXT,
    telefone TEXT,
    horario_atendimento TEXT,
    endereco TEXT,
    url_origem TEXT,             -- Link da página de detalhes no portal
    foto_url TEXT,               -- URL da foto do gestor no Supabase Storage
    exercicio INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER, -- Ano de gestão
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar RLS (Segurança)
ALTER TABLE tab_secretarias ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público (Leitura liberada)
DROP POLICY IF EXISTS "Leitura pública para secretarias" ON tab_secretarias;
CREATE POLICY "Leitura pública para secretarias" ON tab_secretarias
  FOR SELECT USING (true);
