-- Adiciona coluna de status com valor padrão 'rascunho' em todas as tabelas de raspagem
-- Isso permite o fluxo de aprovação antes exibir no portal do cliente.

ALTER TABLE tab_noticias ADD COLUMN IF NOT EXISTS status text DEFAULT 'rascunho';
ALTER TABLE tab_lrf ADD COLUMN IF NOT EXISTS status text DEFAULT 'rascunho';
ALTER TABLE tab_secretarias ADD COLUMN IF NOT EXISTS status text DEFAULT 'rascunho';

-- Caso existam outras tabelas futuras, já deixamos o comando mapeado
-- ALTER TABLE tab_decretos ADD COLUMN IF NOT EXISTS status text DEFAULT 'rascunho';
-- ALTER TABLE tab_leis ADD COLUMN IF NOT EXISTS status text DEFAULT 'rascunho';
-- ALTER TABLE tab_portarias ADD COLUMN IF NOT EXISTS status text DEFAULT 'rascunho';
