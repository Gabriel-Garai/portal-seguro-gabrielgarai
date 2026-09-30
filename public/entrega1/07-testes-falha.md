# Testes de falha

## Caso 1: retorno sem cookie temporário
- Preparação: iniciei o login em janela comum, parei na página do provedor e copiei a URL de autorização para uma janela privativa (sem `__Host-oauth-tx`).
- Pedido enviado: concluí o login na janela privativa; o provedor redirecionou para https://portal-seguro-gabrielgarai.pages.dev/oauth/callback/{provider}`.
- Resultado esperado: 400 "Falha na autenticação." e nenhuma sessão criada.
- Resultado observado: 400 Bad Request retornado com a mensagem "Falha na autenticação." e nenhuma sessão foi criada no banco D1 devido à ausência do cookie de transação (__Host-oauth-tx).

## Caso 2: state alterado
- Preparação: iniciei outro login e parei na página do provedor.
- Pedido enviado: alterei um caractere do parâmetro `state` e prossegui.
- Resultado esperado: retorno recusado (400) antes da troca do código.
- Resultado observado: 400 Bad Request recusado imediatamente pelo servidor antes de prosseguir para a troca do código, pois o parâmetro state enviado não coincidiu com o valor armazenado no cookie.

## Caso 3: reutilização da transação
- Preparação: após login bem-sucedido, copiei a URL da requisição de retorno (Network > Copy URL).
- Pedido enviado: abri novamente a mesma URL.
- Resultado esperado: falha, pois a transação já foi apagada.
- Resultado observado: Falha na autenticação (erro 400), pois o registro da transação de OAuth foi apagado do banco D1 imediatamente após o primeiro uso bem-sucedido (proteção contra replay).

## Caso 4: sessão expirada
- Preparação: com sessão criada, executei no console D1 `UPDATE sessions SET expires_at = 0;`.
- Pedido enviado: recarreguei a página (GET /api/me).
- Resultado esperado: 401.
- Resultado observado: 401 Unauthorized retornado ao requisitar a rota /api/me, confirmando que a alteração manual da validade no D1 invalidou a sessão.   

## Caso 5: origem inválida na saída
- Preparação: sessão válida aberta em URL_BASE; abri https://example.com.
- Pedido enviado: `fetch("https://portal-seguro-gabrielgarai.pages.dev/oauth/logout",{method:"POST",credentials:"include"})` no console.
- Resultado esperado: 403; sessão original continua válida.
- Resultado observado: 403 Forbidden retornado pelo endpoint de logout devido à validação de origem (Origin check), e a sessão na aba original permaneceu ativa e válida.

## Caso 6: reutilização do cookie revogado
- Preparação: copiei temporariamente o valor de `__Host-session` (apagado depois), executei o logout.
- Pedido enviado: restaurei o valor do cookie e consultei /api/me.
- Resultado esperado: 401 (linha removida do D1).
- Resultado observado: 401 Unauthorized retornado ao consultar /api/me, pois a linha correspondente à sessão foi completamente removida da tabela do D1 durante o processo de logout.
