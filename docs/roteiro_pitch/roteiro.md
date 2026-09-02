# Roteiro do vídeo pitch — LEITO360 (até 5 minutos)

Este arquivo é o **plano da gravação**: o que aparece na tela, em que ordem e
por quanto tempo. O texto falado, já dividido por integrante, está em
[`texto_pitch.md`](texto_pitch.md).

## Checagem antes de gravar

| Item | Como confirmar |
|---|---|
| Repositório público | abrir [github.com/gabriellive1817-stack/Leito_360](https://github.com/gabriellive1817-stack/Leito_360) em janela anônima |
| Aplicação no ar | abrir [gabriellive1817-stack.github.io/Leito_360](https://gabriellive1817-stack.github.io/Leito_360/) em janela anônima |
| Dados carregados | o dashboard abre em Abr/2026 com 1.218.903 internações |
| Oracle acessível | Database Actions logado, `SELECT COUNT(*) FROM VW_LEITO360_ANALITICO` devolvendo 162 |
| Select AI vivo | `DBMS_CLOUD_AI.GENERATE(... action => 'chat')` respondendo em segundos |
| Apresentação | PPTX aberto na capa, em modo apresentação |

Abas abertas e logadas **antes** de iniciar a gravação: apresentação,
dashboard publicado, Database Actions.

## Divisão por tempo

| Tempo | Bloco | Quem fala | O que aparece na tela |
|---|---|---|---|
| 0:00–0:30 | O problema | Natália | Capa da apresentação (slide 1) |
| 0:30–1:00 | O objetivo e o escopo | Natália | Slide 2 (contexto) |
| 1:00–2:00 | Arquitetura Oracle | Gabriel | Slide 9 (diagrama ponta a ponta) |
| 2:00–3:00 | Demo do dashboard | Vitória | Aplicação publicada, ao vivo |
| 3:00–4:00 | Demo do Oracle | Pedro | Database Actions, ao vivo |
| 4:00–4:30 | Benefícios | João | Slide 6 (evidência do pipeline) |
| 4:30–5:00 | Conclusão | Gabriel | Slide 10 (o que foi implementado) |

## Sequência da demonstração do dashboard (2:00–3:00)

1. Abrir a aplicação publicada com a **URL visível na barra de endereços**.
2. Visão Executiva em Brasil · Abr/2026 — ler os quatro indicadores do topo.
3. Apontar o mapa: malha oficial do IBGE, cor por tercil de pressão
   assistencial, com os cortes na legenda.
4. **Clicar no Paraná** — mostrar que os indicadores, o ranking e a série de
   seis competências passam a responder só por aquela UF.
5. "Limpar recorte" para voltar ao Brasil.
6. Ir para o **Explorador Analítico**: trocar a consulta selecionada, mostrar
   o SQL equivalente marcado como não gerado por IA, o card de qualidade e
   cobertura, e o botão de exportação em CSV.

## Sequência da demonstração do Oracle (3:00–4:00)

1. `SELECT COUNT(*) FROM VW_LEITO360_ANALITICO;` → 162.
2. Mostrar os três objetos separados: `LEITO360_SIH` (relacional),
   `LEITO360_CNES_JSON` (JSON nativo), `LEITO360_POPULACAO` — e a view que
   integra os três.
3. Rodar a soma de internações por competência e comparar com os totais de
   controle do TabNet (diferença zero nas seis competências).
4. Mostrar o perfil `LEITO360_AI` criado com
   `oracle/sql/07_select_ai_profile.sql`, restrito aos objetos do projeto,
   provider Cohere.
5. Rodar a pergunta 1 de `oracle/sql/08_select_ai_perguntas.sql` com
   `SHOWSQL` — **ler em voz alta o SQL que o modelo gerou sozinho**: ele
   escolheu a view analítica, a competência `2026-04` e a coluna
   `INTERNACOES_POR_100K_HAB` sem nenhuma dica no prompt.
6. Rodar o `RUNSQL` da mesma pergunta, na versão com `JSON_TABLE`, para o
   resultado sair como tabela em vez de JSON compactado.
7. **Declarar as limitações na própria demo** (isso conta a favor, não
   contra): `showsql` e `runsql` são chamadas independentes ao modelo e podem
   gerar SQL diferente; o `runsql` devolveu os valores certos fora da ordem
   pedida; e a ação `chat` chegou a alucinar sobre o próprio projeto porque
   não consulta o banco. Tudo documentado em
   [`docs/evidencias/select_ai_perguntas.md`](../evidencias/select_ai_perguntas.md)
   — nunca simular uma resposta.

### Se algo falhar durante a gravação

- `ORA-24247` (network ACL): rodar o Passo 1 de `07_select_ai_profile.sql`.
- `ORA-20401` (authorization failed): a chave do Cohere foi colada com
  espaço/corte — recriar a credencial copiando pelo botão de cópia do painel.
- `ORA-00942` no início dos scripts de recriação: é o `DROP TABLE` de uma
  tabela que ainda não existe. Esperado, pode seguir.

## Depois de gravar — concluído

Gravado e publicado: https://www.youtube.com/watch?v=IAoJ_zeWXmQ

O link está no slide 17 do PPTX e na seção **Entregáveis** do
[`README.md`](../../README.md). Ele é escrito por
`apresentacao/build_pptx.js` (bloco do slide 17), então sobrevive a novas
gerações do PPTX.
