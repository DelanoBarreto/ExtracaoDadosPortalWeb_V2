# PROMPT DE ARQUITETURA — PORTAL GOVERNAMENTAL + ENGINE DE MIGRAÇÃO DE DADOS
**Versão 2.0 | Stack Moderna 2025 | Engenheiro Sênior & Arquiteto de Dados**

---

## 1. SEU PAPEL E CONTEXTO

Você é um **Engenheiro de Software Sênior Full-Stack e Arquiteto de Dados**. Sua missão é construir dois sistemas que coexistem no mesmo monorepo, mas operam de forma totalmente independente:

1. **`/app`** — Portal Governamental público (Next.js 15, App Router, SSR/SSG), substituindo o frontend legado em React/Vite.
2. **`/crawler`** — Motor de Scraping e Migração de Dados (Node.js/TypeScript puro), isolado, sem qualquer dependência do frontend.

> **REGRA DE OURO — NÃO NEGOCIÁVEL:** O módulo `/crawler` jamais importa, modifica ou referencia qualquer arquivo de `/app`. A comunicação entre eles é **exclusivamente via banco de dados (Supabase)**. Se você tocar em `/app` durante o desenvolvimento do crawler, ou vice-versa, a tarefa foi executada errada.

---

## 2. STACK TECNOLÓGICA — DECISÕES JUSTIFICADAS

### 2.1 — Frontend: `/app`

| Tecnologia | Versão | Justificativa |
|---|---|---|
| **Next.js** | 15+ (App Router) | SSR nativo para SEO governamental; Server Components reduzem JS no cliente; Routes Groups para separar área pública e `/admin` |
| **Tailwind CSS** | v4 | Engine CSS nativa (sem PostCSS); variáveis CSS de primeira classe; performance superior |
| **Supabase** | latest | Auth + PostgreSQL + Storage + Realtime em um único SDK; Row Level Security (RLS) para proteger rotas admin |
| **TanStack Query** | v5 | Cache inteligente, revalidação automática e estados de loading/error prontos para produção |
| **Zustand** | latest | Estado global leve para UI (filtros, modais, preferências); sem boilerplate do Redux |
| **Framer Motion** | latest | Animações de page transition e micro-interações para o padrão Premium exigido |
| **Lucide React** | latest | Ícones consistentes, tree-shakeable, tamanho mínimo no bundle |

### 2.2 — Crawler / Migração: `/crawler`

| Tecnologia | Versão | Justificativa |
|---|---|---|
| **Node.js + TypeScript** | Node 20 LTS | Runtime estável; TypeScript para contratos de dados seguros entre scraper e Supabase |
| **Playwright** | latest | Obrigatório para sites governamentais legados com renderização JS, paginação dinâmica e redirecionamentos |
| **Cheerio** | latest | Parsing rápido de HTML estático após captura do Playwright; mais leve que o DOM completo |
| **@supabase/supabase-js** | latest | Upload direto de PDFs para Storage e Upsert atômico no PostgreSQL |
| **p-limit** | latest | Rate limiting por concorrência para não derrubar o servidor legado |
| **winston** | latest | Logs estruturados em JSON (arquivo + console); essencial para observabilidade em produção |

> **Por que Playwright em vez de Axios/Cheerio puro?**
> Sites governamentais legados frequentemente usam JSP, ASP.NET WebForms ou PHP com sessões que exigem navegador real. Playwright garante que o crawler funcione mesmo se o site legado adicionar proteções básicas ou usar JavaScript para renderizar conteúdo.

---

## 3. ARQUITETURA DO MONOREPO

