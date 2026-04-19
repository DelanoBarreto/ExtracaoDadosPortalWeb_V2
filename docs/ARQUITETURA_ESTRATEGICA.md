# Arquitetura e Roadmap do Ecossistema PortalGov

Este documento registra a visão estratégica e técnica para o desenvolvimento do ecossistema de portais municipais, garantindo a consistência entre a extração de dados, a gestão administrativa e a exibição pública.

## 🎯 Objetivo Geral
Criar uma plataforma dinâmica para implantação de novos municípios ("do zero"), onde o processo começa com a raspagem de dados existentes para popular o novo portal, seguido por uma gestão administrativa robusta com diferentes níveis de acesso.

---

## 🏛️ Estrutura do Ecossistema

### 1. Raspagem e Alimentação Inicial (ExtracaoDados)
*   **Foco:** Super Admin.
*   **Função:** Executar scrapers para coletar dados de portais antigos (Notícias, LRF, Secretarias, etc.).
*   **Lógica de Inserção:** Todo dado raspado entra no banco com `status = 'rascunho'`.
*   **Local:** `C:\Antigravity\ExtracaoDadosPortalWeb`

### 2. Portal Público Municipal (PortalGov)
*   **Foco:** Cidadão (Público Geral).
*   **Função:** Exibição dinâmica dos dados do município.
*   **Regra de Exibição:** Consome apenas dados onde `status = 'publicado'`.
*   **Local:** `C:\Antigravity\Projeto PortalGov`

### 3. Área Administrativa (Admin Dashboard Unificado)
*   **Foco:** Servidores Municipais e Gestores.
*   **Níveis de Acesso:**
    *   **Usuário Comum:** Pode criar registros (ex: notícias) como `rascunho` para posterior aprovação ou agendamento.
    *   **Admin:** Gerencia o conteúdo total de seu município específico e publica registros.
    *   **Super Admin:** Acesso global (todos os municípios), controle de raspagem e aprovação final de dados migrados.
*   **Flexibilidade:** Permite alterar menus, visibilidade de seções e configurações do site de forma dinâmica.

---

## 🗄️ Estratégia de Banco de Dados (Supabase)

Utilizaremos um **único banco de dados** para evitar redundância e complexidade de sincronização.

### Campo Chave: `status`
Todas as tabelas principais (`tab_noticias`, `tab_lrf`, `tab_secretarias`, etc.) terão a coluna `status`.

Valores permitidos:
*   `rascunho`: Visível apenas no Dashboard para edição.
*   `publicado`: Visível no Portal Público e no Dashboard.
*   `agendado`: Visível no Dashboard, torna-se `publicado` automaticamente em data futura.
*   `arquivado`: Registro histórico não visível no portal.

---

## 🚀 Roadmap de Implementação

### Fase 1: Ajuste de Infraestrutura (SCRAPING) ← **Atualmente Aqui**
- [x] Planejamento da arquitetura de status.
- [ ] Execução do SQL de migração no Supabase (Add `status` e `data_publicacao`).
- [ ] Ajustar Scrapers para inserir como `rascunho`.
- [ ] Adicionar badge de status e botão "Publicar" no Dashboard de Extração.

### Fase 2: Integração do Portal Público
- [ ] Conectar Projeto PortalGov ao mesmo Banco Supabase.
- [ ] Implementar filtros `WHERE status = 'publicado'` em todas as telas.
- [ ] Traduzir dados fictícios para dados reais vindos do banco.

### Fase 3: Portal Administrativo Unificado
- [ ] Implementar Supabase Auth.
- [ ] Criar lógica de permissões baseada no `municipio_id` e no nível do usuário.
- [ ] Unificar as ferramentas de gestão em uma única interface profissional.

---

## 📝 Notas de Versão
*   **Data de Registro:** 19/04/2026
*   **Autor:** Antigravity AI & Usuário
