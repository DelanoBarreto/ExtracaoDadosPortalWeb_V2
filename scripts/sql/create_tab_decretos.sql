-- Criação da tabela de Decretos Municipais e Orçamentários
CREATE TABLE public.tab_decretos (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    municipio_id UUID NOT NULL REFERENCES public.tab_municipios(id) ON DELETE CASCADE,
    numero TEXT NOT NULL,
    data_decreto DATE,
    ano INTEGER,
    tipo TEXT DEFAULT 'Municipal',
    ementa TEXT,
    arquivo_url TEXT,
    url_original TEXT UNIQUE,
    status TEXT DEFAULT 'rascunho',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.tab_decretos ENABLE ROW LEVEL SECURITY;

-- Criação de Políticas (Policies)
-- Leitura pública para todos os usuários anônimos (portal público lerá apenas os publicados)
CREATE POLICY "Leitura pública de decretos" ON public.tab_decretos
    FOR SELECT USING (true);

-- Inserção para usuários autenticados e service role
CREATE POLICY "Inserção para usuários autenticados" ON public.tab_decretos
    FOR INSERT WITH CHECK (true);

-- Atualização para usuários autenticados e service role
CREATE POLICY "Atualização para usuários autenticados" ON public.tab_decretos
    FOR UPDATE USING (true) WITH CHECK (true);

-- Deleção para usuários autenticados e service role
CREATE POLICY "Deleção para usuários autenticados" ON public.tab_decretos
    FOR DELETE USING (true);

-- Trigger para atualizar o campo updated_at automaticamente
CREATE TRIGGER handle_updated_at_tab_decretos
    BEFORE UPDATE ON public.tab_decretos
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime(updated_at);
