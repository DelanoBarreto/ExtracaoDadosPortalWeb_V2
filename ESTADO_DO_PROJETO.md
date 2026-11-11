# ESTADO DO PROJETO — Extração de Dados & Portal Admin (PortalGov)

> **Arquivo de retomada.** Leia a seção 1 para saber onde paramos e qual é o próximo passo.
> Atualizado em: 2026-11-11 (fim da sessão 1). Atualize ao final de TODA sessão (seção 1, checklist e diário).
> Para abrir um chat novo: use o texto da seção 11.

---

## 1. ONDE PARAMOS (leia primeiro)

**Fase atual:** Fase 1 — fundação pronta (schema `extracao` no Producao + R2). Estamos entrando na **análise de lacunas de 3 lados** (site de Aracati x PortalGov x crawlers), que define os ajustes no `extracao` e nos crawlers.

**Próximo passo (1 ação):** trazer para esta máquina o **código atualizado do PortalGov** (a versão mais nova está na VPS; a daqui está desatualizada) e então montar a **matriz de lacunas** por área. O banco `portalgov` (Producao) já está atualizado e foi lido; o que falta é o código (telas/rotas do admin e do front), que mostra os campos realmente usados.

**Depende do responsável:**
1. Dar `git push` do PortalGov na VPS e informar o repositório/pasta (ou outra forma de copiar). É o único bloqueio da matriz.
2. ~~Plano Workers Paid~~ — **respondido:** conta Cloudflare Free, sem assinar agora (sem clientes ainda). A extração roda na VPS/local (D10, D11).
3. Mais adiante: quais menus do site de Aracati contam como "texto" (prefeitura, serviços, cidade etc.) para entrarem na importação.
4. Habilitar `extracao` em **Exposed schemas** quando os crawlers estiverem prontos para gravar (seção 4, passo a passo).

**Objetivo real da extração (palavras do responsável):** quando o novo PortalGov for ao ar, ele não pode ir vazio. Raspar o site atual de Aracati (www.aracati.ce.gov.br) para que o portal entre no ar com os mesmos dados do site antigo, sem alimentar do zero. O PortalGov novo é uma réplica melhorada do site de Aracati (campos do admin e do público devem ser equivalentes, com melhorias de estrutura a avaliar). Falta avaliar o que falta ou sobra em cada área, **comparando os dois lados** e apontando as diferenças; os crawlers devem seguir os dois. **Todas as áreas são prioridade para o go-live.**

---

## 2. DECISÕES TOMADAS (resumo, valem para todas as sessões)

| # | Decisão | Origem |
|---|---|---|
| D1 | Papéis do sistema `extracao` iguais ao `tce`: `superadmin`, `tenant_admin`, `editor`, `viewer` | 2026-11-11 |
| D2 | `extracao` = **área de preparação**; dados entram como `a_revisar` e depois são **promovidos** para `portalgov.*` | 2026-11-11 |
| D3 | Buckets R2 **privados** (`extracao-staging`, `extracao-prod`), sem domínio público nem CDN; banco guarda a **chave** do objeto, não URL; acesso por URL pré-assinada gerada no servidor | 2026-11-11 |
| D4 | Nada deste sistema no Supabase Storage | 2026-11-11 |
| D5 | **Não copiar** dados nem arquivos do PortalGov-Dados (eram de teste); tudo é raspado de novo. Só o esquema migrou | 2026-11-11 |
| D6 | `plataforma.catalogo_municipios` é referência **somente leitura**: nunca alterar | 2026-11-11 |
| D7 | **Estratégia do extrator: híbrido em camadas** (ver 2.1) | 2026-11-11 |
| D8 | **Promoção** para o PortalGov: **só o superadmin**, **por módulo**, disparada no sistema Extração, que chama uma **função do banco do lado do PortalGov** (o dono do destino define as regras de entrada). Nada entra publicado: entra como `draft`/`review` com marca de origem; publicar continua no fluxo normal do PortalGov | 2026-11-11 |
| D9 | **Raspagem manual** (botão do superadmin por município e módulo), **sem cron**. Botão extra "Comparar com o site" mostra só as diferenças desde a última raspagem | 2026-11-11 |
| D10 | **Hospedagem na Cloudflare para os sistemas de produção (PortalGov etc.).** A VPS existe para facilitar o desenvolvimento pelo celular. **Revisado em 2026-11-11:** a conta Cloudflare é **Free** e o responsável **não vai assinar o Workers Paid agora** (ainda não há cliente). Por isso **a ferramenta de extração (painel + crawlers) roda na VPS/máquina local**, não em Workers/Workflows. O R2 (Free) continua sendo o armazenamento de arquivos. Migrar a ferramenta para a Cloudflare só se/quando houver receita para o Workers Paid | 2026-11-11 |
| D11 | **Crawlers continuam em Node.js** (Axios, Cheerio, Playwright), adaptados para gravar em `extracao.*` + R2. O botão **Raspar** do painel não executa a raspagem: grava um pedido em `extracao.execucoes_raspagem` (status `pendente`) e um **processo worker Node** (VPS/local) pega o pedido e executa. O núcleo do crawler fica em módulos TypeScript simples para poder virar Workflow depois | 2026-11-11 |

