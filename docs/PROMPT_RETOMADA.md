# Retomada em outro computador

Este arquivo tem **duas partes**: (1) como preparar a máquina nova e (2) o prompt para colar no Claude Code.
O repositório é **público**: nenhum segredo está aqui nem deve ser colocado aqui.

---

## 1. Preparar a máquina nova

1. Clonar e entrar na pasta:
   ```bash
   git clone https://github.com/DelanoBarreto/ExtracaoDadosPortalWeb_V2.git
   cd ExtracaoDadosPortalWeb_V2
   ```
2. Instalar dependências (raiz = crawlers/scripts; `portal-admin` = painel):
   ```bash
   npm install
   cd portal-admin && npm install && cd ..
   ```
3. **Criar os arquivos de ambiente à mão** (eles NÃO vêm do Git). Copie os valores da máquina antiga por um meio seguro (gerenciador de senhas, pendrive) ou pegue no painel do Supabase/Cloudflare. Nunca por chat, e-mail ou commit.

   **`.env` (raiz)** — usado por crawlers e scripts:
   ```
   SUPABASE_URL=https://omcbfuiyaeakbsqbzgqk.supabase.co
   NEXT_PUBLIC_SUPABASE_URL=https://omcbfuiyaeakbsqbzgqk.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<painel Supabase > Settings > API Keys>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<mesma chave publishable>
   SUPABASE_SECRET_KEY=<painel Supabase > Settings > API Keys (secret)>
   SUPABASE_SERVICE_ROLE_KEY=<mesma chave secret>
   SUPABASE_DB_SCHEMA=extracao
   SESSION_SECRET=<igual ao da máquina antiga>
   ENCRYPTION_KEY=<igual ao da máquina antiga>
   APP_ENV=development
   Extracao_dados_R2_ACCOUNT_ID=<Cloudflare > R2 > visão geral>
   Extracao_dados_R2_BUCKET=extracao-staging
   Extracao_dados_R2_ACCESS_KEY_ID=<Cloudflare > R2 > Manage API tokens>
   Extracao_dados_R2_SECRET_ACCESS_KEY=<idem>
   ```
   **`portal-admin/.env.local`** — usado pelo painel Next.js: as mesmas variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_SCHEMA`, `SESSION_SECRET`, `ENCRYPTION_KEY`, `APP_ENV`.

   Projeto Supabase: **PortalGov-Producao** (`omcbfuiyaeakbsqbzgqk`). Painel das chaves: https://supabase.com/dashboard/project/omcbfuiyaeakbsqbzgqk/settings/api-keys
4. Conferir que funciona:
   ```bash
   node --test tests/extracao-utils.test.js                       # 8 testes devem passar
   node crawlers/raspar-noticias-v2.js --org=aracati --limit=2 --dry   # lê o site, não grava
   ```
5. (Opcional) Se o Claude Code usar MCPs: reconectar Supabase e Cloudflare na conta.

> Segurança pendente (adiada pelo responsável): o repositório é público e 13 arquivos em `scripts/` têm uma chave `sb_secret_` escrita no código. Tratar como vazada: rotacionar as chaves nos projetos Supabase e tirar do código. Detalhes no `ESTADO_DO_PROJETO.md` (backlog).

---

## 2. Prompt para colar no Claude Code (na pasta do projeto)

```
Leia o ESTADO_DO_PROJETO.md na raiz do repositório (seção 1, seção 2 e seção 7) e continue de onde paramos.

Contexto em uma frase: estou construindo um sistema de extração que raspa o site antigo da prefeitura de Aracati (www.aracati.ce.gov.br) para uma área de preparação (schema `extracao`, no Supabase PortalGov-Producao + arquivos no Cloudflare R2 privado), para que o novo PortalGov já entre no ar com os dados do site antigo; depois só o superadmin promove os dados, por módulo, para o schema `portalgov`.

Atue como orquestrador proativo: ao fim de cada tarefa atualize o ESTADO_DO_PROJETO.md e feche com o próximo passo e o que depende de mim. Responda em português e me guie passo a passo nas telas dos painéis (com URL). Não reabra as decisões D1 a D11 da seção 2 sem motivo. Siga as regras do projeto em .claude/rules (Lion Lab): sem escrita direta do front no Supabase, organizacao_id sempre da sessão, RLS em toda tabela nova, segredos nunca em log, testes primeiro, Conventional Commits.

Estado atual: o piloto de NOTÍCIAS está pronto e verificado (crawlers/raspar-noticias-v2.js; 4 notícias reais preparadas). Próximo passo: replicar o molde nos outros 5 crawlers (secretarias, gestores, lrf/pcg, portarias, decretos), começando por secretarias; depois o worker que atende pedidos 'pendente' e o painel de revisão. Em paralelo falta a matriz de lacunas (site de Aracati x PortalGov x crawlers), que precisa do código atualizado do PortalGov (a versão mais nova está na VPS).

Antes de começar, rode `git pull` e confira que .env e portal-admin/.env.local existem (não estão no Git). Nunca imprima valores de chaves.
```
