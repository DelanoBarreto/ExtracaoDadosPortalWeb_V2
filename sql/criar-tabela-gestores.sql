CREATE TABLE IF NOT EXISTS tab_gestores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    municipio_id uuid NOT NULL REFERENCES tab_municipios(id) ON DELETE CASCADE,
    nome text NOT NULL,
    cargo text NOT NULL CHECK (cargo IN ('PREFEITO(A)', 'VICE-PREFEITO(A)')),
    data_inicio date,
    data_fim date,
    foto_url text,
    is_atual boolean DEFAULT false,
    exercicio int4,
    status text DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicado','arquivado')),
    url_origem text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gestores_municipio ON tab_gestores(municipio_id);
CREATE INDEX IF NOT EXISTS idx_gestores_atual ON tab_gestores(municipio_id, is_atual);

-- Ativar RLS (Segurança)
ALTER TABLE tab_gestores ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público (Leitura liberada)
DROP POLICY IF EXISTS "Leitura pública para gestores" ON tab_gestores;
CREATE POLICY "Leitura pública para gestores" ON tab_gestores
  FOR SELECT USING (true);
