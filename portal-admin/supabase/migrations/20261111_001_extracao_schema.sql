-- =============================================================================
-- Migration: schema `extracao` no PortalGov-Producao
-- Papel: area de preparacao. Dados raspados entram como 'a_revisar' e, apos
-- revisao/aprovacao, sao PROMOVIDOS para portalgov.* (etapa posterior).
--
-- Padrao seguido: o mesmo do schema `tce`
--   * sistema registrado em plataforma.sistemas + papeis proprios
--   * tenant = plataforma.organizacoes (coluna organizacao_id)
--   * RLS com plataforma.tem_acesso / org_atual / eh_papel_de_plataforma
--   * authenticated so LE; escrita apenas pelo servidor (service_role),
--     conforme regra Lion Lab 01 (sem escrita direta do frontend)
--   * arquivos no Cloudflare R2 privado: o banco guarda a CHAVE do objeto
--
-- Nao cria organizacoes/assinaturas (feito na etapa de copia de dados).
-- =============================================================================

begin;

-- 1. Registro do sistema e papeis --------------------------------------------
insert into plataforma.sistemas (chave, nome, status)
values ('extracao', 'Extracao de Dados (preparacao)', 'ativo')
on conflict (chave) do nothing;

insert into plataforma.papeis (sistema, papel, nivel_plataforma, descricao) values
  ('extracao', 'superadmin',   true,  'Opera todos os municipios e executa raspagens'),
  ('extracao', 'tenant_admin', false, 'Administra a preparacao de um municipio e promove dados'),
  ('extracao', 'editor',       false, 'Revisa e corrige dados raspados'),
  ('extracao', 'viewer',       false, 'Somente leitura')
on conflict (sistema, papel) do nothing;

-- 2. Schema ------------------------------------------------------------------
create schema if not exists extracao;
revoke all on schema extracao from public, anon;
grant usage on schema extracao to authenticated, service_role;

create or replace function extracao.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- 3. Log de execucoes de raspagem --------------------------------------------
create table extracao.execucoes_raspagem (
  id              uuid primary key default gen_random_uuid(),
  organizacao_id  uuid not null references plataforma.organizacoes(id) on delete cascade,
  modulo          text not null check (modulo in ('noticias','secretarias','gestores','lrf','portarias','decretos')),
  status          text not null default 'em_andamento' check (status in ('em_andamento','concluida','falhou')),
  iniciado_em     timestamptz not null default now(),
  finalizado_em   timestamptz,
  itens_lidos     integer not null default 0 check (itens_lidos >= 0),
  itens_novos     integer not null default 0 check (itens_novos >= 0),
  itens_erro      integer not null default 0 check (itens_erro >= 0),
  erro_resumo     text,
  iniciado_por    uuid references auth.users(id) on delete set null
);

-- 4. Tabelas de conteudo -----------------------------------------------------
-- Colunas comuns de preparacao (em todas):
--   situacao: a_revisar (padrao ao importar) | em_revisao | aprovado | promovido | descartado
--   url_original: origem no portal antigo (chave de idempotencia por municipio)
--   execucao_id, promovido_em, promovido_para_id, auditoria

create table extracao.noticias (
  id                 uuid primary key default gen_random_uuid(),
  organizacao_id     uuid not null references plataforma.organizacoes(id) on delete cascade,
  titulo             text not null,
  resumo             text,
  conteudo_html      text,
  imagem_key         text,
  autor              text,
  categoria          text,
  data_publicacao    date,
  url_original       text,
  situacao           text not null default 'a_revisar' check (situacao in ('a_revisar','em_revisao','aprovado','promovido','descartado')),
  observacao_revisao text,
  execucao_id        uuid references extracao.execucoes_raspagem(id) on delete set null,
  promovido_em       timestamptz,
  promovido_para_id  uuid,
  criado_em          timestamptz not null default now(),
  criado_por         uuid references auth.users(id) on delete set null,
  atualizado_em      timestamptz not null default now(),
  atualizado_por     uuid references auth.users(id) on delete set null
);