### 2.1 Híbrido em camadas (D7)
1. **Bruta:** guarda o que o site tem, sem interpretar: HTML, campos soltos em `dados_brutos jsonb`, arquivos no R2. Fonte da verdade, reprocessável sem raspar de novo.
2. **Mapeamento:** mapa por área `campo do site → campo do PortalGov` com regras de conversão (status vira `draft`, slug gerado do título etc.).
3. **Lacunas:** por item, `campos_pendentes` (obrigatórios do PortalGov que o site não fornece, ex.: `categoria_id`, `orgao_id`, `slug`) e `alertas` (campos do site que o PortalGov não tem). Dessa camada sai o relatório de diferenças pedido.
4. **Revisão e promoção:** `a_revisar → em_revisao → aprovado → promovido` (ou `descartado`).

Por que não só "raspar tudo" nem só "mapear já": o PortalGov ainda muda (acoplar o crawler a ele obriga a raspar de novo) e raspar sem olhar o destino só revela lacunas no dia da promoção.

### 2.2 Como a promoção funciona (D8)
- No Extração o superadmin escolhe município e módulo; vê prévia (aprovados, com lacunas, já promovidos) e clica **Importar para o PortalGov**.
- Função do banco `portalgov.importar_de_extracao(modulo, ids)` (**a criar**): confere `plataforma.eh_papel_de_plataforma('extracao')`, copia só `aprovado`, grava como rascunho com marca de origem, marca o item `promovido`, registra o lote.
- **Reaproveitar `portalgov.lotes_importacao`** (já existe: `id, organizacao_id, modulo, origem, observacao, criado_em, criado_por, desfeito_em`) para registrar lotes e permitir **desfazer um lote**. Ainda não existe função de importação no schema `portalgov`.
- Idempotência: chave `(organizacao_id, url_original)`. As tabelas do `portalgov` **não têm** coluna de URL original nem marca de origem (só `lotes_importacao` tem `origem`): avaliar adicionar uma coluna pequena por tabela (também serve de auditoria).
- A rota de API que chama a função valida a sessão (regra Lion Lab 01: sem escrita direta do front).

---

## 3. PROPOSTA DO SISTEMA

Colocar no ar o portal de um município novo sem digitar o conteúdo do zero:

1. **Raspagem:** crawlers leem o portal antigo.
2. **Preparação (`extracao`):** tudo entra como `a_revisar`, ligado à organização.
3. **Revisão no painel:** servidores/superadmin revisam, corrigem e aprovam.
4. **Promoção:** o superadmin importa por módulo para `portalgov.*`; a publicação segue o fluxo do PortalGov.

Perfis: superadmin (todos os municípios, raspagem e promoção), tenant_admin, editor, viewer.
Foco: transparência pública (LRF, decretos, portarias) em municípios pequenos com portais antigos.

---

## 4. INFRAESTRUTURA

### Supabase (plano Free: máx. 2 projetos ativos)
| Projeto | ID | Papel | Situação (2026-11-11) |
|---|---|---|---|
| PortalGov-Producao | `omcbfuiyaeakbsqbzgqk` | Banco do PortalGov e agora do `extracao`; schemas `portalgov` (58 tabelas), `plataforma`, `tce`, `extracao` | **Ativo** |
| Plataforma-Sistemas | `lwvwuhkwdrbmvwymbpwe` | Outro sistema | **Restaurado** (estava `COMING_UP`; conferir `ACTIVE_HEALTHY`) |
| PortalGov-Dados | `fppbzfnaknfpqucwjrhz` | Banco antigo deste sistema | **Pausado** (sem backup, por decisão do responsável). Não é mais necessário |
| ControleUPC, APITCE | `doqkxfqpwqiwkclxauwh`, `rjqyqbkwavuhwepekohr` | Outros sistemas | Pausados, não mexidos |

