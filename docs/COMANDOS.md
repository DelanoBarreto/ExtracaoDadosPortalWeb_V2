# Guia de Comandos - IflexusPortalGov 🛠️

Este documento centraliza os comandos essenciais para o desenvolvimento, versionamento e gestão do agente de IA no projeto.

## 🚀 Desenvolvimento (Next.js)

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento local. |
| `npm run build` | Cria o build de produção otimizado. |
| `npm run start` | Inicia o servidor de produção após o build. |
| `npm run lint` | Executa a verificação de linting (código limpo). |

## 📁 Versionamento (Git)

Comandos para manter o código seguro no GitHub:

- **Verificar status:** `git status`
- **Adicionar mudanças:** `git add .`
- **Criar backup (Commit):** `git commit -m "Explicação da mudança aqui"`
- **Enviar para nuvem:** `git push origin main`

## 🧠 Gestão de IA Skills (Antigravity Kit)

Este projeto utiliza o sistema de Skills para potencializar o desenvolvimento assistido:

- **Listar Skills:** `npx skills list`
- **Verificar conformidade:** `python .agent/scripts/checklist.py .`
- **Auditoria de UX:** `python .agent/skills/frontend-design/scripts/ux_audit.py`

## 🐳 Supabase CLI (Opcional)

Se houver necessidade de gerenciar o banco localmente:

- **Iniciar Supabase:** `npx supabase start`
- **Criar Migration:** `npx supabase migration new nome_da_mudanca`
- **Aplicar Mudanças:** `npx supabase db push`

---
> [!TIP]
> Use o prefixo `npx` para garantir que as ferramentas utilizem as versões instaladas no projeto.