create table extracao.secretarias (
  id                  uuid primary key default gen_random_uuid(),
  organizacao_id      uuid not null references plataforma.organizacoes(id) on delete cascade,
  nome                text not null,
  responsavel_nome    text,
  responsavel_cargo   text,
  email               text,
  telefone            text,
  horario_atendimento text,
  endereco            text,
  cnpj                text,
  biografia           text,
  funcoes             text,
  foto_key            text,
  exercicio           integer check (exercicio is null or exercicio between 2000 and 2100),
  data_publicacao     date,
  url_original        text,
  situacao            text not null default 'a_revisar' check (situacao in ('a_revisar','em_revisao','aprovado','promovido','descartado')),
  observacao_revisao  text,
  execucao_id         uuid references extracao.execucoes_raspagem(id) on delete set null,
  promovido_em        timestamptz,
  promovido_para_id   uuid,
  criado_em           timestamptz not null default now(),
  criado_por          uuid references auth.users(id) on delete set null,
  atualizado_em       timestamptz not null default now(),
  atualizado_por      uuid references auth.users(id) on delete set null
);

create table extracao.gestores (
  id                 uuid primary key default gen_random_uuid(),
  organizacao_id     uuid not null references plataforma.organizacoes(id) on delete cascade,
  nome               text not null,
  cargo              text not null check (cargo in ('PREFEITO(A)','VICE-PREFEITO(A)')),
  data_inicio        date,
  data_fim           date,
  is_atual           boolean not null default false,
  foto_key           text,
  exercicio          integer check (exercicio is null or exercicio between 2000 and 2100),
  url_original       text,
  situacao           text not null default 'a_revisar' check (situacao in ('a_revisar','em_revisao','aprovado','promovido','descartado')),
  observacao_revisao text,
  execucao_id        uuid references extracao.execucoes_raspagem(id) on delete set null,
  promovido_em       timestamptz,
  promovido_para_id  uuid,
  criado_em          timestamptz not null default now(),
  criado_por         uuid references auth.users(id) on delete set null,
  atualizado_em      timestamptz not null default now(),
  atualizado_por     uuid references auth.users(id) on delete set null,
  check (data_fim is null or data_inicio is null or data_fim >= data_inicio)
);

create table extracao.lrf (
  id                 uuid primary key default gen_random_uuid(),
  organizacao_id     uuid not null references plataforma.organizacoes(id) on delete cascade,
  titulo             text not null,
  tipo               text,
  ano                integer check (ano is null or ano between 2000 and 2100),
  competencia        text,
  data_publicacao    date,
  arquivo_key        text,
  anexos             jsonb not null default '[]'::jsonb check (jsonb_typeof(anexos) = 'array'),
  url_original       text,
  situacao           text not null default 'a_revisar' check (situacao in ('a_revisar','em_revisao','aprovado','promovido','descartado')),
  observacao_revisao text,
  execucao_id        uuid references extracao.execucoes_raspagem(id) on delete set null,
  promovido_em       timestamptz,
  promovido_para_id  uuid,
  criado_em          timestamptz not null default now(),
  criado_por         uuid references auth.users(id) on delete set null,
  atualizado_em      timestamptz not null default now(),
  atualizado_por     uuid references auth.users(id) on delete set null
);

create table extracao.portarias (
  id                 uuid primary key default gen_random_uuid(),
  organizacao_id     uuid not null references plataforma.organizacoes(id) on delete cascade,
  numero             text not null,
  data_portaria      date,
  ano                integer check (ano is null or ano between 2000 and 2100),
  tipo               text,
  agente             text,
  cargo              text,
  secretaria         text,
  detalhamento       text,
  arquivo_key        text,
  url_original       text,
  situacao           text not null default 'a_revisar' check (situacao in ('a_revisar','em_revisao','aprovado','promovido','descartado')),
  observacao_revisao text,
  execucao_id        uuid references extracao.execucoes_raspagem(id) on delete set null,
  promovido_em       timestamptz,
  promovido_para_id  uuid,
  criado_em          timestamptz not null default now(),
  criado_por         uuid references auth.users(id) on delete set null,
  atualizado_em      timestamptz not null default now(),
  atualizado_por     uuid references auth.users(id) on delete set null
);