Atenção: no plano free, projeto pausado só pode ser restaurado por tempo limitado. O Dados não é mais necessário.

### Exposed schemas (explicação simples)
O Supabase só deixa programas de fora (admin e crawlers via API) conversarem com os schemas que estão numa **lista de permitidos**. `portalgov` já está; `extracao` é novo e **ainda não está**. Sem isso, o app não lê nem grava nele pelo Supabase. Não afeta a segurança: o RLS continua protegendo. Passo a passo (fazer quando os crawlers estiverem prontos): abrir https://supabase.com/dashboard/project/omcbfuiyaeakbsqbzgqk/settings/api → seção **Data API Settings** → **Exposed schemas** → adicionar `extracao` **sem remover os que já estão** → **Save**. Os GRANTs já estão na migration.

### Cloudflare
- **R2:** buckets `extracao-staging` e `extracao-prod` (privados). Padrão de nomes da conta: `-prod` / `-teste` / `-staging` (só minúsculas).
- Variáveis no `.env` da raiz (valores nunca em log): `Extracao_dados_R2_ACCOUNT_ID`, `_BUCKET` (= `extracao-staging`), `_ACCESS_KEY_ID`, `_SECRET_ACCESS_KEY`. **Ainda não estão no `portal-admin/.env.local`** (o Next lê o dele). Nunca `NEXT_PUBLIC_*`.
- Dentro de um Worker o R2 é um *binding* (não precisa das chaves). As chaves servem para URL pré-assinada fora do Worker (sugestão `aws4fetch`; checar regra Lion Lab 09 e `npm audit` antes).
- Acesso a arquivos: rota de API valida sessão e tenant e devolve URL pré-assinada curta (5–15 min) ou faz stream. Upload: só pelo servidor, validando tipo e tamanho.
- Documentos que o portal público precisa mostrar (LRF, decretos, portarias publicados) não podem depender de bucket público: o `portalgov` serve por rota própria que só entrega objetos de registros publicados (etapa de promoção).

### Por que a extração NÃO roda na Cloudflare por enquanto (plano Free, conferido na documentação em 2026-11-11)
- Workers Free: **10 ms de CPU por requisição**, **50 chamadas externas (subrequests) por execução**, 100.000 requisições/dia. Next.js com renderização no servidor costuma estourar os 10 ms (a própria documentação diz que SSR geralmente precisa do Workers Paid).
- Workflows Free: **1.024 passos por instância**, **3.000 passos por dia**, 10 ms de CPU por invocação, retenção de logs de 3 dias. Raspar um site inteiro (milhares de páginas e PDFs) não cabe.
- Browser Run Free: **10 minutos por dia**, 3 navegadores simultâneos, timeout de 60 s.
- Conclusão: a raspagem fica em Node na VPS/máquina local (sem esses limites e sem custo). O Workers Paid continua a opção quando houver cliente.

### Arquitetura de execução na Cloudflare (referência para quando houver Workers Paid; hoje NÃO usada) (D9, D10)
| Necessidade | Recurso | Fato relevante |
|---|---|---|
| Raspagem longa | **Workflows** | Cada passo roda sem limite de tempo de relógio; instância pode durar horas/dias; falha refaz só o passo; limite de chamadas externas por instância: 10.000 no pago, 50 no gratuito |
| Fila de itens | **Queues** | Consumidor até 15 min; lote até 100 mensagens |
| Cron (não usado, D9) | Cron Trigger / `schedules` no Workflow | 15 min por execução; dá para ligar depois com uma linha no `wrangler.jsonc` |
| Sites com JavaScript | **Browser Run** (antigo Browser Rendering) | Playwright/Puppeteer adaptados para Workers; pago: 10 h/mês incluídas, 120 navegadores simultâneos; gratuito: 10 min/dia. Preferir Axios+Cheerio (sem navegador) sempre que possível |
| Painel admin | Next.js via **OpenNext** na Cloudflare | Playwright não roda em Workers comum |
| Arquivos | **R2** | binding no Worker |

Fluxo: botão **Raspar** (superadmin) → Workflow → passo 1 lista páginas → um passo por item (baixa, grava no R2, grava linha em `extracao.*` como `a_revisar` com `dados_brutos`/`campos_pendentes`) → atualiza `execucoes_raspagem`. Bloqueio de duas raspagens simultâneas por município/módulo (olhar `em_andamento`).
Supabase `pg_cron` serve só para manutenção no banco (não para raspar).

