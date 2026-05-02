# Padrão V4 Elite - Guia de UI/UX do Painel Administrativo

Este documento serve como referência definitiva para a criação e manutenção das interfaces do painel administrativo (V4 Elite). O objetivo é garantir consistência visual, usabilidade e facilidade de manutenção para qualquer desenvolvedor humano ou IA que atue neste projeto.

---

## 1. Estrutura Geral da Página de Edição / Criação (CRUD)

Toda página de formulário (`[id]/edit/page.tsx` ou `new/page.tsx`) deve obrigatoriamente seguir a estrutura **Dual-Column** (Duas Colunas) para telas grandes, com um **Cabeçalho Sticky** no topo.

### Container Principal
O componente principal deve retornar um container flexível preenchendo toda a altura com o fundo padrão.
```tsx
<div className="flex flex-col h-full bg-bg-main">
  {/* Cabeçalho */}
  {/* Corpo / Grid */}
</div>
```

---

## 2. Cabeçalho Sticky (Header)

O cabeçalho deve flutuar sobre o conteúdo quando a página "scrollar", mantendo as ações (Salvar/Cancelar) sempre visíveis.

**Classes obrigatórias do Header:**
```tsx
<header className="sticky top-0 z-[100] px-8 py-4 bg-white/90 backdrop-blur-md flex items-center justify-between border-b border-border-color mb-6 mx-[-32px] mt-[-32px] shadow-sm">
```

### Composição do Header:
1. **Lado Esquerdo:**
   - Botão de voltar (ícone `ArrowLeft` discreto, sem fundo, hover suave `bg-slate-100`).
   - Título da página (ex: "Editar Secretaria") em `h2` (`text-xl font-black text-slate-900 tracking-tight`).
   - Subtítulo com o ID do registro (`text-[11px] font-bold text-slate-400 uppercase`).

2. **Lado Direito (Ações):**
   - Separador visual (`<div className="w-px h-6 bg-slate-200 mx-1" />`).
   - **Botão Cancelar/Voltar:** Fundo branco, texto e borda cinza (`border-slate-200 text-slate-500 hover:bg-slate-50`).
   - **Botão Salvar (Primário):** Fundo azul vibrante/City Hall (`bg-[#004c99] hover:bg-[#003366] text-white shadow-lg shadow-blue-100`). Ambos devem usar `rounded-xl`.

---

## 3. Corpo e Layout de Grade (Grid)

O formulário é dividido em proporção 2:1 (`lg:grid-cols-3`).
- **Coluna Principal (Esquerda):** Ocupa 2/3 da tela (`lg:col-span-2`). Destinada aos dados principais e extensos (Nome, Descrição, Textos Ricos, Atributos de Grid).
- **Coluna Lateral (Direita):** Ocupa 1/3 da tela. Destinada a metadados (Status, Datas de Publicação, IDs, Zona de Exclusão e Upload de Imagem).

**Cards de Container (ambos os lados usam este padrão):**
```tsx
<div className="bg-white border border-border-color rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col gap-5">
```

---

## 4. Campos de Formulário e Inputs

O estilo dos inputs deve ser limpo e garantir excelente contraste de foco.

**Classes padrão para Inputs / Selects / Textareas:**
```tsx
className="w-full bg-white border border-border-color rounded-md px-3 py-2 text-[14px] text-text-primary outline-none focus:border-city-hall-accent focus:ring-2 focus:ring-city-hall-accent/50 transition-colors"
```
*(Dica: se o campo estiver `disabled`, adicione `disabled:bg-slate-50 disabled:text-slate-400`).*

**Padrão de Labels:**
Sempre utilize labels pequenas, em negrito e com cor chumbo. Se possível, inclua um ícone do `lucide-react` alinhado à esquerda na cor azul.
```tsx
<label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
  <IconName size={14} className="text-city-hall-blue" /> Nome do Campo
</label>
```

---

## 5. Upload de Imagens

O componente de upload fica tradicionalmente na **Coluna Lateral**. Ele deve usar um quadrado de proporção 1:1 (`aspect-square`) com bordas tracejadas.

**Estilo do Container de Upload:**
```tsx
<div className="aspect-square w-full max-w-[300px] mx-auto rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 bg-slate-50 hover:border-city-hall-accent hover:bg-blue-50/50 transition-all cursor-pointer group overflow-hidden relative shadow-inner">
```
- Se a imagem existir, ocrore o *preview* usando `<img className="w-full h-full object-cover object-top" />`.
- Botões de apoio ficam logo abaixo do bloco de imagem, utilizando padrão flex-row (`Trocar Foto` e lixeira para `Excluir Foto`).

---

## 6. Ação de Exclusão (Delete)

Não usar blocos isolados com fundos vermelhos grandes e alarmantes. A ação de excluir deve ficar de forma elegante e discreta no rodapé da **Coluna Lateral**.

```tsx
<div className="pt-4 border-t border-border-color">
  {/* ID de visualização ... */}
  <button
    onClick={handleDelete}
    className="w-full py-2.5 rounded-md border border-red-200 text-red-600 text-[13px] font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
  >
    <Trash2 size={15} />
    Excluir Registro
  </button>
</div>
```

---

## 7. Navegação e Interatividade (UX)

- **Feedback Visual:** Botões que disparam ações assíncronas (Salvar, Excluir, Uploading) devem mudar de estado. Use o estado `isPending` (do React Query) ou `loading` (state) para desabilitar o botão (`disabled={isPending}`) e alterar o texto (ex: de "Salvar" para "Salvando...").
- **Navegação de Teclado (Enter):** Todo formulário deve escutar a tecla `Enter` e pular para o próximo campo focalizável, não submetendo acidentalmente a página. Essa função costuma ser chamada `handleKeyDown` no `onKeyDown` dos inputs.

## Resumo das Cores (Tailwind Config)
- **Fundo Principal:** `bg-bg-main`
- **Acentos (Azul):** `text-city-hall-blue`, `border-city-hall-accent`, `bg-[#004c99]`
- **Bordas padrão:** `border-border-color` ou `border-slate-200`
- **Textos Base:** `text-text-primary`, `text-slate-700`

> 💡 **Regra de Ouro:** Se estiver na dúvida de como construir um componente novo, abra e estude o arquivo `src/app/(admin)/secretarias/[id]/edit/page.tsx` como a fonte de verdade absoluta do Padrão V4 Elite.
