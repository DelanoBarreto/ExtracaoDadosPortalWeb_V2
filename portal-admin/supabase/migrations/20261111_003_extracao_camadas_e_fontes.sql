-- =============================================================================
-- Migration: camada bruta + lacunas + fontes por municipio (piloto de noticias)
-- Aplicada no PortalGov-Producao em 2026-11-11 via apply_migration (sem begin/commit).
--
-- 1. dados_brutos / campos_pendentes / alertas nas tabelas de conteudo (decisao D7)
-- 2. execucoes_raspagem passa a aceitar o status 'pendente' (fila lida pelo worker, D11)
-- 3. fontes_municipio: URL do site antigo por organizacao (nao se altera plataforma.*)
-- Tabelas vazias na data da migration: custo de ajuste baixo.
-- =============================================================================

-- 1. Camada bruta e lacunas ---------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['noticias','secretarias','gestores','lrf','portarias','decretos'] loop
    execute format(
      'alter table extracao.%I
         add column if not exists dados_brutos     jsonb  not null default ''{}''::jsonb,
         add column if not exists campos_pendentes text[] not null default ''{}'',
         add column if not exists alertas          jsonb  not null default ''[]''::jsonb',
      t);
    execute format(
      'alter table extracao.%I add constraint %I check (jsonb_typeof(alertas) = ''array'')',
      t, t || '_alertas_array');
  end loop;
end $$;

comment on column extracao.noticias.dados_brutos is 'Camada bruta: o que o site de origem tinha (chaves de HTML bruto no R2, imagem original, metadados soltos).';
comment on column extracao.noticias.campos_pendentes is 'Campos obrigatorios/uteis do PortalGov que o site nao fornece (ex.: categoria_id).';
comment on column extracao.noticias.alertas is 'Avisos da raspagem: [{"campo":"data_publicacao","aviso":"nao encontrada"}].';

-- 2. Fila de execucoes --------------------------------------------------------
alter table extracao.execucoes_raspagem
  drop constraint if exists execucoes_raspagem_status_check;
alter table extracao.execucoes_raspagem
  add constraint execucoes_raspagem_status_check
  check (status in ('pendente','em_andamento','concluida','falhou'));
alter table extracao.execucoes_raspagem
  add column if not exists parametros jsonb not null default '{}'::jsonb;

-- 3. Fonte (site antigo) por organizacao -------------------------------------
create table extracao.fontes_municipio (
  organizacao_id uuid primary key references plataforma.organizacoes(id) on delete cascade,
  slug           text not null unique,
  nome           text not null,
  url_base       text not null check (url_base ~ '^https?://[^/]+$'),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);

create trigger fontes_municipio_atualizado_em
  before update on extracao.fontes_municipio
  for each row execute function extracao.tocar_atualizado_em();

alter table extracao.fontes_municipio enable row level security;
create policy fontes_municipio_select on extracao.fontes_municipio
  for select to authenticated
  using (
    (select plataforma.tem_acesso('extracao'))
    and (organizacao_id = (select plataforma.org_atual('extracao'))
         or (select plataforma.eh_papel_de_plataforma('extracao')))
  );

revoke all on extracao.fontes_municipio from public, anon, authenticated;
grant select on extracao.fontes_municipio to authenticated;
grant all on extracao.fontes_municipio to service_role;

insert into extracao.fontes_municipio (organizacao_id, slug, nome, url_base)
select o.id, o.slug, o.nome, 'https://www.aracati.ce.gov.br'
from plataforma.organizacoes o
where o.slug = 'aracati'
on conflict (organizacao_id) do nothing;