### Ambientes
- Desenvolvimento: esta máquina e a VPS (para trabalhar pelo celular). **O PortalGov mais novo está na VPS**; o daqui está desatualizado.
- Cuidado: dev e VPS usam o mesmo Supabase Producao; separar por variável de ambiente para um teste local não disparar raspagem real (regra Lion Lab 13).

---

## 5. O QUE JÁ EXISTE NO BANCO (Producao, lido em 2026-11-11)

### Schema `extracao` (migration aplicada, `portal-admin/supabase/migrations/20261111_001_extracao_schema.sql`)
- Registra sistema `extracao` + papéis em `plataforma`.
- Tabelas: `execucoes_raspagem`, `noticias`, `secretarias`, `gestores`, `lrf`, `portarias`, `decretos` — todas com `organizacao_id` (FK `plataforma.organizacoes`), `situacao` (`a_revisar|em_revisao|aprovado|promovido|descartado`), `observacao_revisao`, `execucao_id`, `promovido_em`, `promovido_para_id`, auditoria, `url_original` (índice único por organização). Colunas `*_key` guardam a chave do R2.
- RLS por tenant com `plataforma.tem_acesso/org_atual/eh_papel_de_plataforma('extracao')`; `authenticated` só lê, escrita só pelo servidor (`service_role`); anon sem acesso. View `extracao.resumo_revisao` (`security_invoker`). Advisors sem alertas para `extracao`.
- **Vazio** (por isso ajustar agora é barato).
- Organizações/assinaturas (`sql/20261111_002_extracao_organizacoes.sql`, rodado manualmente pelo responsável): organização **Pentecoste** criada a partir do catálogo; assinatura `extracao` para Aracati e Pentecoste. Aracati/portalgov já existia desde 2026-08-29 (não foi alterada).

### Schema `portalgov` (58 tabelas, lido por catálogo)
Grupos: **notícias** (`noticias`, `categorias_noticia`), **órgãos/gestores** (`orgaos`, `orgao_gestores`, `orgao_exercicios`, `gestores`, `dirigentes`, `unidades`), **páginas de texto** (`paginas_e_links`: chave, tipo, titulo, resumo, corpo, url, status; `cidade_conteudo`: sobre, historia, bioma, clima, fatos, linha_do_tempo etc.; `simbolos`, `glossario_termos`, `faq_perguntas`), **serviços** (`servicos`, `categorias_servico`, `atendimento_central`, `atendimento_municipio`), **atos** (`atos`, `atos_anexos`, `tipos_ato`), **fiscal/LRF** (`documentos_fiscais`, `tipos_documento_fiscal`), **licitações** (`licitacoes` + 6 tabelas filhas, `documentos_licitatorios`, `avisos_lei_14133`), **contratos** (`contratos`, `contratos_documentos`, `contratos_fiscais`), **obras** (`obras` + 6 filhas), **pessoal** (`estagiarios`, `terceirizados`, `selecoes_pessoal`, `selecao_pessoal_arquivos`, `declaracoes_pessoal`, `diarias`, `diarias_valores`, `veiculos`), **conselhos** (`conselhos`, `conselho_membros`, `conselho_registros`), outros (`parcerias`, `sancoes_*`, `municipios`, `verificacoes_conteudo`).
- **`lotes_importacao`** já existe (mecanismo de lote e desfazer) — ver 2.2.
- Nenhuma tabela do PortalGov tem coluna `url_original`/marca de origem (só `lotes_importacao.origem`).
- Funções: nenhuma função de importação em `portalgov` ainda.
- Mapeamento exemplo já visto: `portalgov.noticias` usa `corpo_html`, `imagem_capa_url`, `slug`, `categoria_id`, `orgao_id`, status `draft/review/published/archived`; `portalgov.gestores` tem `nome`, `foto_url`, `observacao`, `organizacao_id`.

### Lacuna já identificada
O `extracao` só tem 6 módulos de conteúdo. Faltam tabelas de preparação para as **páginas/menus de texto** (prefeitura, serviços, cidade, órgãos, conselhos, FAQ, glossário, símbolos etc.) e para as áreas do PortalGov sem crawler (licitações, contratos, obras, pessoal...). A matriz de lacunas dirá quais entram.

