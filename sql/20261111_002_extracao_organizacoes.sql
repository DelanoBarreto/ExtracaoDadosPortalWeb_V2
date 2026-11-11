-- Rodar no PortalGov-Producao (SQL Editor). Idempotente: pode rodar mais de uma vez.
-- Somente LE o catalogo_municipios; nao altera essa tabela.

-- 1) Cria a organizacao Pentecoste usando os dados do catalogo
insert into plataforma.organizacoes (slug, nome, codigo)
select c.slug, c.nome, c.codigo
from plataforma.catalogo_municipios c
where c.slug = 'pentecoste'
on conflict (slug) do nothing;

-- 2) Assinatura do sistema "extracao" para Aracati e Pentecoste
insert into plataforma.assinaturas (organizacao_id, sistema)
select o.id, 'extracao'
from plataforma.organizacoes o
where o.slug in ('aracati', 'pentecoste')
on conflict (organizacao_id, sistema) do nothing;

-- 3) Conferencia: deve mostrar 3 linhas
select o.slug, o.nome, o.codigo, a.sistema, a.status
from plataforma.organizacoes o
left join plataforma.assinaturas a on a.organizacao_id = o.id
where o.slug in ('aracati', 'pentecoste')
order by o.slug, a.sistema;
