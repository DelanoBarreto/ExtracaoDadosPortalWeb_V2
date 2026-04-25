# MASTER INSTRUCTIONS: PortalGov v4 - Gestão de Transparência Municipal

Este documento contém o contexto completo, as regras de negócio e os padrões técnicos do projeto **PortalGov v4**. Use estas instruções como base para criar novas funcionalidades, telas ou scripts de raspagem, mantendo a consistência total do ecossistema.

---

## 1. IDENTIDADE E PROPÓSITO
O **PortalGov v4** é um ecossistema de transparência pública composto por:
1.  **Crawler Engine**: Robôs que coletam dados de portais municipais legados.
2.  **Painel Administrativo**: Interface "Elite" para moderação, edição e publicação de dados coletados.
3.  **Banco de Dados Centralizado**: Supabase (PostgreSQL) com multi-tenancy baseado em `municipio_id`.

---

## 2. STACK TECNOLÓGICA (ELITE V4)
- **Frontend**: Next.js 15.1+ (App Router), React 19, TypeScript.
- **Estilização**: Tailwind CSS 4.0 (CSS-first configuration).
- **Ícones**: Lucide React.
- **Animações**: Framer Motion.
- **Estado**: Zustand (Global) + TanStack Query (Server State).
- **Banco de Dados**: Supabase (JS SDK).
- **Crawler**: Node.js, Cheerio (Extração), Playwright (Navegação dinâmica).

---

## 3. PADRÕES DE DESIGN (UI/UX ELITE)
O design deve ser **Premium, Corporativo e Moderno**.
- **Cores**: 
  - Primária: `#004a99` (Blue Government)
  - Fundo: `#f8fafc` (Slate-50)
  - Bordas: `#e2e8f0` (Slate-200)
  - Texto: `#1e293b` (Slate-800)
- **Componentes**:
  - Cards: `bg-white rounded-xl border border-slate-200 shadow-sm`.
  - Botões: `rounded-md font-semibold transition-all active:scale-95`.
  - Badges: `rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase`.
- **Layout**: Sidebar fixa à esquerda, cabeçalho de página com métricas (KPIs) e tabela de dados com `DataTableV2`.

---

## 4. ESTRUTURA DO BANCO DE DADOS (DICIONÁRIO)
Todas as tabelas **DEVEM** conter `municipio_id` (UUID).

### Tabela: `tab_municipios`
- `id` (uuid), `nome` (text), `url_base` (text), `ativo` (boolean).

### Tabela: `tab_noticias`
- `id`, `municipio_id`, `titulo`, `resumo`, `conteudo`, `data_publicacao`, `imagem_url`, `url_original`, `status` (publicado/rascunho/arquivado).

### Tabela: `tab_lrf` (Leis e Relatórios)
- `id`, `municipio_id`, `titulo`, `ano`, `competencia`, `data_publicacao`, `arquivo_url`, `url_original`, `tipo`, `status`.

### Tabela: `tab_secretarias` (Órgãos)
- `id`, `municipio_id`, `nome_secretaria`, `nome_responsavel`, `email`, `telefone`, `status`.

---

## 5. REGRAS DE NEGÓCIO E LÓGICA
### 5.1 Fluxo de Status
- Dados raspados entram como `'rascunho'` (ou `'publicado'` se configurado no script).
- O Painel Admin deve permitir filtrar por status.
- Na API, o filtro `'rascunho'` deve considerar também registros onde `status` é `NULL`.

### 5.2 Lógica do Crawler
- **Localização**: Scripts em `crawler/scripts/`.
- **Motor**: Usa `ScraperService` em `crawler/engine/`.
- **Robustez**: Deve buscar metadados em múltiplos seletores (td, li, span) e usar Regex para datas.
- **Storage**: Upload de PDFs para o Supabase Storage em pastas organizadas: `arquivos_municipais/{municipio_nome}/{modulo}/`.

---

## 6. MAPA DE DIRETÓRIOS
- `/portalgov-v3/src/app/(admin)/`: Páginas do painel administrativo.
- `/portalgov-v3/src/components/shared/`: Componentes globais (DataTableV2, Sidebar).
- `/portalgov-v3/src/app/api/scrape/`: Rota que dispara os robôs.
- `/crawler/scripts/`: Scripts individuais de raspagem por módulo.
- `/crawler/engine/`: Lógica base e conexão com banco/storage.

---

## 7. PRINCÍPIOS DE CÓDIGO
1.  **Idioma**: Variáveis e funções em Português (Brasil). Comentários técnicos em Inglês ou Português claro.
2.  **Segurança**: Nunca exponha a `SERVICE_ROLE_KEY` no frontend. Use-a apenas em rotas API ou scripts locais.
3.  **Performance**: Use `useQuery` para cache de dados e `motion` para transições suaves.
4.  **Resiliência**: Scripts de raspagem devem validar se o elemento existe antes de tentar ler o `.text()`.

---

**Ao replicar ou criar código para este projeto, siga RIGOROSAMENTE estes padrões para garantir a integridade da arquitetura v4.**