### Modelo multi-tenant do Producao
- `plataforma.sistemas` (`portalgov`, `tce`, agora `extracao`), `plataforma.organizacoes` (Aracati, Fortaleza, Pentecoste; `codigo` liga ao catálogo), `plataforma.papeis`, `plataforma.usuarios_sistema`, `plataforma.assinaturas`.
- Funções de RLS (`SECURITY DEFINER`, `search_path = ''`): `plataforma.tem_acesso/org_atual/papel_atual/eh_papel_de_plataforma(sistema)`.
- `plataforma.catalogo_municipios`: 184 municípios do Ceará (`codigo` PK 3 dígitos, `slug`, `nome`, `uf`). **Somente leitura.**
- `portalgov.criar_organizacao` exige usuário logado com papel de plataforma e cria também assinatura `portalgov`; por isso Pentecoste foi criada por INSERT direto + assinatura só do `extracao` (opção B).

### Inventário antigo do PortalGov-Dados (referência histórica)
Tabelas `tab_*` (municipios, noticias, lrf, secretarias, gestores, portarias, decretos, atos_oficiais vazia, dashboard_totals), ~70 linhas de teste, bucket público `arquivos_municipais` com 55 objetos/508 MB. **Nada copiado (D5).** Segurança: S1 (`exec_sql` executável pelo `anon`) foi **corrigida** com REVOKE em 2026-11-11 e o banco está pausado; S2 (políticas abertas) e S3 (bucket público) ficam no banco pausado, não copiadas; S4 (`status` sem CHECK) resolvida no `extracao`.

---

## 6. ESTADO DO CÓDIGO (git: `main`, remoto `origin` = github.com/DelanoBarreto/ExtracaoDadosPortalWeb_V2)

| Módulo | Estado |
|---|---|
| Notícias, Secretarias, Gestores | Prontos, com raspagem |
| LRF / PCG, Portarias, Decretos | Implementados (Decretos é o mais recente) |
| Municípios, Scraper, AI Generator, Configurações, Dashboard | Telas existem; funcionamento real não verificado |

Stack: `portal-admin` (Next.js 16.2.4 Turbopack, React 19.2.4, Tailwind 4, TanStack Query/Table, Zustand, @supabase/ssr) + `crawlers/` (Node.js, Axios, Cheerio, Playwright) + `scripts/` de diagnóstico.
Rodar local: `cd portal-admin && npm run dev` → http://localhost:3000. **Atenção:** `portal-admin/AGENTS.md` avisa que este Next.js tem mudanças incompatíveis; ler `node_modules/next/dist/docs/` antes de escrever código Next. Convenção `middleware` está obsoleta → `proxy` (já existe `proxy.ts`).
**O `.env.local` do portal-admin ainda aponta para o PortalGov-Dados (pausado).** O app local só volta a funcionar depois de apontar para o Producao.

Pendências técnicas: sem testes automatizados; dois `package-lock.json` (aviso `turbopack.root`); `npm audit`/`npm outdated` não rodados; docs antigos (`docs/PLAN.md`, `docs/MASTER_CONTEXT.md` cita Next 14, `docs/CHECKLIST_NOVO.md` genérico).

Regras do projeto (resumo): Lion Lab (`.claude/rules/lion-lab/`): sem Service Role em `/app` ou `/components`; sem escrita direta do front no Supabase (tudo por `/api/*` com sessão); `company_id`/`organizacao_id` sempre da sessão; RLS em toda tabela nova; segredos criptografados e nunca em log; testes primeiro; Conventional Commits; API REST consistente (rule 11); ambientes isolados (rule 13). Padrão de UI: `docs/PADRAO_V4_ELITE.md`.

---

## 7. O QUE AINDA FALTA FAZER (em ordem)

### Bloco A — Análise e desenho (próximo)
- [ ] **A1.** Receber o código atualizado do PortalGov (VPS → Git → esta máquina). *Depende do responsável.*
- [ ] **A2.** **Matriz de lacunas (3 lados)** por área: existe no site de Aracati? existe no PortalGov (tabela/tela)? campos que faltam/sobram em cada lado? existe crawler? Incluir **menus de texto** e áreas sem crawler. Só leitura (navegar o site, ler `portalgov`, ler `crawlers/`).
- [ ] **A3.** Decidir com o responsável, por lacuna: PortalGov ganha o campo / crawler preenche padrão / fica "preencher na revisão".
- [~] **A4 — parcialmente feito:** migration `20261111_003_extracao_camadas_e_fontes.sql` APLICADA (`dados_brutos`, `campos_pendentes`, `alertas` nas 6 tabelas; status `pendente` + `parametros` em `execucoes_raspagem`; tabela `extracao.fontes_municipio` com a URL de Aracati). **Falta** criar as tabelas dos módulos novos (páginas de texto etc.) após a matriz. Texto original: Ajustar o `extracao` (migration nova): `dados_brutos jsonb`, `campos_pendentes text[]`, `alertas jsonb` nas tabelas; criar tabelas dos módulos que faltam (páginas de texto etc.). Tabelas vazias: custo baixo.

