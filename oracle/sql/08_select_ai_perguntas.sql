-- =============================================================================
-- LEITO360 — Perguntas do Select AI
--
-- Pré-requisito: perfil LEITO360_AI criado com a Opção B (Cohere) de
-- 07_select_ai_profile.sql, incluindo a liberação de ACL de rede.
--
-- Cada pergunta roda em duas ações:
--   SHOWSQL — mostra o SQL que o modelo gerou a partir da pergunta em português
--   RUNSQL  — executa e devolve o resultado (JSON)
--
-- ATENÇÃO (observado na execução real): SHOWSQL e RUNSQL são DUAS chamadas
-- independentes ao modelo. Ele pode gerar SQL diferente em cada uma — o
-- comportamento é não determinístico. Leia as duas como execuções distintas,
-- não como "o SQL e o resultado dele".
--
-- REGRA DO PROJETO: não escreva SQL à mão e cole como se fosse gerado pela IA.
-- Rode de verdade e transcreva a saída da tela abaixo de "RESULTADO REAL".
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Pergunta 1: "Quais Unidades da Federação tiveram mais internações por 100
-- mil habitantes em abril de 2026?"
SELECT DBMS_CLOUD_AI.GENERATE(
    prompt       => 'Quais Unidades da Federação tiveram mais internações por 100 mil habitantes em abril de 2026?',
    profile_name => 'LEITO360_AI',
    action       => 'showsql')
FROM dual;

SELECT DBMS_CLOUD_AI.GENERATE(
    prompt       => 'Quais Unidades da Federação tiveram mais internações por 100 mil habitantes em abril de 2026?',
    profile_name => 'LEITO360_AI',
    action       => 'runsql')
FROM dual;

-- RESULTADO REAL (01/09/2026, sandbox MovieStreamWorkshop229748, provider cohere):
--
-- SHOWSQL (2,87 s) — SQL gerado pelo modelo, transcrito sem edição:
--   SELECT vw."ESTADO", vw."SIGLA_UF"
--   FROM "ADMIN"."VW_LEITO360_ANALITICO" vw
--   WHERE vw."COMPETENCIA" = '2026-04'
--   ORDER BY vw."INTERNACOES_POR_100K_HAB" DESC
--
-- RUNSQL (1,75 s) — início do retorno:
--   [ { "ESTADO" : "Rondônia", "SIGLA_UF" : "RO", "INTERNACOES_POR_100K_HAB" : 701.17 },
--     { "ESTADO" : "Acre",     "SIGLA_UF" : "AC", "INTERNACOES_POR_100K_HAB" : 557.67 },
--     { "ESTADO" : "Amazonas", "SIGLA_UF" : "AM", ... ]
--
-- INTERPRETAÇÃO: o modelo escolheu sozinho a view analítica correta, a
-- competência correta e o indicador correto — NL2SQL real sobre o schema do
-- LEITO360, sem SQL escrito à mão.
--
-- LIMITAÇÃO OBSERVADA: o retorno do RUNSQL veio na ordem RO (11), AC (12),
-- AM (13) — ordem de codigo_uf, não do indicador. Pelo pipeline validado, o
-- topo real de abr/2026 é PR 703,74 · SC 702,27 · RO 701,17 · AP 686,83 ·
-- RS 664,58. Os VALORES conferem exatamente com o ETL; a ORDEM não. O SQL
-- efetivamente executado pelo RUNSQL provavelmente não trouxe o ORDER BY.
-- Conferir sempre a saída do Select AI contra data/processed/.

-- Apresentação do mesmo resultado como tabela relacional, com a ordenação
-- garantida pelo SQL do projeto (e não pelo SQL gerado pelo modelo):
SELECT jt.*
FROM (
    SELECT DBMS_CLOUD_AI.GENERATE(
        prompt       => 'Quais Unidades da Federação tiveram mais internações por 100 mil habitantes em abril de 2026?',
        profile_name => 'LEITO360_AI',
        action       => 'runsql') AS resultado
    FROM dual
) t,
JSON_TABLE(t.resultado, '$[*]'
    COLUMNS (
        estado                   VARCHAR2(60) PATH '$.ESTADO',
        sigla_uf                 VARCHAR2(2)  PATH '$.SIGLA_UF',
        internacoes_por_100k_hab NUMBER       PATH '$.INTERNACOES_POR_100K_HAB'
    )
) jt
ORDER BY internacoes_por_100k_hab DESC;


-- ---------------------------------------------------------------------------
-- Pergunta 2: "Quais regiões possuem menor oferta de leitos SUS por 10 mil
-- habitantes?"
SELECT DBMS_CLOUD_AI.GENERATE(
    prompt       => 'Quais regiões possuem menor oferta de leitos SUS por 10 mil habitantes?',
    profile_name => 'LEITO360_AI',
    action       => 'showsql')
FROM dual;

SELECT DBMS_CLOUD_AI.GENERATE(
    prompt       => 'Quais regiões possuem menor oferta de leitos SUS por 10 mil habitantes?',
    profile_name => 'LEITO360_AI',
    action       => 'runsql')
FROM dual;
-- RESULTADO REAL:


-- ---------------------------------------------------------------------------
-- Pergunta 3: "Quais Unidades da Federação possuem permanência média acima
-- da média nacional?"
SELECT DBMS_CLOUD_AI.GENERATE(
    prompt       => 'Quais Unidades da Federação possuem permanência média acima da média nacional em abril de 2026?',
    profile_name => 'LEITO360_AI',
    action       => 'showsql')
FROM dual;

SELECT DBMS_CLOUD_AI.GENERATE(
    prompt       => 'Quais Unidades da Federação possuem permanência média acima da média nacional em abril de 2026?',
    profile_name => 'LEITO360_AI',
    action       => 'runsql')
FROM dual;
-- RESULTADO REAL:


-- ---------------------------------------------------------------------------
-- Pergunta 4: "Quais UFs apresentaram maior aumento de internações entre
-- março e abril de 2026?"
SELECT DBMS_CLOUD_AI.GENERATE(
    prompt       => 'Quais UFs apresentaram maior aumento de internações entre março e abril de 2026?',
    profile_name => 'LEITO360_AI',
    action       => 'showsql')
FROM dual;

SELECT DBMS_CLOUD_AI.GENERATE(
    prompt       => 'Quais UFs apresentaram maior aumento de internações entre março e abril de 2026?',
    profile_name => 'LEITO360_AI',
    action       => 'runsql')
FROM dual;
-- RESULTADO REAL:


-- ---------------------------------------------------------------------------
-- Pergunta 5: "Compare internações e leitos SUS cadastrados por região em
-- abril de 2026."
SELECT DBMS_CLOUD_AI.GENERATE(
    prompt       => 'Compare internações e leitos SUS cadastrados por região em abril de 2026.',
    profile_name => 'LEITO360_AI',
    action       => 'showsql')
FROM dual;

SELECT DBMS_CLOUD_AI.GENERATE(
    prompt       => 'Compare internações e leitos SUS cadastrados por região em abril de 2026.',
    profile_name => 'LEITO360_AI',
    action       => 'runsql')
FROM dual;
-- RESULTADO REAL:

-- ---------------------------------------------------------------------------
-- Depois de preencher os blocos "RESULTADO REAL" acima, copie o conteúdo
-- também para docs/evidencias/select_ai_perguntas.md.
