-- ================================================================
-- MIGRATION: tab_secretarias v2 — Novos campos detalhados
-- Execute no SQL Editor do Supabase
-- ================================================================

ALTER TABLE public.tab_secretarias
  ADD COLUMN IF NOT EXISTS cnpj      TEXT,
  ADD COLUMN IF NOT EXISTS biografia TEXT,
  ADD COLUMN IF NOT EXISTS funcoes   TEXT;

-- Comentários descritivos
COMMENT ON COLUMN public.tab_secretarias.cnpj      IS 'CNPJ do órgão/secretaria';
COMMENT ON COLUMN public.tab_secretarias.biografia IS 'Biografia completa do secretário(a) titular';
COMMENT ON COLUMN public.tab_secretarias.funcoes   IS 'Funções e competências da secretaria (texto longo)';
