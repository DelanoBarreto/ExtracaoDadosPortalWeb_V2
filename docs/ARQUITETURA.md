# Arquitetura do IflexusPortalGov 🏗️

O IflexusPortalGov utiliza uma arquitetura **SaaS Multi-tenant** moderna, focada em isolamento de dados, performance e escalabilidade.

## 📁 Estrutura de Pastas (Next.js App Router)

```text
/
├── .agent/              # Configurações de agentes e skills de IA
├── public/              # Ativos estáticos (ícones, imagens globais)
├── src/
│   ├── app/             # Rotas do Next.js (App Router)
│   │   ├── [tenant]/    # Rotas dinâmicas baseadas no slug da prefeitura
│   │   ├── admin/       # Dashboard global (Super Admin)
│   │   └── api/         # Endpoints de API e Webhooks
│   ├── components/      # Componentes React
│   │   ├── ui/          # Componentes shadcn/ui (base)
│   │   ├── layout/      # Header, Footer, Sidebar por tenant
│   │   └── modules/     # Módulos específicos (Notícias, Licitações)
│   ├── hooks/           # Hooks customizados (ex: useTenant)
│   ├── lib/             # Utilitários e instâncias (Supabase Client)
│   ├── services/        # Lógica de comunicação com Supabase (Data Fetching)
│   ├── styles/          # Configurações globais de CSS (Tailwind)
│   └── types/           # Definições de TypeScript e Schemas do Banco
├── tailwind.config.ts   # Configuração de temas dinâmicos
└── supabase/            # Migrations e políticas de RLS
```

## 🔐 Lógica Multi-tenancy

### 1. Identificação do Tenant
O sistema identifica a prefeitura através do **slug** na URL (ex: `portal.gov.br/aracati` ou `aracati.portal.gov.br`).

### 2. Isolamento de Dados (Supabase RLS)
Todas as tabelas possuem uma coluna `tenant_id`. As **Row Level Security Policies** garantem que um usuário só possa acessar dados vinculados ao seu tenant:
```sql
-- Exemplo de política RLS
CREATE POLICY "Tenant isolation" ON noticias
FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### 3. Tematização Dinâmica
O Tailwind CSS é configurado para utilizar variáveis CSS que são injetadas dinamicamente com base nas configurações da prefeitura (cores, logos) armazenadas no banco de dados.

## 📱 Design System (Clean UI)
- **Bordas:** `rounded-2xl` (16px).
- **Sombras:** `shadow-sm` e `shadow-md` suaves.
- **Responsividade:** Estratégia Mobile-First com tabelas adaptativas.
- **Tipografia:** Inter (interface) e Source Sans 3 (conteúdo textual).
6: 
## 🧹 Gestão de Arquivos e Limpeza de Storage
7: 
8: Para manter a integridade do sistema e evitar custos desnecessários com armazenamento:
9: - **Deleção em Cascata:** Sempre que um registro for removido do banco de dados (Notícias, Gestores, Secretarias, LRF), o sistema **deve obrigatoriamente** remover os arquivos associados no Supabase Storage.
10: - **Single Delete:** As rotas `DELETE /api/[modulo]/[id]` buscam a URL do arquivo antes de apagar o registro.
11: - **Bulk Delete:** A rota `/api/admin/delete-items` processa múltiplos IDs e limpa todos os arquivos (incluindo JSONB `anexos`) antes da exclusão em lote.