```
/
├── app/                          # ← FRONTEND PÚBLICO (Next.js 15)
│   ├── src/
│   │   ├── app/                  # App Router
│   │   │   ├── (public)/         # Route Group: páginas públicas
│   │   │   │   ├── page.tsx      # Home
│   │   │   │   ├── noticias/
│   │   │   │   ├── secretarias/
│   │   │   │   └── diario-oficial/
│   │   │   ├── (admin)/          # Route Group: painel admin protegido
│   │   │   │   ├── layout.tsx    # Middleware de autenticação Supabase
│   │   │   │   ├── dashboard/
│   │   │   │   └── crawler/      # UI para disparar e monitorar o scraper
│   │   │   └── api/              # Route Handlers (API REST interna)
│   │   │       └── crawler/
│   │   │           └── trigger/route.ts  # Endpoint que dispara o crawler
│   │   ├── components/
│   │   │   ├── ui/               # Componentes base (Button, Card, Badge)
│   │   │   ├── public/           # Componentes da área pública
│   │   │   └── admin/            # Componentes do painel admin
│   │   ├── lib/
│   │   │   ├── supabase/         # Clients: server.ts, client.ts, middleware.ts
│   │   │   └── utils.ts
│   │   ├── hooks/                # Custom hooks com TanStack Query
│   │   └── store/                # Zustand stores
│   ├── public/
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── package.json              # Dependências APENAS do frontend
│
├── crawler/                      # ← MOTOR DE DADOS (Node.js puro)
│   ├── src/
│   │   ├── index.ts              # CLI Entry Point (ponto de entrada)
│   │   ├── config/
│   │   │   └── settings.ts       # Rate limits, URLs base, timeouts
│   │   ├── scrapers/             # Um arquivo por seção do site legado
│   │   │   ├── noticias.scraper.ts
│   │   │   ├── secretarias.scraper.ts
│   │   │   └── diario-oficial.scraper.ts
│   │   ├── processors/           # Limpeza e estruturação dos dados
│   │   │   ├── html.processor.ts
│   │   │   └── pdf.processor.ts
│   │   ├── services/
│   │   │   ├── supabase.service.ts   # Upsert, Storage upload
│   │   │   ├── browser.service.ts    # Singleton do Playwright
│   │   │   └── ai.service.ts         # Chamadas à API Anthropic/OpenAI (opcional)
│   │   ├── utils/
│   │   │   ├── logger.ts             # Winston configurado
│   │   │   ├── rate-limiter.ts       # p-limit + delay aleatório
│   │   │   └── hash.ts               # Gerador de IDs únicos (SHA-256 da URL)
│   │   └── types/
│   │       └── index.ts              # Interfaces: NewsItem, OfficialAct, ScrapingJob
│   ├── logs/                         # Gerado em runtime (gitignored)
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json                  # Dependências APENAS do crawler
│
├── supabase/                     # ← BANCO DE DADOS (schema compartilhado)
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql
│
├── .env.example                  # Variáveis de ambiente globais
├── .gitignore
└── README.md
```

---

## 4. SCHEMA DO BANCO DE DADOS (Supabase / PostgreSQL)

Crie as seguintes tabelas e buckets antes de iniciar qualquer código:

