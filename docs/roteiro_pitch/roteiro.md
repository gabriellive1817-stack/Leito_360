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
   `LEITO360_CNES_JSON` (JSON nativo), `LEITO360_POPULACAO_EXT` (external
   table) — e a view que integra os três.
3. Rodar a soma de internações por competência e comparar com os totais de
   controle do TabNet (diferença zero nas seis competências).
4. Abrir `oracle/sql/07_select_ai_profile.sql` e mostrar o perfil
   `LEITO360_AI` criado, restrito aos objetos do projeto.
5. **Se o serviço de inferência estiver saudável no dia**: rodar a pergunta 1
   de `oracle/sql/08_select_ai_perguntas.sql` com `SHOWSQL`, mostrar o SQL
   gerado, e depois `RUNSQL` com o resultado.
   **Se não estiver**: declarar o bloqueio como está documentado em
   [`docs/evidencias/select_ai_perguntas.md`](../evidencias/select_ai_perguntas.md)
   — nunca simular uma resposta.

## Depois de gravar

1. Publicar no YouTube como **não listado** (ou público, conforme a
   orientação da entrega).
2. Preencher o link no slide 17 da apresentação
   (`apresentacao/build_pptx.js`, bloco do slide 17) e regerar o PPTX.
3. Preencher o link também na seção de entregáveis do `README.md`.
