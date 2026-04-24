Plano Diretor: Ecossistema de Portais Municipais v4
Visão Estratégica, Técnica e Operacional
1. Visão Geral do Ecossistema
O sistema foi concebido como uma plataforma Multi-tenant SaaS (Software as a Service) para atender Prefeituras e Câmaras. A arquitetura resolve três problemas simultâneos:
Legado: Migração rápida via raspagem de dados.
Gestão: Painel administrativo para conformidade com a LRF (Lei de Responsabilidade Fiscal).
Transparência: Portal público de alta performance e acessibilidade.
2. Arquitetura de Software: Monorepo Estruturado
Utilizaremos a abordagem de Monorepo para manter o código-fonte organizado, permitindo que diferentes aplicações compartilhem a mesma lógica de negócio e tipagem.
code
Text
/municipio-plataforma
├── /apps
│   ├── portal-web         # Next.js 15 (SSR/Static) - Foco no Cidadão (SEO)
│   ├── painel-admin       # Next.js 15 (CSR) - Foco no Gestor (Segurança)
│   └── crawler-service    # Node.js + Playwright - Motor de Ingestão de Dados
├── /packages
│   ├── ui-shared          # Design System "Elite City Hall" (Tailwind 4.0 + Framer Motion)
│   ├── supabase-client    # Configurações de Banco, RLS e Queries compartilhadas
│   ├── types              # Interfaces TypeScript globais (Municipio, Noticia, Lei)
│   └── utils              # Helpers de formatação LRF, CNPJ e datas governamentais
3. Estratégia Multi-tenant (Isolamento de Dados)
Para gerenciar múltiplos municípios em um único banco sem vazamento de dados:
A. Identificação por Domínio (Middleware)
O Portal Web usará o middleware.ts do Next.js para interceptar a requisição:
O sistema identifica o domínio: www.aracati.ce.gov.br.
Consulta o banco por um tenant_id vinculado a esse domínio.
Injeta as configurações (cores, logos, menus ativos) no contexto global.
B. Banco de Dados (Supabase + RLS)
Todas as tabelas terão uma coluna municipio_id. Aplicaremos Row Level Security (RLS):
Portal Público: Tem permissão SELECT apenas onde o municipio_id corresponde ao domínio ativo.
Painel Admin: O usuário logado só enxerga/edita registros vinculados ao seu municipio_id.
4. Ecossistema de Extração e Sincronização (Crawler)
A raspagem não é apenas um script, é um Pipeline de Ingestão:
Engine: O Playwright acessa o site legado e extrai dados brutos.
Sanitização: O script limpa o HTML sujo, remove scripts maliciosos e padroniza o texto.
Storage: Se houver PDFs de leis/licitações, o crawler faz o upload para o Supabase Storage (não linkamos o arquivo do site antigo, nós o possuímos).
Estado de Aprovação: Os dados entram no banco com status: 'rascunho'. Isso evita que erros da raspagem apareçam automaticamente no site novo.
Notificação: O sistema alerta o administrador do município no Painel: "15 novas notícias importadas do site antigo. Revisar agora?"
5. Painel Administrativo Dinâmico
O painel será o cérebro da operação:
Módulos Ativáveis: O administrador geral (você) pode ativar/desativar módulos por prefeitura (ex: Aracati tem módulo de "Turismo", mas uma cidade do interior não).
Gestão de Conteúdo: Interface para editar o que foi raspado e publicar manualmente.
Auditoria: Log de todas as ações (quem publicou a lei X no dia Y).
6. Stack Tecnológica v4 (Detalhada)
Camada	Tecnologia	Implementação
Frontend	Next.js 15.1	App Router com Server Components para SEO.
Estilização	Tailwind CSS 4.0	Uso de Variáveis CSS Dinâmicas para temas (Primary/Secondary) baseadas no município.
Banco de Dados	Supabase (Postgres)	Utilização de Views para relatórios da LRF e Realtime para notificações de admin.
Data Fetching	TanStack Query v5	Cache de 5 minutos para o portal público para reduzir custos de leitura no banco.
Animações	Framer Motion	Layout "Premium" com transições fluidas entre páginas de serviços.
Crawler	Playwright + Node	Rodando em instâncias isoladas para não onerar o servidor do portal.
7. Requisitos de Compliance (O que não pode faltar)
Para o sistema ser aceito por órgãos de controle (TCE/MP):
Acessibilidade (e-MAG): Contraste alto, redimensionamento de fonte e compatibilidade com leitores de tela.
Transparência Ativa: Área específica para LRF, RREO, RGF e Licitações com busca por data e filtros.
LGPD: Consentimento de cookies e tratamento de dados de servidores públicos.
SEO Governamental: URLs amigáveis (ex: /leis/lei-organica-123) e metadados OpenGraph para compartilhamento em redes sociais.
8. Roadmap de Implementação (Próximos Passos)
Fase 1: Fundação (Atual)

Configurar Monorepo e Shared Packages.

Criar o Schema consolidado no Supabase (Municípios, Usuários, Notícias, Documentos, Configurações).

Implementar Middleware de Domínio no Portal Web.
Fase 2: Integração da Raspagem

Conectar o Crawler ao banco Supabase.

Implementar rotina de download de anexos (PDFs) para o Storage.

Criar a fila de revisão (Draft Mode) no Banco.
Fase 3: Painel Admin & UI Dinâmica

Desenvolver Dashboard do Admin com autenticação RBAC (Role-Based Access Control).

Implementar o Design System "Elite City Hall Blue" como tema padrão e variáveis de cor customizáveis.

Criar gerador automático de menus baseado nas configurações do banco.
Fase 4: Lançamento e Escala

Deploy na Vercel (Portal e Admin).

Teste de carga e otimização de queries.

Onboarding do primeiro município real (Aracati).
Conclusão
Esta estrutura separa o trabalho pesado (crawler e banco) da exibição leve (portal público) e da gestão segura (admin). Ao usar Next.js 15 e Tailwind 4, você está na fronteira da tecnologia, garantindo que o sistema não fique obsoleto nos próximos 5 anos.
Dicas Extras para o seu Cenário:
Pastas Separadas: Sim, mantenha portal, admin e scraper em pastas separadas dentro do Monorepo. Elas rodam em ambientes diferentes.
Sincronia: Não tente fazer o portal web "conversar" com a pasta do crawler. Eles devem conversar apenas através do banco de dados (Supabase).
Performance: No Portal Público, use revalidatePath ou ISR (Incremental Static Regeneration). Isso faz com que o site seja um arquivo estático ultra-rápido, mas que se atualiza assim que o admin clica em "Publicar".