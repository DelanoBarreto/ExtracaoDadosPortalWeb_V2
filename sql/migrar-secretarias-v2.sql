-- ================================================================
-- MIGRAÇÃO: tab_secretarias v2
-- Adiciona colunas foto_url e exercicio
-- Execute no SQL Editor do Supabase
-- ================================================================

-- 1. Adicionar coluna para URL da foto do gestor no Storage
ALTER TABLE public.tab_secretarias
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 2. Adicionar coluna de exercício (ano de gestão)
ALTER TABLE public.tab_secretarias
  ADD COLUMN IF NOT EXISTS exercicio INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER;

-- 3. Atualizar a documentação do SQL de criação (comentário apenas)
COMMENT ON COLUMN public.tab_secretarias.foto_url IS 'URL da foto do gestor armazenada no Supabase Storage';
COMMENT ON COLUMN public.tab_secretarias.exercicio IS 'Ano de gestão/exercício da secretaria (ex: 2025, 2026)';

-- ================================================================
-- VERIFICAÇÃO: rode este SELECT para confirmar as colunas existem
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'tab_secretarias' ORDER BY ordinal_position;
-- ================================================================
