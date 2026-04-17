# Plano de Melhoria do Dashboard: Abas e Visualização em Tabela

Este documento descreve o plano para adicionar um sistema de abas no dashboard e uma nova visualização em formato de tabela horizontal para os módulos de Notícias e LRF.

## 🎯 Objetivos
1.  Implementar sistema de abas (Tabs) para alternar entre visualização de **Cards** e **Tabela**.
2.  Criar layout de **Tabela Horizontal** com alinhamento limpo, similar ao modelo fornecido no print.
3.  Exibir **imagens (thumbnails)** nos itens de notícias em ambas as visualizações (quando disponível).
4.  Incluir ações rápidas (Editar, Visualizar, Excluir) na visualização em tabela.
5.  Garantir que a visualização original (Cards) não seja alterada em sua essência.

## 🛠️ Alterações Sugeridas

### 1. Frontend (React - `admin-dashboard/src/App.jsx`)
-   Adicionar estado `viewMode` ('cards' | 'table') para controlar a aba ativa.
-   Implementar o componente visual de abas na seção de dados.
-   Criar função `renderTableView()` para gerar a listagem horizontal.
-   Adicionar suporte a `imagem_url` no mapeamento dos itens.
-   Adicionar ícones de ação (Lucide: `Pencil`, `Eye`, `Trash2`).

### 2. Estilização (CSS - `admin-dashboard/src/index.css`)
-   Criar classes para `.data-table` e `.table-row`.
-   Estilizar thumbnails (fixar tamanho ex: 80x50px com object-cover).
-   Ajustar alinhamento horizontal (Flexbox ou Grid) para os campos: Imagem, Título, Categoria, Data, Status e Ações.
-   Adicionar efeitos de hover nas linhas da tabela.

## 📝 Tarefas

### Fase 1: Fundação e Abas
- [ ] Criar estado `viewMode` no `App.jsx`.
- [ ] Inserir o componente visual de abas (`tab-bar`) acima da listagem de dados.

### Fase 2: Visualização em Tabela
- [ ] Desenvolver a estrutura da tabela (Header + Rows).
- [ ] Implementar a lógica de exibição de imagem para notícias.
- [ ] Criar os botões de ação na extremidade direita da linha.

### Fase 3: Estilização e Polimento
- [ ] Adicionar regras de CSS para o layout horizontal no modelo "row".
- [ ] Garantir contraste e leitura fluida seguindo o guia "Soft Corporate".
- [ ] Validar estados de hover e interatividade.

## 🧪 Verificação
- [ ] Testar alternância entre abas.
- [ ] Validar se as imagens das notícias estão carregando corretamente do Supabase Storage.
- [ ] Conferir se os campos de data e categoria estão alinhados conforme o print.

---
**Autor:** Antigravity AI
**Status:** Aguardando Aprovação
