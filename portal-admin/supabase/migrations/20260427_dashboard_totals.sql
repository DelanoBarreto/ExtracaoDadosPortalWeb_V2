-- ============================================================
-- TABELA CENTRAL DE MÉTRICAS: tab_dashboard_totals
-- Mantém contagens pré-calculadas por municipio + modulo + status
-- Atualizada automaticamente via triggers
-- ============================================================

-- 1. Criar tabela de totais
CREATE TABLE IF NOT EXISTS tab_dashboard_totals (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  municipio_id    UUID NOT NULL REFERENCES tab_municipios(id) ON DELETE CASCADE,
  modulo          TEXT NOT NULL CHECK (modulo IN ('noticias', 'lrf', 'secretarias')),
  status          TEXT NOT NULL CHECK (status IN ('rascunho', 'publicado', 'arquivado', 'total')),
  quantidade      INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (municipio_id, modulo, status)
);

-- Índice para consultas rápidas por município
CREATE INDEX IF NOT EXISTS idx_dashboard_totals_municipio ON tab_dashboard_totals(municipio_id);

-- ============================================================
-- 2. Função genérica de recalculo para um município e módulo
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_module_totals(
  p_municipio_id UUID,
  p_modulo TEXT
) RETURNS VOID LANGUAGE plpgsql AS $func$
DECLARE
  v_table TEXT;
  v_total INT;
  v_publicado INT;
  v_rascunho INT;
  v_arquivado INT;
BEGIN
  -- Determina qual tabela usar
  CASE p_modulo
    WHEN 'noticias'    THEN v_table := 'tab_noticias';
    WHEN 'lrf'         THEN v_table := 'tab_lrf';
    WHEN 'secretarias' THEN v_table := 'tab_secretarias';
  END CASE;

  -- Conta total
  EXECUTE format('SELECT COUNT(*) FROM %I WHERE municipio_id = $1', v_table)
    INTO v_total USING p_municipio_id;

  -- Conta publicado (aceita variações de grafia)
  EXECUTE format($$
    SELECT COUNT(*) FROM %I
    WHERE municipio_id = $1
    AND LOWER(COALESCE(status,'')) IN ('publicado','published')
  $$, v_table) INTO v_publicado USING p_municipio_id;

  -- Conta rascunho (null também conta como rascunho)
  EXECUTE format($$
    SELECT COUNT(*) FROM %I
    WHERE municipio_id = $1
    AND (status IS NULL OR LOWER(status) IN ('rascunho','draft'))
  $$, v_table) INTO v_rascunho USING p_municipio_id;

  -- Conta arquivado
  EXECUTE format($$
    SELECT COUNT(*) FROM %I
    WHERE municipio_id = $1
    AND LOWER(COALESCE(status,'')) IN ('arquivado','archived')
  $$, v_table) INTO v_arquivado USING p_municipio_id;

  -- Upsert dos 4 registros
  INSERT INTO tab_dashboard_totals (municipio_id, modulo, status, quantidade, updated_at)
  VALUES
    (p_municipio_id, p_modulo, 'total',     v_total,     NOW()),
    (p_municipio_id, p_modulo, 'publicado', v_publicado, NOW()),
    (p_municipio_id, p_modulo, 'rascunho',  v_rascunho,  NOW()),
    (p_municipio_id, p_modulo, 'arquivado', v_arquivado, NOW())
  ON CONFLICT (municipio_id, modulo, status)
  DO UPDATE SET quantidade = EXCLUDED.quantidade, updated_at = NOW();
END;
$func$;

-- ============================================================
-- 3. Funções de trigger para cada tabela
-- ============================================================

-- Trigger NOTICIAS
CREATE OR REPLACE FUNCTION tg_noticias_update_totals()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_mun_id UUID;
BEGIN
  -- Usa o município do registro afetado (NEW ou OLD dependendo da operação)
  v_mun_id := COALESCE(NEW.municipio_id, OLD.municipio_id);
  IF v_mun_id IS NOT NULL THEN
    PERFORM recalculate_module_totals(v_mun_id, 'noticias');
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_noticias_totals ON tab_noticias;
CREATE TRIGGER trg_noticias_totals
  AFTER INSERT OR UPDATE OR DELETE ON tab_noticias
  FOR EACH ROW EXECUTE FUNCTION tg_noticias_update_totals();

-- Trigger LRF
CREATE OR REPLACE FUNCTION tg_lrf_update_totals()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_mun_id UUID;
BEGIN
  v_mun_id := COALESCE(NEW.municipio_id, OLD.municipio_id);
  IF v_mun_id IS NOT NULL THEN
    PERFORM recalculate_module_totals(v_mun_id, 'lrf');
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_lrf_totals ON tab_lrf;
CREATE TRIGGER trg_lrf_totals
  AFTER INSERT OR UPDATE OR DELETE ON tab_lrf
  FOR EACH ROW EXECUTE FUNCTION tg_lrf_update_totals();

-- Trigger SECRETARIAS
CREATE OR REPLACE FUNCTION tg_secretarias_update_totals()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_mun_id UUID;
BEGIN
  v_mun_id := COALESCE(NEW.municipio_id, OLD.municipio_id);
  IF v_mun_id IS NOT NULL THEN
    PERFORM recalculate_module_totals(v_mun_id, 'secretarias');
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_secretarias_totals ON tab_secretarias;
CREATE TRIGGER trg_secretarias_totals
  AFTER INSERT OR UPDATE OR DELETE ON tab_secretarias
  FOR EACH ROW EXECUTE FUNCTION tg_secretarias_update_totals();

-- ============================================================
-- 4. SEED INICIAL: Recalcular todos os municípios existentes
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM tab_municipios LOOP
    PERFORM recalculate_module_totals(r.id, 'noticias');
    PERFORM recalculate_module_totals(r.id, 'lrf');
    PERFORM recalculate_module_totals(r.id, 'secretarias');
  END LOOP;
END;
$$;

-- ============================================================
-- 5. RLS: Deixar a tabela acessível para o service role
-- ============================================================
ALTER TABLE tab_dashboard_totals ENABLE ROW LEVEL SECURITY;

-- Política: service_role tem acesso total (usado pelo supabaseAdmin)
DROP POLICY IF EXISTS "service_role_all" ON tab_dashboard_totals;
CREATE POLICY "service_role_all" ON tab_dashboard_totals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Política: autenticados podem ler
DROP POLICY IF EXISTS "authenticated_read" ON tab_dashboard_totals;
CREATE POLICY "authenticated_read" ON tab_dashboard_totals
  FOR SELECT TO authenticated USING (true);
