# Extração de Dados & Portal Administrativo V4 Elite 🏛️

Este repositório centraliza a inteligência de raspagem de dados municipais e o painel administrativo de nova geração (V4 Elite) para portais de transparência e institucionais.

## 🚀 Estrutura do Projeto

O ecossistema é dividido em três frentes principais:

### 1. 🕷️ Crawlers (`/crawlers`)
Scripts em Node.js responsáveis pela extração automatizada de dados (Secretarias, Gestores, Notícias, etc.) de portais oficiais.
- **Tecnologias:** Axios, Cheerio, Supabase.

### 2. ⚡ Portal Admin (`/portal-admin`)
Dashboard administrativo moderno construído para máxima eficiência operacional.
- **Stack:** Next.js 15+, TypeScript, Tailwind CSS (V4 Elite Design), TanStack Query, Framer Motion.
- **Design System:** Baseado no padrão **V4 Elite** (Dual-column layout).

### 3. 📄 Documentação Centralizada (`/docs`)
Guias estratégicos e técnicos para manutenção e expansão do sistema.
- **[Padrão UI V4 Elite](./docs/PADRAO_V4_ELITE.md):** Guia obrigatório para criação de novas telas.
- **Arquitetura:** Detalhes sobre multi-tenancy e integração com Supabase.

## 🛠️ Como Iniciar

### Requisitos
- Node.js 18+
- Instância do Supabase configurada.

### Rodando o Dashboard
```bash
cd portal-admin
npm install
npm run dev
```

### Executando Crawlers (Manual)
```bash
node crawlers/nome-do-crawler.js
```

---

## 🧠 Inteligência Artificial (Agentic Kit)
Este projeto é otimizado para desenvolvimento assistido por IA. Toda a configuração de comportamento, habilidades e fluxos de trabalho dos agentes está contida na pasta `.agent/` e no arquivo `GEMINI.md`.

> **Nota para IAs:** Antes de qualquer alteração de UI, consulte obrigatoriamente o arquivo `docs/PADRAO_V4_ELITE.md`.