### Bloco B — Crawlers e arquivos
- [ ] **B1.** Habilitar `extracao` em Exposed schemas (painel; seção 4). *Depende do responsável.*
- [~] **B2 — FEITO em 2026-11-11 (etapas 1, 2 e 4):** `.env` (raiz) e `portal-admin/.env.local` agora apontam para o **Producao** (chaves copiadas de `docs/.env.localteste`, vindas do sistema PortalGov; backups ignorados em `.env.dados.bak` e `portal-admin/.env.local.dados.bak`); `SUPABASE_DB_SCHEMA=extracao`. Criado `portal-admin/src/lib/supabase-env.ts` (config única, aceita nomes novos e legados das chaves) e os 3 clientes do Next + `src/lib/supabase-bot.js` usam schema `extracao`. Travas: `assertDestructiveAllowed` em `supabase-bot.js` (exige `ALLOW_DESTRUCTIVE=1` e fora de produção), `scripts/reset-db.js` reescrito com a trava, rota `api/admin/clear-data` desativada (exige `ALLOW_DESTRUCTIVE_ROUTES=true`). Verificado: chave secreta lê `portalgov.orgaos` (85 linhas); `extracao.*` responde 406 = **falta Exposed schemas (B1)**. `tsc` do portal-admin: 7 erros, **todos já existiam antes** (nenhum novo). **Falta:** etapa 3 (reescrever a camada de dados `tab_*`→`extracao.*`, módulo a módulo, piloto notícias), etapa 5 (B1) e etapa 6 (usuário superadmin com papel `extracao`). Até a etapa 3, as telas/rotas que usam `tab_*` **não funcionam** (o banco antigo está pausado de qualquer forma). Registro original do levantamento: Apontar tudo para o Producao com `db: { schema: 'extracao' }`; levar variáveis R2 ao servidor (nunca `NEXT_PUBLIC_*`). **Levantamento (2026-11-11):** `.env` e `portal-admin/.env.local` apontam para o Dados (`fppb...`, pausado) e as chaves service_role de lá não servem no Producao. ~89 arquivos usam Supabase; o `portal-admin` usa `tab_*` + `municipio_id` (muitas rotas aceitam `municipio_id` pela URL, contra a regra Lion Lab 03) e Storage `arquivos_municipais`. **Trocar só o `.env` quebra o app.** Ordem segura: (1) neutralizar o que apaga dados (`scripts/reset-db.js`, `api/admin/clear-data`, `scripts/alter-db.js`) antes de qualquer apontamento ao Producao; (2) módulo único de cliente Supabase com schema `extracao`; (3) reescrever a camada de dados módulo a módulo (`tab_X`→`extracao.X`, `municipio_id`→`organizacao_id` vindo da sessão, `status`→`situacao`, Storage→R2), piloto notícias; (4) chaves do Producao (anon + service_role) no `.env.local` pelo responsável; (5) Exposed schemas (B1); (6) usuário superadmin com papel `extracao` em `plataforma.usuarios_sistema`.
- [~] **B3 — PILOTO NOTÍCIAS FEITO E VERIFICADO (2026-11-11).** Crawler `crawlers/raspar-noticias-v2.js` reescrito (`--org=aracati --limit=N [--execucao_id=] [--dry]`): grava em `extracao.noticias` (`a_revisar`, `dados_brutos`, `campos_pendentes`, `alertas`), HTML bruto + imagem no R2 `extracao-staging` (chaves em `dados_brutos.html_key` e `imagem_key`), registra `execucoes_raspagem`, é idempotente (pula URL já preparada), pausa 400 ms entre páginas, guarda o corpo como HTML (antes era texto cortado em 5000). Novos: `src/lib/extracao-utils.js`, `src/lib/r2.js`, `src/services/extracao-service.js`, `tests/extracao-utils.test.js` (8 testes, `node --test tests/extracao-utils.test.js`). Dependência nova: `@aws-sdk/client-s3` (sem falhas no `npm audit`; as 8 falhas existentes são de axios/ws/etc.). Teste real contra o site de Aracati: 4 notícias preparadas, 4 HTML + 4 imagens confirmados no R2, 2 execuções fechadas. **Faltam:** os outros 5 crawlers (secretarias, gestores, lrf/pcg, portarias, decretos) no mesmo molde; worker que consome pedidos `pendente`; painel. Item original: Adaptar os crawlers Node existentes (D11: worker Node na VPS/local que consome pedidos `pendente` de `execucoes_raspagem`; incluir o status `pendente` no CHECK na migration A4; upload ao R2 pela API S3 com as chaves do servidor, conferir regra Lion Lab 09 antes de adicionar a biblioteca); gravar em `extracao.*` com `organizacao_id`, registrar `execucoes_raspagem`, subir arquivos ao R2 `extracao-staging`, gravar `*_key`. Piloto: **notícias**; depois as 5 áreas atuais; depois as áreas novas da matriz.
- [ ] **B4.** Rota de API de acesso a arquivos (URL pré-assinada curta, sessão + tenant) e upload pelo servidor (Lion Lab 01).
- [ ] **B5.** Teste de bloqueio: raspar uma página do site de Aracati a partir da Cloudflare (WAF/anti-bot) antes de investir nos crawlers.

