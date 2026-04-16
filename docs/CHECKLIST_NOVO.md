# Checklist: Onboarding IflexusPortalGov 🚀

Siga este guia para configurar seu ambiente e começar a contribuir para o projeto.

## 1. Configuração do Ambiente Local
- [ ] **Node.js:** Instale a versão LTS funcional (v20+ recomendada).
- [ ] **Git:** Certifique-se de que o Git está configurado corretamente.
- [ ] **Editor:** VS Code recomendado com extensões (Tailwind CSS, ESLint, Prettier).

## 2. Preparação do Repositório
- [ ] Clone o repositório do GitHub.
- [ ] Execute `npm install` para baixar as dependências.
- [ ] Copie o arquivo `.env.example` para `.env.local`.

## 3. Conexão com Supabase
- [ ] Solicite as chaves `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` ao Super Admin.
- [ ] Adicione as chaves ao seu `.env.local`.
- [ ] Verifique se o acesso ao banco está funcionando (tente listar os tenants via script ou console).

## 4. Primeiros Passos no Desenvolvimento
- [ ] Rode `npm run dev` e acesse `localhost:3000`.
- [ ] Explore a estrutura de pastas descrita em `ARQUITETURA.md`.
- [ ] Crie seu primeiro componente utilizando os padrões da `shadcn/ui`.

## 5. Fluxo de Trabalho
- [ ] Sempre crie uma branch nova para cada funcionalidade (`git checkout -b feature/nome`).
- [ ] Antes de enviar, rode `npm run lint` para garantir a qualidade do código.
- [ ] Utilize o comando de checklist da IA para auditoria final: `python .agent/scripts/checklist.py .`.

---
> [!IMPORTANT]
> O IflexusPortalGov é um sistema **multi-tenant**. Ao testar localmente, lembre-se de simular o comportamento de diferentes slugs de prefeituras.
