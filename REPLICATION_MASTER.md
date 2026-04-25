# DOCUMENTO MASTER DE REPLICAÇÃO - PORTALGOV V4 ELITE

Este documento contém toda a lógica, arquitetura, padrões visuais e fluxos de dados necessários para replicar o projeto **PortalGov V4 Elite** por completo em qualquer plataforma de IA (como AI Studio, Claude, etc.).

---

## 1. VISÃO GERAL E OBJETIVO
O sistema é um **Orquestrador de Dados Governamentais** multi-tenant. Ele automatiza a raspagem (scraping) de portais da transparência e centraliza a gestão em um painel administrativo. O sistema é regido pelo conceito de **Município Ativo**, onde toda a interface se adapta ao município selecionado no estado global.

## 2. STACK TECNOLÓGICA
- **Framework**: Next.js 14 (App Router) com TypeScript.
- **Estilização**: Tailwind CSS (Padrão Elite: Azul Corporativo, Tipografia Densa).
- **Banco de Dados & Auth**: Supabase (PostgreSQL).
- **Estado Global**: Zustand (com persistência no LocalStorage).
- **Animações**: Framer Motion (Transições suaves e modais).
- **Ícones**: Lucide React.

---

## 3. ARQUITETURA DE DADOS (SUPABASE)
O banco de dados deve possuir as seguintes tabelas principais:

### `tab_municipios`
- `id`: uuid (PK)
- `nome`: text
- `url_base`: text (URL do portal da transparência)
- `url_noticias`: text
- `url_lrf`: text
- `status`: text (ativo/inativo)

### `tab_noticias`
- `id`: uuid (PK)
- `municipio_id`: uuid (FK -> tab_municipios)
- `titulo`: text
- `conteudo`: text
- `imagem_url`: text
- `data_publicacao`: timestamp
- `url_original`: text
- `status`: text (rascunho/publicado)

### `tab_lrf`
- `id`: uuid (PK)
- `municipio_id`: uuid (FK -> tab_municipios)
- `titulo`: text
- `data_publicacao`: timestamp
- `arquivo_url`: text
- `tipo`: text (RREO, RGF, etc.)
- `exercicio`: text
- `periodo`: text
- `status`: text

---

## 4. ESTADO GLOBAL (O CORAÇÃO DO SISTEMA)
Localizado em `src/store/municipality.ts`. Este arquivo gerencia qual município o administrador está editando.

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Municipality {
  id: string;
  name: string;
  url_base?: string;
}

interface MunicipalityState {
  currentMunicipality: Municipality | null;
  setCurrentMunicipality: (municipality: Municipality) => void;
}

export const useMunicipalityStore = create<MunicipalityState>()(
  persist(
    (set) => ({
      currentMunicipality: null,
      setCurrentMunicipality: (municipality) => set({ currentMunicipality: municipality }),
    }),
    { name: 'municipality-storage' }
  )
);
```

---

## 5. LAYOUT E INTERFACE (DESIGN SYSTEM)

### Sidebar Fixa (`components/shared/Sidebar.tsx`)
- Menu lateral escuro (`bg-[#0f172a]`).
- Links para: Dashboard, Notícias, LRF, Atos Oficiais, Secretarias, Crawlers, Configurações.
- Estado visual de "ativo" destacando o item selecionado.

### Header Dinâmico (`components/shared/AdminHeader.tsx`)
- Exibe o nome do município ativo no lado esquerdo.
- Seletor de município rápido (Dropdown) ou link para trocar nas configurações.
- Avatar e nome do usuário logado (Admin).

### DataTable V2 (`components/shared/DataTableV2.tsx`)
- Tabela genérica que aceita colunas configuráveis.
- Suporta Checkbox para ações em lote (bulk actions).
- Estilo Industrial: Bordas finas, linhas que mudam de cor no hover, tipografia Inter.

---

## 6. LÓGICA DAS TELAS PRINCIPAIS

### Tela de Notícias (`app/(admin)/noticias/page.tsx`)
- **Colunas**: Capa (thumb), Identificação/Título (Título + Autor/Data), Exercício, Status, Ações.
- **Filtros**: Busca por texto e abas de status (Todos, Publicado, Rascunho).
- **Lógica de Dados**: Sempre filtra por `municipio_id` vindo do Store Global.

### Tela de Configurações (`app/(admin)/configuracoes/page.tsx`)
- Onde se cadastra novos municípios.
- Permite "Ativar" um município, o que dispara o `setCurrentMunicipality` no store global.

### Tela de Crawlers (`app/(admin)/crawlers/page.tsx`)
- Painel para disparar os robôs de raspagem.
- Logs em tempo real da operação.

---

## 7. SISTEMA DE RASPAGEM (CRAWLERS)
Localizados na pasta `/crawlers`. Scripts Node.js independentes que usam Puppeteer/Axios.

### Fluxo do Robô:
1. Lê o `municipio_id` e a `url_base` da tabela `tab_municipios`.
2. Navega no portal alvo e extrai os dados (HTML Parsing).
3. Envia os dados para o Supabase via `src/lib/supabase-bot.js` (usando `service_role_key`).
4. Os dados entram como `rascunho` por padrão para validação humana.

---

## 8. REGRAS DE ESTILO (ELITE STANDARDS)
- **Cores**: Primária `#004c99` (Blue), Fundo `#f8fafc`, Texto `#1e293b`.
- **Botões**: `rounded-xl`, `font-bold`, sombras suaves (`shadow-lg shadow-blue-100`).
- **Cards**: `rounded-[32px]`, bordas `border-slate-100`.
- **Tabelas**: Texto denso, ícones Lucide tamanho 15 ou 16.

---
*Este documento é a base intelectual do projeto ExtracaoDadosPortalWeb_V2.*