### Bloco C — Painel e promoção
- [ ] **C1.** Painel do Extração: fila de revisão por módulo (usar `resumo_revisao`), edição, aprovação, botões **Raspar** e **Comparar com o site** (só superadmin), bloqueio de execução simultânea.
- [ ] **C2.** Função `portalgov.importar_de_extracao(modulo, ids)` + marca de origem/URL original nas tabelas do PortalGov + uso de `lotes_importacao` (incl. desfazer lote); rota de API que a chama.
- [ ] **C3.** Mapa `extracao → portalgov` por módulo (começando por notícias).

### Bloco D — Qualidade e publicação
- [ ] **D1.** Testes (Vitest + Playwright) do fluxo crítico (regra Lion Lab 10) e CI.
- [ ] **D2.** Zod nas rotas de API; tipos gerados do Supabase.
- [ ] **D3.** Publicar o painel e o worker de raspagem (hoje: VPS/local, pois a conta Cloudflare é Free e não será paga agora; ver D10). Migrar para Cloudflare (OpenNext + Workflows) só com Workers Paid.
- [ ] **D4.** Segunda raspagem comparativa antes do go-live (detecta o que mudou no site antigo durante o desenvolvimento).
- [ ] **D5.** Validar: contagem origem x destino, abrir 1 arquivo de cada módulo via URL pré-assinada, rodar advisors do Producao.
- [ ] **D6.** Limpeza: docs velhos (`PLAN.md`, `MASTER_CONTEXT.md`, `CHECKLIST_NOVO.md`), scripts `debug-*`.