```sql
-- ================================================================
-- TABELA: news (Notícias e Comunicados)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.news (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_hash  TEXT UNIQUE NOT NULL,   -- SHA-256 da URL original (chave de deduplicação)
  source_url   TEXT NOT NULL,
  title        TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,   -- Gerado a partir do título para URLs amigáveis
  summary      TEXT,
  content      TEXT,
  published_at TIMESTAMPTZ,
  image_url    TEXT,                   -- URL do Supabase Storage (não do site legado)
  category     TEXT DEFAULT 'geral',
  tags         TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  scraped_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: official_acts (Diário Oficial e Atos Governamentais)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.official_acts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_hash   TEXT UNIQUE NOT NULL,   -- SHA-256 da URL do PDF original
  source_url    TEXT NOT NULL,
  act_number    TEXT,                   -- Número do decreto/portaria
  act_type      TEXT NOT NULL,          -- 'decreto', 'portaria', 'resolucao', 'edital'
  title         TEXT NOT NULL,
  summary       TEXT,                   -- Extraído via IA se necessário
  published_at  TIMESTAMPTZ,
  storage_path  TEXT NOT NULL,          -- Path no Supabase Storage
  storage_url   TEXT NOT NULL,          -- URL pública do Supabase Storage
  file_size_kb  INTEGER,
  is_published  BOOLEAN DEFAULT false,
  scraped_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: secretarias (Estrutura Organizacional)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.secretarias (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_hash  TEXT UNIQUE NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  secretary    TEXT,                    -- Nome do secretário responsável
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  logo_url     TEXT,                    -- URL do Supabase Storage
  is_active    BOOLEAN DEFAULT true,
  scraped_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TABELA: scraping_jobs (Log de Execuções do Crawler)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.scraping_jobs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_type     TEXT NOT NULL,           -- 'news', 'official_acts', 'secretarias', 'full'
  status       TEXT DEFAULT 'pending',  -- 'pending', 'running', 'success', 'failed'
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  finished_at  TIMESTAMPTZ,
  total_found  INTEGER DEFAULT 0,
  total_saved  INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  error_log    JSONB DEFAULT '[]',
  triggered_by TEXT DEFAULT 'cli'       -- 'cli', 'admin_ui', 'cron'
);

-- Índices para performance
CREATE INDEX idx_news_published_at ON public.news(published_at DESC);
CREATE INDEX idx_news_category ON public.news(category);
CREATE INDEX idx_official_acts_type ON public.official_acts(act_type);
CREATE INDEX idx_official_acts_published ON public.official_acts(published_at DESC);
CREATE INDEX idx_scraping_jobs_status ON public.scraping_jobs(status);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_news_updated BEFORE UPDATE ON public.news
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_acts_updated BEFORE UPDATE ON public.official_acts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Buckets do Supabase Storage:**
```
arquivos_gov/
├── noticias/        → imagens das notícias
├── diario-oficial/  → PDFs dos atos oficiais
└── secretarias/     → logos e imagens das secretarias
```
Todos os buckets devem ser criados como **públicos** para leitura e **privados** para escrita (apenas service role key).

---

## 5. REGRAS DE NEGÓCIO DA AUTOMAÇÃO (Obrigatórias)

Todo código gerado para o `/crawler` **deve** implementar as seguintes regras sem exceção:

### Regra 1 — Deduplicação por Hash (Upsert Inteligente)
```typescript
// Gere um hash SHA-256 da URL original como chave única
const sourceHash = crypto.createHash('sha256').update(sourceUrl).digest('hex');

// Use UPSERT no Supabase: insere se novo, atualiza se mudou, ignora se igual
await supabase.from('news').upsert({ source_hash: sourceHash, ...data }, {
  onConflict: 'source_hash',
  ignoreDuplicates: false   // false = atualiza campos alterados
});
```

### Regra 2 — Rate Limiting Educado
```typescript
// Entre cada requisição: delay aleatório entre 2 e 4 segundos
const delay = Math.floor(Math.random() * 2000) + 2000;
await new Promise(resolve => setTimeout(resolve, delay));

