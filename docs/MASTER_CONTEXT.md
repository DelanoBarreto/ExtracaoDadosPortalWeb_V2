# MASTER CONTEXT - PORTALGOV V4 ELITE

## 1. VISÃO GERAL DO PROJETO
O **PortalGov V4 Elite** é uma plataforma de extração e gestão de dados governamentais multi-tenant. O sistema automatiza a coleta de Notícias, Relatórios LRF, Atos Oficiais e dados de Secretarias de portais municipais, centralizando-os em um painel administrativo premium construído com Next.js 14 (App Router) e Supabase.

## 2. ARQUITETURA TÉCNICA
- **Frontend**: Next.js 14, Tailwind CSS, Framer Motion (animações), Lucide React (ícones).
- **Estado Global**: Zustand com persistência local para gerenciar o município ativo.
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage).
- **Robôs (Crawlers)**: Scripts Node.js/Puppeteer localizados na raiz do projeto (`/crawlers`).

## 3. FLUXO DE DADOS E ESTADO GLOBAL
O coração da aplicação é o **Município Ativo**.
- **Store**: `src/store/municipality.ts` (Zustand).
- **Lógica**: Toda consulta ao banco de dados (Notícias, LRF, etc.) deve incluir o filtro `municipio_id` baseado no `currentMunicipality` do store.
- **Persistência**: O município selecionado é salvo no `localStorage` via middleware do Zustand.

## 4. ESTRUTURA DE DIRETÓRIOS (CHAVE)
- `/src/app/(admin)/`: Contém as rotas protegidas do painel.
  - `configuracoes/page.tsx`: Gestão de municípios (Cadastro/Seleção).
  - `dashboard/page.tsx`: Visão geral e KPIs.
  - `noticias/page.tsx`: Listagem e filtros de notícias.
  - `lrf/page.tsx`: Gestão de arquivos de Responsabilidade Fiscal.
- `/src/store/`: Gerenciamento de estado (municípios, categorias, UI).
- `/crawlers/`: Motores de raspagem independentes.
- `/src/lib/`: Configurações do cliente Supabase e utilitários.

## 5. PADRÕES VISUAIS (V4 ELITE)
- **Cabeçalho**: Títulos com `text-[42px] font-black` e sublinhados/detalhes em azul (`text-blue-600`).
- **Cards**: Bordas arredondadas `rounded-[32px]`, sombras suaves e fundos brancos ou azul escuro (`#001f3f`) para formulários.
- **Tipografia**: Uso intensivo de pesos `font-black` e `font-bold` para hierarquia visual.
- **Interação**: Hover effects com `motion` e feedbacks visuais claros para estados de seleção.

## 6. LÓGICA DE RASPAGEM (CRAWLER)
Os robôs seguem um padrão de 3 fases:
1. **Descoberta**: Navega até a página de listagem do município.
2. **Extração**: Coleta metadados (Título, Data, URL do PDF/Link).
3. **Persistência**: Salva no Supabase (`tab_noticias`, `tab_lrf`) associando ao `municipio_id` correto.

## 7. SCHEMA DO BANCO DE DADOS (SUPABASE)
- `tab_municipios`: id, nome, url_base, status.
- `tab_noticias`: id, municipio_id, titulo, resumo, conteudo, url_capa, data_publicacao.
- `tab_lrf`: id, municipio_id, titulo, exercicio, periodo, categoria, url_arquivo.
- `tab_secretarias`: id, municipio_id, nome, responsavel, cargo, email, telefone.

## 8. INSTRUÇÕES PARA REPLICAÇÃO (AI STUDIO)
Para replicar este projeto:
1. **Setup**: Inicie um projeto Next.js 14 com Tailwind.
2. **Estado**: Implemente o `useMunicipalityStore` exatamente como definido em `src/store/municipality.ts`.
3. **Layout**: Crie o `app/(admin)/layout.tsx` com uma Sidebar fixa e um Header que exibe o nome do município ativo.
4. **Filtros**: Em cada tela de listagem, utilize o `currentMunicipality?.id` para filtrar os dados do Supabase.
5. **Estética**: Siga as definições de cores e espaçamentos do "Padrão V4 Elite" descritos acima.

---
*Documento gerado para contexto master de replicação de projeto v4.*