### Concluído
- [x] Verificado repositório e app local (http://localhost:3000 subiu).
- [x] Inventário do PortalGov-Dados; S1 corrigida (REVOKE do `exec_sql`).
- [x] Buckets R2 `extracao-staging` e `extracao-prod` criados (privados); nome inválido no `.env` corrigido; teste de gravar/ler/apagar passou.
- [x] Migration do schema `extracao` aplicada no Producao.
- [x] Organização Pentecoste + assinaturas `extracao` (Aracati, Pentecoste).
- [x] PortalGov-Dados pausado; Plataforma-Sistemas restaurado.
- [x] Decisões D1–D10 (seção 2).
- [x] Levantamento inicial do `portalgov` (58 tabelas, `lotes_importacao`, `paginas_e_links`, `cidade_conteudo`) e estudo da documentação da Cloudflare.

---

## 8. BACKLOG DE MELHORIAS (proativo — preencher sempre que surgir algo)

- Descartar `tab_atos_oficiais` (vazia) se nenhum código a usa — verificar com busca no código.
- Unificar `status` num único CHECK/enum.
- Rodar `npm audit` e `npm outdated`; resolver avisos `middleware` → `proxy` e `turbopack.root`.
- Padronizar variáveis de R2 sem prefixo, em maiúsculas (`R2_ACCOUNT_ID` etc.), ao ligar no código.
- Relatório de diferenças (site x PortalGov) exportável (CSV) para o responsável revisar.
- Raspagem educada (limite de requisições, `User-Agent` identificado) para não sobrecarregar o site da prefeitura.
- **Segurança (adiada a pedido do responsável em 2026-11-11):** o repositório GitHub é **PÚBLICO**; 13 arquivos rastreados (`scripts/*.js`) têm uma chave `sb_secret_` escrita no código (de projeto não identificado; não coincide com as chaves atuais do `.env` nem do Producao) e deve ser considerada vazada → fazer rotação em Settings > API Keys dos projetos e remover do código. O `.gitignore` agora ignora `.env.*` e `**/.env.local*` (o `docs/.env.localteste` com chaves reais e senhas de teste não estava ignorado). Chaves do Producao e senhas de teste passaram pelo chat; rotacionar ao fim do desenvolvimento.
- Futuro: se cada prefeitura quiser importar o próprio site antigo sozinha, adicionar tela de importação no PortalGov por cima da mesma função do banco (a decisão D8 não fecha essa porta). Agendar raspagem = uma linha no `wrangler.jsonc`.

---

## 9. DIÁRIO DE SESSÕES

### 2026-11-11 (sessão 1)
- Verificado: git sincronizado; app roda local. `.env.local` apontava para o PortalGov-Dados, que estava pausado.
- Inventário do PortalGov-Dados; S1 (`exec_sql` aberta ao `anon`) corrigida com autorização.
- Criados buckets R2 `extracao-staging` e `extracao-prod`; corrigido nome inválido no `.env`.
- Lido o modelo multi-tenant do Producao; criada e aplicada a migration do schema `extracao` (D1, D2). Organização Pentecoste e assinaturas criadas (opção B).
- Responsável decidiu: buckets privados (D3); não copiar dados (D5); pausar o Dados e reativar o Plataforma-Sistemas (feito).
- Responsável explicou o objetivo real (go-live já com os dados do site antigo) → análise de lacunas de 3 lados.
- Decididos: híbrido em camadas (D7); promoção só do superadmin por módulo via função do banco (D8); raspagem manual sem cron (D9); tudo na Cloudflare, VPS só para desenvolvimento (D10).
- Descobertas: `portalgov.lotes_importacao` já existe; faltam tabelas de preparação para menus de texto; PortalGov local está desatualizado em relação à VPS.
- Documentação da Cloudflare consultada (Workflows, Cron Triggers, Queues, Browser Run).
- Responsável adiou segurança; `.env` e `.env.local` apontados para o Producao (chaves do `docs/.env.localteste`); clientes com schema `extracao`; travas contra apagar dados; Exposed schemas habilitado pelo responsável (verificado: 7 tabelas respondem 200).
- Piloto de notícias concluído (ver B3): migration 003, R2, crawler, testes; 4 notícias reais preparadas em `extracao.noticias`.
- Ainda NÃO enviado ao GitHub desde o commit `4fccb6e`: edições do ESTADO, `.gitignore`, clientes Supabase, travas, migration 003, crawler, libs, testes e `package.json`/lock.
- Estado do GitHub (público) com a chave vazada: ver backlog de segurança.
- **Próxima sessão começa em:** seção 1 → obter código do PortalGov → matriz de lacunas (A1/A2).

---

## 10. DOCUMENTOS DO REPOSITÓRIO
`README.md` (visão geral) · `docs/ARQUITETURA_ESTRATEGICA.md` (ecossistema) · `docs/MASTER_CONTEXT.md` (schema original, parcialmente desatualizado) · `docs/PADRAO_V4_ELITE.md` (padrão obrigatório de UI) · `CATALOGO-SKILLS.md` (skills de IA) · `sql/20261111_002_extracao_organizacoes.sql` (organizações e assinaturas) · `portal-admin/supabase/migrations/20261111_001_extracao_schema.sql` (schema `extracao`).

---

## 11. TEXTO PARA ABRIR UM CHAT NOVO
Cole isto no início do próximo chat:

> Leia o `ESTADO_DO_PROJETO.md` na raiz do repositório (seção 1 e seção 2) e continue de onde paramos. Atue como orquestrador proativo: ao fim de cada tarefa, atualize esse arquivo e feche com o próximo passo e o que depende de mim. Responda em português e me guie passo a passo nas telas dos painéis (com URL). O próximo passo é obter o código atualizado do PortalGov e montar a matriz de lacunas (site de Aracati x PortalGov x crawlers). Decisões já tomadas estão na seção 2; não reabra sem motivo.
