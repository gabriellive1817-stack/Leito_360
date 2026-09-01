# Roteiro do vídeo pitch — LEITO360 (até 5 minutos)

> Gravar somente depois que todos os links e componentes abaixo estiverem
> funcionando de verdade (GitHub público, aplicação publicada, Oracle com
> Select AI executado). Ver checklist em "Critérios de conclusão" no README.

## 0:00–0:30 — Desafio

- Gestores de saúde não têm uma visão comparativa única entre UFs sobre
  internações, permanência, mortalidade e leitos SUS cadastrados — os dados
  existem (SIH/SUS, CNES, IBGE), mas estão espalhados em sistemas separados
  e difíceis de cruzar.

## 0:30–1:00 — Objetivo

- Consolidar essas três fontes públicas em uma plataforma analítica única,
  reproduzível e transparente sobre suas limitações, com consulta em
  linguagem natural via Oracle Select AI.

## 1:00–2:00 — Solução e arquitetura Oracle

- Mostrar o diagrama de arquitetura (`README.md` / `docs/arquitetura/`):
  TabNet + IBGE → ETL Python → Oracle (relacional + JSON + external table)
  → view analítica → JSON estático → dashboard.
- Explicar rapidamente por que três formatos (relacional/JSON/CSV externo)
  e como a view `VW_LEITO360_ANALITICO` integra tudo.

## 2:00–4:00 — Demonstração hands-on

1. Mostrar o dashboard (Visão Executiva).
2. Alterar o filtro de competência e de região.
3. Selecionar uma UF no mapa e mostrar o card de detalhe.
4. Trocar para o Oracle Database Actions: mostrar a view integrada
   (`VW_LEITO360_ANALITICO`) e uma consulta de negócio real.
5. Executar uma pergunta real do Select AI (ex.: pergunta 1 de
   `oracle/sql/08_select_ai_perguntas.sql`) com `SHOWSQL` e depois `RUNSQL`.
6. Mostrar o SQL gerado pelo modelo e o resultado retornado.
7. Voltar ao dashboard e mostrar o Explorador Analítico + exportação CSV.

## 4:00–4:30 — Benefícios

- Dados oficiais, pipeline reprodutível e auditável (código aberto),
  indicadores com fórmula documentada, transparência sobre o que é (e o que
  não é) tempo real.

## 4:30–5:00 — Conclusão e próximos passos

- Recapitular o que foi implementado de fato nesta sprint (não "planejado").
- Próximos passos: ver seção "Próximos passos" do README.
- Agradecimentos à equipe e à FIAP/Oracle.