create table extracao.decretos (
  id                 uuid primary key default gen_random_uuid(),
  organizacao_id     uuid not null references plataforma.organizacoes(id) on delete cascade,
  numero             text not null,
  data_decreto       date,
  ano                integer check (ano is null or ano between 2000 and 2100),
  tipo               text default 'Municipal',
  ementa             text,
  arquivo_key        text,
  url_original       text,
  situacao           text not null default 'a_revisar' check (situacao in ('a_revisar','em_revisao','aprovado','promovido','descartado')),
  observacao_revisao text,
  execucao_id        uuid references extracao.execucoes_raspagem(id) on delete set null,
  promovido_em       timestamptz,
  promovido_para_id  uuid,
  criado_em          timestamptz not null default now(),
  criado_por         uuid references auth.users(id) on delete set null,
  atualizado_em      timestamptz not null default now(),
  atualizado_por     uuid references auth.users(id) on delete set null
);

-- 5. Indices, triggers, RLS e grants (iguais para as tabelas de conteudo) ----
do $$
declare
  t text;
begin
  foreach t in array array['noticias','secretarias','gestores','lrf','portarias','decretos'] loop
    -- idempotencia da raspagem: mesma origem nao entra duas vezes no municipio
    execute format('create unique index %1$s_origem_unica on extracao.%1$I (organizacao_id, url_original) where url_original is not null', t);
    execute format('create index %1$s_fila_revisao on extracao.%1$I (organizacao_id, situacao)', t);
    execute format('create index %1$s_execucao on extracao.%1$I (execucao_id) where execucao_id is not null', t);
    execute format('create trigger %1$s_atualizado_em before update on extracao.%1$I for each row execute function extracao.tocar_atualizado_em()', t);

    execute format('alter table extracao.%I enable row level security', t);
    execute format($p$
      create policy %1$s_select on extracao.%1$I
        for select to authenticated
        using (
          (select plataforma.tem_acesso('extracao'))
          and (organizacao_id = (select plataforma.org_atual('extracao'))
               or (select plataforma.eh_papel_de_plataforma('extracao')))
        )$p$, t);
  end loop;
end $$;

create index execucoes_raspagem_org on extracao.execucoes_raspagem (organizacao_id, iniciado_em desc);
alter table extracao.execucoes_raspagem enable row level security;
create policy execucoes_raspagem_select on extracao.execucoes_raspagem
  for select to authenticated
  using (
    (select plataforma.tem_acesso('extracao'))
    and (organizacao_id = (select plataforma.org_atual('extracao'))
         or (select plataforma.eh_papel_de_plataforma('extracao')))
  );

-- 6. Painel: contagem por modulo/situacao (substitui tab_dashboard_totals) ----
create view extracao.resumo_revisao
with (security_invoker = true) as
  select organizacao_id, 'noticias'::text as modulo, situacao, count(*)::int as quantidade from extracao.noticias group by 1,3
  union all select organizacao_id, 'secretarias', situacao, count(*)::int from extracao.secretarias group by 1,3
  union all select organizacao_id, 'gestores',    situacao, count(*)::int from extracao.gestores    group by 1,3
  union all select organizacao_id, 'lrf',         situacao, count(*)::int from extracao.lrf         group by 1,3
  union all select organizacao_id, 'portarias',   situacao, count(*)::int from extracao.portarias   group by 1,3
  union all select organizacao_id, 'decretos',    situacao, count(*)::int from extracao.decretos    group by 1,3;

-- 7. Grants: authenticated so le (RLS filtra); escrita so via servidor -------
revoke all on all tables in schema extracao from public, anon, authenticated;
grant select on all tables in schema extracao to authenticated;
grant all on all tables in schema extracao to service_role;
revoke all on function extracao.tocar_atualizado_em() from public, anon, authenticated;

commit;
