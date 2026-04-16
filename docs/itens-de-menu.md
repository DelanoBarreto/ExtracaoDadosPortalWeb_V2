# Itens de Menu - Estrutura do PortalGov 🏛️

Este documento define a hierarquia de navegação do portal. Os itens listados aqui servem como guia para a implementação dos componentes de Header e Menubar.

## 1. Menu Principal e Submenus

| Menu Principal | Itens do Submenu (Dropdown) |
| :--- | :--- |
| **Início** | (Link direto para a Home) |
| **A Prefeitura** | Prefeito, Vice-Prefeito, Secretarias, Perguntas Frequentes (FAQ), Fale Conosco, Lei Aldir Blanc |
| **A Cidade** | Conheça a Cidade, História, Dados do Município, Localização, Telefones Úteis |
| **Cidadão** | IPTU 2026, Nota Fiscal Eletrônica (NFSe), Certidões Negativas, Iluminação Pública, Tributos Municipais, Ouvidoria Municipal |
| **Serviços** | Cidadão, Servidor, Empresas |
| **LRF** | RREO (Relatório Resumido da Execução Orçamentária), RGF (Relatório de Gestão Fiscal), LOA (Lei Orçamentária Anual), LDO (Lei de Diretrizes Orçamentárias), PPA (Plano Plurianual), Cronograma de Desembolso, Programação Financeira Anual, PCG (Contas de Governo), PCS (Contas de Gestão) |
| **Publicações** | Leis, Decretos, Portarias, Editais, Diárias, Ofícios, Portal Licitações, Lei de Responsabilidade Fiscal |
| **Servidor** | Contracheque, Portal RH, Calendário de Pagamento, Informe de Rendimentos, Recadastramento Online |
| **Transparência** | Portal da Transparência, e-SIC, Ouvidoria, Carta de Serviços, Dados Abertos, Fale Conosco |

---
## 2. Notas de Implementação
- **Dropdowns Profissionais:** Devem utilizar o componente de Menubar ou NavigationMenu do Shadcn/UI.
- **Responsividade:** Em dispositivos mobile, os menus devem ser agrupados em um menu "Hambúrguer" (Sheet).
- **Acessibilidade:** Garantir que todos os itens sejam navegáveis via teclado.
