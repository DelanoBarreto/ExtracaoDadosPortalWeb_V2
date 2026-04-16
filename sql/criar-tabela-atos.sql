-- Rode isso no painel do Supabase (SQL Editor)

CREATE TABLE IF NOT EXISTS public.tab_atos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    municipio_id UUID NOT NULL REFERENCES public.tab_municipios(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    ano INTEGER,
    competencia TEXT, -- Ex: "ANUAL/2026", "1º Bimestre"
    data_publicacao TIMESTAMPTZ,
    arquivo_url TEXT, -- Link do PDF no Supabase Storage
    url_original TEXT UNIQUE NOT NULL, -- Link da página de detalhe no site
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE tab_atos ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público (Leitura)
DROP POLICY IF EXISTS "Leitura pública para Atos" ON tab_atos;
CREATE POLICY "Leitura pública para Atos" ON tab_atos FOR SELECT USING (true);
