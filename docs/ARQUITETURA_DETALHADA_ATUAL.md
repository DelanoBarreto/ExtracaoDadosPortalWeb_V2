# ARQUITETURA DETALHADA ATUAL - PortalGov v3 (Transição para v4)

## 1. Visão Geral do Sistema
O **PortalGov Admin Dashboard v3** é uma plataforma de back-office projetada para automatizar a coleta, gestão e publicação de dados governamentais de transparência pública. Ele atua como um hub centralizado para múltiplos municípios (multi-tenant), permitindo que gestores capturem dados diretamente dos portais municipais e os moderem antes da publicação oficial.

### Finalidade
- **Automatização**: Reduzir o trabalho manual de inserção de dados.
- **Transparência**: Garantir que as informações (Notícias, LRF, Secretarias) estejam sempre atualizadas.
- **Controle**: Fornecer uma interface de elite para edição e curadoria de conteúdos governamentais.

---

## 2. Stack Tecnológica (Alinhada com v4)
| Camada | Tecnologia | Detalhes |
| :--- | :--- | :--- |
| **Framework** | Next.js 15.1 | App Router, SSR, Server Components |
| **Linguagem** | TypeScript | Tipagem forte e contratos de dados seguros |
| **Estilização** | Tailwind CSS 4.0 | Design System "Elite City Hall Blue" |
| **Banco de Dados** | Supabase (PostgreSQL) | Armazenamento relacional e Realtime |
| **Crawler Engine** | Node.js + Playwright | Motor de raspagem isolado (Planejado para v4) |
| **Cache/Sync** | TanStack Query v5 | Sincronização eficiente de dados |
| **Animações** | Framer Motion | Interface Premium e transições fluídas |

---

## 3. Estrutura de Telas e Fluxos

### A. Dashboard & Gestão
- **Seleção de Jurisdição**: Filtro global por município.
- **Módulos**: Notícias, Atos Oficiais (LRF), Secretarias.
- **Interface Unificada**: Layouts que integram a edição à navegação principal, eliminando a fragmentação de modais.

### B. Motor de Raspagem (Crawler)
- **Operação**: Disparo via UI, execução isolada via scripts.
- **Deduplicação**: Uso de SHA-256 para evitar registros duplicados.
- **Storage**: Download obrigatório de arquivos originais para o Supabase Storage.

---

## 4. Lógica de Dados (CRUD em Português)
Conforme as novas diretrizes, o sistema utiliza:
- **Campos de Controle (Inglês)**: `id`, `created_at`, `municipio_id`, `status`.
- **Campos de Conteúdo (Português)**: `titulo`, `conteudo`, `resumo`, `data_publicacao`, `nome_secretaria`, `exercicio`.

---

## 5. Implementação da Arquitetura V4 (Crawler Isolado) [CONCLUÍDO]

Seguindo as novas diretrizes, implementamos o isolamento total do motor de raspagem:
- **Localização**: `/crawler` na raiz do projeto.
- **Motor Central (Engine)**: `crawler/engine/scraper.service.js` centraliza a lógica de Supabase, Cheerio e processamento de PDFs.
- **Scripts Modulares**: `crawler/scripts/` contém os raspadores para Notícias, LRF e Secretarias em formato ESM.
- **Integração**: Frontend comunica-se via `spawn` de processos Node.js, capturando logs e progresso visual.

---

## 6. Fluxo Operacional Detalhado

### Fluxo de Raspagem
1.  **Gatilho**: O usuário acessa o "Console de Raspagem" no dashboard.
2.  **Configuração**: Seleciona o módulo (Notícias, LRF, etc.) e a profundidade (10, 20, 50, 100 itens).
3.  **Execução**: O backend (`/api/scrape`) dispara um processo Node.js isolado.
4.  **Monitoramento**: O frontend lê um arquivo de log em tempo real (`last-run.log`) e exibe no terminal visual.
5.  **Persistência**: O script de raspagem:
    - Valida se o item já existe (Upsert).
    - Faz o download de anexos/fotos para o Supabase Storage.
    - Insere os dados estruturados no Supabase Database.
6.  **Conclusão**: O processo encerra e o usuário recebe um log de sucesso/erro.

### Fluxo de Edição/Publicação
1.  **Listagem**: Exibição dos dados coletados com paginação sever-side.
2.  **Curadoria**: O usuário clica em editar para abrir a interface integrada.
3.  **Moderação**: Altera o status de `rascunho` para `publicado`.
4.  **Refinamento**: Edita campos de texto usando o editor Rich Text (se aplicável).

---

## 7. Itens e Componentes das Telas

### Dashboard Principal
- **Menu Lateral**: Navegação entre módulos e municípios.
- **Top Bar**: Busca global, notificações e perfil.
- **Cards de Stats**: Quantitativo de itens por status.

### Listagem (Datatable)
- **Cabeçalho Dinâmico**: Ordenação por colunas.
- **Checkbox Bulk**: Seleção múltipla para ações em lote (deletar, publicar).
- **Paginação**: Controles de navegação server-side (Lote de 20 registros).

### Console de Raspagem (Drawer)
- **Terminal de Logs**: Feedback em tempo real com modo Hacker/Elite.
- **Barra de Progresso**: Indicador visual dinâmico baseado em detecção de logs.
- **Seletores de Limite**: Controle de carga da raspagem.
- **Botões de Controle**: Play, Stop, Limpar.

---

## 8. Roadmap de Evolução Concluído (v4)

- [x] **Paginação Server-Side**: Otimização de performance em todos os módulos.
- [x] **Isolamento de Crawler**: Migração para a pasta raiz `/crawler`.
- [x] **Motor ESM**: Refatoração de scripts JS legados para módulos modernos.
- [x] **Design Elite V4**: Implementação de estética premium e glassmorphism.
- [ ] **Interface de Edição Integrada**: Evoluir os modais para painéis laterais fixos (Próximo Passo).
