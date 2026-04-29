# Plano de Ação: Ajustes UI Secretarias e Vinculação de Dados

## 1. Contexto e Objetivos
O objetivo deste plano é corrigir inconsistências na interface de edição de secretarias, alinhar a exibição com o design de "Notícias", corrigir problemas de salvamento de CNPJ e Horário, e entender por que a raspagem não inseriu os dados esperados.

## 2. Tarefas de Frontend (UI/UX)
- **Remoção de Campos Desnecessários:** Remover campo `sec_id` (se visível/usado) e evitar duplicação do campo "status".
- **Ajuste na Coluna Lateral (Right Card):** 
  - Renomear o título/label "Visibilidade" para "Status da Publicação".
  - Posicionar o campo "Data de Publicação" logo abaixo do "Status da Publicação".
  - Analisar o print do usuário (referenciado na conversa) para remover qualquer campo extra.
- **Botões de Ação na Tela Principal:** Ajustar os botões de ação e suas funções na listagem principal de secretarias (`/secretarias/page.tsx`).
- **Alinhamento de Texto:** Corrigir o alinhamento do texto das descrições/biografias para garantir que fiquem alinhados à esquerda, não justificados ao recarregar a página.

## 3. Tarefas de Integração de Dados (Backend/Frontend)
- **CNPJ e Horário:** Ajustar os campos `cnpj` e `horario_funcionamento` no formulário para garantir que os nomes das chaves (`horario_atendimento` vs `horario_funcionamento`) correspondam exatamente ao que a API e o banco de dados esperam.
- **Investigação do Crawler:** Solicitar ao usuário a estrutura atual da tabela `tab_secretarias` no Supabase ou os logs do console ao rodar o crawler, para descobrir por que "os campos não foram preenchidos na base de dados".

## 4. Ordem de Execução
1. Atualizar a UI do formulário (`[id]/edit/page.tsx`).
2. Atualizar a listagem de secretarias (`page.tsx`).
3. Diagnosticar as falhas de persistência do crawler baseando-se no feedback do usuário.
