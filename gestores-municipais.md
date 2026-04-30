# Módulo Gestores Municipais (Prefeitos e Vice-Prefeitos)

> **Status:** ⏸️ AGUARDANDO APROVAÇÃO DO USUÁRIO
> **Criado em:** 30/04/2025 às 16:58
> **Retomar em:** próxima sessão

---

## Objetivo

Criar o módulo completo de **Gestores Municipais** — incluindo banco de dados, crawler de raspagem, API REST e interface administrativa no painel — para registrar prefeitos e vice-prefeitos (atuais e históricos) vinculados a cada município.

---

## Análise do HTML Fornecido

**URL de raspagem:** `https://aracati.ce.gov.br/gestores.php`

A página possui **duas seções distintas**:

### 1. Gestores Atuais (cards no topo)
```
.centralizar-cabecalho > .titlepre > strong  → Nome
.titlepre > p:nth-child(2)                   → Cargo ("Prefeito(a)" / "Vice-prefeito(a)")
img[src*="prefeitos/"]                       → Foto
```

### 2. Gestores Históricos (tabela `#gestores`)
```
td[data-title="Data inicio"]  → data_inicio (formato DD/MM/AAAA)
td[data-title="Data fim"]     → data_fim
td[data-title="Nome"]         → nome
td[data-title="Cargo"]        → cargo (PREFEITO(A) / VICE-PREFEITO(A))
```

---

## Design do Banco de Dados

### Tabela: `tab_gestores`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` PK | Gerado automaticamente |
| `municipio_id` | `uuid` FK → `tab_municipios.id` | Relação com o município |
| `nome` | `text` NOT NULL | Nome completo do gestor |
| `cargo` | `text` NOT NULL | `'PREFEITO(A)'` ou `'VICE-PREFEITO(A)'` |
| `data_inicio` | `date` | Início do mandato |
| `data_fim` | `date` NULL | Fim do mandato (NULL = mandato atual) |
| `foto_url` | `text` NULL | URL pública da foto no Supabase Storage |
| `is_atual` | `boolean` DEFAULT false | Flag para o gestor ativo no momento |
| `exercicio` | `int4` NULL | Ano de referência |
| `status` | `text` DEFAULT 'rascunho' | `rascunho / publicado / arquivado` |
| `url_origem` | `text` NULL | URL de onde foi raspado |
| `created_at` | `timestamptz` | Auto |
| `updated_at` | `timestamptz` | Auto |

### SQL de criação
```sql
CREATE TABLE tab_gestores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    municipio_id uuid NOT NULL REFERENCES tab_municipios(id) ON DELETE CASCADE,
    nome text NOT NULL,
    cargo text NOT NULL CHECK (cargo IN ('PREFEITO(A)', 'VICE-PREFEITO(A)')),
    data_inicio date,
    data_fim date,
    foto_url text,
    is_atual boolean DEFAULT false,
    exercicio int4,
    status text DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicado','arquivado')),
    url_origem text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_gestores_municipio ON tab_gestores(municipio_id);
CREATE INDEX idx_gestores_atual ON tab_gestores(municipio_id, is_atual);
```

---

## O que será criado

| # | Arquivo | Tipo | Descrição |
|---|---|---|---|
| 1 | `tab_gestores` | SQL | Tabela no Supabase |
| 2 | `crawlers/raspar-gestores.js` | Crawler | Raspa gestores atuais e histórico |
| 3 | `portal-admin/src/app/api/gestores/route.ts` | API | GET lista + POST |
| 4 | `portal-admin/src/app/api/gestores/[id]/route.ts` | API | GET/PUT/DELETE por ID |
| 5 | `portal-admin/src/app/(admin)/gestores/page.tsx` | UI | Lista com badges Atual/Histórico |
| 6 | `portal-admin/src/app/(admin)/gestores/[id]/edit/page.tsx` | UI | Formulário de edição |
| 7 | `portal-admin/src/components/layout/Sidebar.tsx` | UI | Adicionar item "Gestores" no menu |
| 8 | `portal-admin/src/app/(admin)/scraper/page.tsx` | UI | Adicionar módulo GESTORES |

---

## ⏳ Perguntas Pendentes (Aguardando Resposta)

Antes de executar, o usuário precisa confirmar:

1. **Deduplicação do histórico**: Bismarck aparece 2x (mandato 2017-2020 e 2021-2024). Criar **2 registros separados** por mandato? *(Recomendado: SIM)*
2. **Foto dos históricos**: Gestores anteriores têm foto no site ou só os atuais?
3. **Posição no menu**: Item "Gestores" aparece logo **abaixo de "Secretarias"** na sidebar?

---

## Próximos Passos (quando retomar)

- [ ] Usuário confirma as 3 perguntas acima
- [ ] Criar tabela no Supabase (SQL acima)
- [ ] Criar `crawlers/raspar-gestores.js`
- [ ] Criar APIs REST
- [ ] Criar páginas do painel (lista + edição)
- [ ] Adicionar no menu lateral
- [ ] Testar raspagem com Aracati
- [ ] Commit no GitHub
