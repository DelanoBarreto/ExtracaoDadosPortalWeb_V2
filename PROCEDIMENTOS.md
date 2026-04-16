# Procedimentos para Novo Projeto 🚀

Este guia descreve como iniciar um novo projeto utilizando o **Kit Antigravity**.

## 1. Preparação Inicial
1.  Crie a pasta do seu novo projeto.
2.  Copie todo o conteúdo desta pasta (`ModelodeProjeto`) para a raiz do seu novo projeto.
    *   Isto inclui a pasta `.agent/` e o arquivo `GEMINI.md`.

## 2. Ativação da IA
1.  Abra a pasta do projeto no VS Code (ou sua IDE de preferência).
2.  Inicie uma conversa com o Agente Antigravity.
3.  **Primeiro Comando:** Digite `/init-docs`.
4.  Responda às perguntas socráticas para definir o escopo, tecnologia e objetivos.

## 3. Estruturação Técnica 📁
O Agente irá criar/atualizar os documentos técnicos dentro da pasta `docs/` para manter a raiz limpa:
- `README.md` (Fica na raiz)
- `docs/ARQUITETURA.md` (Mapa do projeto)
- `docs/COMANDOS.md` (Scripts e comandos Git)
- `docs/CHECKLIST_NOVO.md` (Onboarding)
- `docs/STATUS_PROJETO.md` (Acompanhamento)

> **Nota:** Arquivos de sistema como `package.json`, `tsconfig.json` e `next.config.ts` **devem** permanecer na raiz para o funcionamento do projeto.

## 4. Comandos e Slash Commands 🛠️

Aqui estão todos os comandos que você pode usar para interagir comigo:

| Comando | O que faz | Quando usar |
| :--- | :--- | :--- |
| `/init-docs` | Inicializa README, ARQUITETURA, COMANDOS e CHECKLIST. | **Obrigatório** no início de cada projeto. |
| `/brainstorm` | Inicia uma sessão de descoberta e ideias. | Antes de definir uma nova feature complexa. |
| `/plan` | Cria um arquivo de plano detalhado (`PLAN.md`). | Antes de começar a escrever qualquer código novo. |
| `/ui-ux-pro-max` | Ativa a inteligência de design premium. | Para criar ou refatorar interfaces e telas. |
| `/orchestrate` | Coordena vários agentes especialistas (Frontend, Backend, etc). | Para tarefas grandes que envolvem todo o sistema. |
| `/enhance` | Sugere e aplica melhorias em código existente. | Quando quer deixar algo que já existe ainda melhor. |
| `/debug` | Inicia um processo sistemático de busca de erros. | Quando algo não está funcionando como deveria. |
| `/test` | Cria e executa suítes de testes. | Para garantir que o código está sólido e sem bugs. |
| `/create` | Ajuda a criar novos módulos ou estruturas do zero. | Quando precisa de um "boilerplate" ou nova parte do app. |
| `/status` | Mostra o progresso atual das tarefas. | Para saber o que falta para terminar o objetivo. |
| `/preview` | Gerencia o servidor local (dev server). | Para ver o projeto rodando ou verificar erros de runtime. |
| `/deploy` | Prepara o projeto para o ambiente de produção. | Quando terminar tudo e for colocar o site no ar. |

## 5. Regras de Ouro (Sempre Ativas)
- **Protocolo Socrático:** O agente sempre perguntará antes de agir em tarefas complexas.
- **Clean Code:** Código direto, sem comentários desnecessários.
- **Design Premium:** Interfaces modernas, sem placeholders, e sem a cor roxa (Purple Ban).

---
*Assinado: Agente @orchestrator*
