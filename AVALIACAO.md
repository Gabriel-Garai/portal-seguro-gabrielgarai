# Avaliação — GitHub Actions com IA

Dupla: Gabriel Martins dos Santos Garai e Rennan Raposo da Silva.
Repositório de Gabriel: https://github.com/Gabriel-Garai/portal-seguro-gabrielgarai

## Tarefa 1 — CI

O workflow verifica segredos versionados, aplica as migrações em SQLite local e valida o HTML.

- Execução com falha: https://github.com/Gabriel-Garai/portal-seguro-gabrielgarai/actions/runs/38011271398
- Execução aprovada após correção: https://github.com/Gabriel-Garai/portal-seguro-gabrielgarai/actions/runs/38011723620

Erro proposital registrado:

```text
Parse error near line 1: near "TABL": syntax error
CREATE TABL notas (
Error: Process completed with exit code 1.
```

A migração é testada em SQLite antes do D1 para detectar erros de sintaxe e aplicação antes de alterar o banco remoto.

## Tarefa 2 — Proteção da main

A regra da main exige pull request e aprovação do check verificar. A opção que impede administradores de ignorar essas exigências está habilitada.

PR com CI reprovado e depois aprovado:
https://github.com/Gabriel-Garai/portal-seguro-gabrielgarai/pull/1

A execução vermelha e a verde da Tarefa 1 registram os dois estados do CI nesse PR.

Teste de push direto na main, recusado:

```text
remote: - Changes must be made through a pull request.
remote: - Required status check "verificar" is expected.
! [remote rejected] main -> main (protected branch hook declined)
error: failed to push some refs
```

## Tarefa 3 — Revisão por IA

PR usado no teste:
https://github.com/Gabriel-Garai/portal-seguro-gabrielgarai/pull/2

Revisão que identificou SQL interpolado:
https://github.com/Gabriel-Garai/portal-seguro-gabrielgarai/pull/2#issuecomment-6203783057

Revisão após corrigir a consulta com prepare().bind(nome):
https://github.com/Gabriel-Garai/portal-seguro-gabrielgarai/pull/2#issuecomment-6203933194

Teste sem pull-requests: write:
https://github.com/Gabriel-Garai/portal-seguro-gabrielgarai/actions/runs/38820241058

Nesse teste, a revisão por IA passou, mas a etapa Comenta no PR falhou com código 1. A permissão foi restaurada e a execução seguinte passou.

### Análise crítica da IA

A primeira revisão começou afirmando que não encontrou vulnerabilidades, mas apresentou em seguida um achado de SQL interpolado. Essa conclusão inicial contradiz o próprio relatório e poderia induzir o leitor a ignorar o problema. Após a correção, a IA também classificou como erro de lógica a falta de suporte a forks, embora a avaliação determine PRs de branches do próprio repositório. O comportamento descrito para forks é uma limitação real, mas não constitui falha no fluxo exigido pela atividade.

## Tarefa 4 — Migrações D1

O workflow migrar executa em push na main apenas quando migrations/** é alterado.

PR da migração:
https://github.com/Gabriel-Garai/portal-seguro-gabrielgarai/pull/4

Execução aprovada e resultado do PRAGMA:
https://github.com/Gabriel-Garai/portal-seguro-gabrielgarai/actions/runs/38822122229/job/116720921714

Resultado de PRAGMA table_info(notas):

| cid | name | type | notnull | pk |
| --- | --- | --- | --- | --- |
| 0 | id | INTEGER | 0 | 1 |
| 1 | aluno | TEXT | 1 | 0 |
| 2 | nota | REAL | 1 | 0 |
| 3 | observacao | TEXT | 0 | 0 |

A consulta foi executada no banco remoto e retornou success: true.

### Teste sem alteração em migrations/

O PR nº 5 alterou somente AVALIACAO.md e foi incorporado à main:
https://github.com/Gabriel-Garai/portal-seguro-gabrielgarai/pull/5

No commit de merge f5127a2b23e5c17b747a06f859d370d8a23bd818, somente o workflow ci executou, com sucesso:
https://github.com/Gabriel-Garai/portal-seguro-gabrielgarai/actions/runs/38823682012

Não houve execução de migrar para esse commit, confirmando o filtro paths: ['migrations/**'].

## Perguntas

### 1. Por que o CI executa duas vezes?

O push na branch dispara o evento push e, com um PR aberto para main, também dispara pull_request. Para a proteção da main, quando existem resultados dos dois contextos, deve passar o check do PR associado ao commit de merge de teste.

### 2. Por que PRs de forks não recebem COPILOT_PAT?

Os secrets do repositório de destino não são disponibilizados normalmente a workflows pull_request vindos de forks, pois o código pode ser de pessoas não confiáveis. Isso impede que um atacante altere o workflow para enviar o token a um servidor externo.

### 3. Por que declarar permissions?

Declarar permissions torna explícitas as permissões mínimas necessárias e reduz a dependência das configurações padrão do repositório. Neste workflow, contents: read permite leitura e pull-requests: write permite publicar o comentário; retirar a escrita fez essa etapa falhar.

### 4. A revisão da IA substitui o status check?

Não neste fluxo: a IA publica comentários, enquanto o CI produz o check verificar exigido pela proteção da main. Além disso, as contradições e observações fora do escopo encontradas demonstram que a revisão precisa de avaliação humana e complementa as verificações automáticas.