// Máximo de 2 requisições simultâneas (p-limit)
const limit = pLimit(2);
```

### Regra 3 — Download e Rearmazenamento de PDFs/Imagens
```typescript
// NUNCA salve a URL original do site legado no banco.
// SEMPRE faça download do arquivo e faça upload no Supabase Storage.
const fileBuffer = await downloadFile(originalUrl);  // retorna Buffer
const storagePath = `diario-oficial/${year}/${filename}`;
const { data } = await supabase.storage.from('arquivos_gov').upload(storagePath, fileBuffer);
const publicUrl = supabase.storage.from('arquivos_gov').getPublicUrl(storagePath).data.publicUrl;
// salve publicUrl no banco, não originalUrl
```

### Regra 4 — Observabilidade com Winston
```typescript
// Todos os eventos importantes devem ser logados em arquivo + console
logger.info('✅ Notícia salva', { title, sourceHash, action: 'upsert' });
logger.warn('⚠️  PDF corrompido ignorado', { url, reason: 'empty buffer' });
logger.error('❌ Falha de conexão', { url, attempt: 3, error: err.message });
```

### Regra 5 — Retry com Backoff Exponencial
```typescript
// Tentativas automáticas em caso de falha de rede (3 tentativas, 2x o delay a cada falha)
async function fetchWithRetry(url: string, maxRetries = 3): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await delay(attempt * 3000); // 3s, 6s, 9s
    }
  }
}
```

---

## 6. FASES DE DESENVOLVIMENTO (Sprints Isoladas)

### 🔵 Fase 1 — Setup e Schema *(Pré-requisito)*
- [ ] Criar projeto Supabase e configurar variáveis de ambiente
- [ ] Executar o SQL de schema acima
- [ ] Criar os 3 buckets de Storage com as políticas corretas
- [ ] Configurar o monorepo com `package.json` na raiz (workspaces)
- [ ] Instalar dependências de cada módulo isoladamente

### 🟡 Fase 2 — Prova de Conceito do Crawler *(CLI simples)*
- [ ] Implementar `browser.service.ts` com Playwright (singleton compartilhado)
- [ ] Implementar `rate-limiter.ts` e `logger.ts`
- [ ] Criar `secretarias.scraper.ts`: raspa apenas a lista de secretarias
- [ ] Salvar resultado no Supabase com Upsert
- [ ] Validar logs e dados no painel do Supabase

### 🟠 Fase 3 — Scraper Completo *(PDFs + Paginação)*
- [ ] Criar `diario-oficial.scraper.ts` com navegação entre páginas
- [ ] Implementar `pdf.processor.ts` com download em buffer e upload no Storage
- [ ] Criar `noticias.scraper.ts` com extração de imagens
- [ ] Integrar `ai.service.ts` para parsing inteligente de metadados ambíguos
- [ ] Criar `scraping_jobs` para registrar cada execução no banco

### 🔴 Fase 4 — Painel Admin *(UI de Controle)*
- [ ] Criar Route Group `(admin)` no Next.js com autenticação Supabase
- [ ] Implementar `app/api/crawler/trigger/route.ts` como endpoint seguro
- [ ] Criar dashboard admin com: status dos jobs, botões de trigger, logs em tempo real
- [ ] Usar Supabase Realtime para atualizar status do job sem refresh

---

## 7. VARIÁVEIS DE AMBIENTE NECESSÁRIAS

```bash
# /crawler/.env (nunca commitar — apenas .env.example)
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Chave admin para bypass do RLS durante migração
TARGET_BASE_URL=https://www.aracati.ce.gov.br
CRAWLER_DELAY_MIN_MS=2000
CRAWLER_DELAY_MAX_MS=4000
CRAWLER_MAX_CONCURRENCY=2
ANTHROPIC_API_KEY=sk-ant-...       # Opcional: para parsing inteligente com IA

# /app/.env.local (Next.js — nunca commitar)
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # Chave pública, segura para o frontend
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # Apenas para Route Handlers server-side
```

---

## 8. AÇÃO REQUERIDA (O que você deve fazer agora)

Execute as seguintes ações **nesta ordem exata**, sem pular etapas:

1. **Confirme a arquitetura:** Responda listando as 5 Regras de Negócio com uma confirmação de que as implementará.

2. **Crie o setup do monorepo:** Gere o `package.json` raiz com workspaces e os `package.json` de `/app` e `/crawler` com suas dependências separadas.

3. **Gere o `/crawler` completo da Fase 2:** Implemente os arquivos de setup, serviços base, logger e o scraper de Secretarias como prova de conceito funcional.

4. **Aguarde aprovação** antes de avançar para as Fases 3 e 4. Cada fase deve ser validada antes da próxima.

5. **Nunca modifique arquivos de `/app` enquanto estiver trabalhando em `/crawler`, e vice-versa.**

---

*Documento gerado como Arquiteto Líder — versão 2.0 — Stack 2025*
