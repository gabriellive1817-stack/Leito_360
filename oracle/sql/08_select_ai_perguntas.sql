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
--
-- SHOWSQL (3,17 s) — SQL gerado, transcrito da tela (truncado no ORDE...):
--   SELECT "REGIAO" AS "REGIAO" FROM "ADMIN"."VW_LEITO360_ANALITICO"
--   GROUP BY "REGIAO"
--   HAVING AVG("LEITOS_SUS_POR_10K_HAB") < (
--       SELECT AVG("LEITOS_SUS_POR_10K_HAB") FROM "ADMIN"."VW_LEITO360_ANALITICO"
--   ) ORDE...
--
-- RUNSQL (2,36 s):
--   [ { "REGIAO" : "Nordeste" } ]
--
-- CONFERENCIA: INCORRETA. Tres problemas sobrepostos:
--
-- 1) O RUNSQL nao executou o SQL que o SHOWSQL mostrou. Reproduzindo a logica
--    do SHOWSQL sobre os dados do projeto, ela retornaria Sudeste e
--    Centro-Oeste (as duas regioes abaixo da media global de 16,06). O RUNSQL
--    devolveu Nordeste, que nao esta nesse conjunto — prova de que as duas
--    acoes sao chamadas independentes ao modelo e geraram SQL diferente.
--
-- 2) O SQL nao filtra competencia: a media sai sobre as 162 linhas (6
--    competencias juntas), nao sobre um periodo.
--
-- 3) "Menor oferta" virou "abaixo da media" (HAVING AVG < AVG global) — sao
--    perguntas diferentes.
--
-- Alem disso a resposta entregue esta invertida: o Nordeste e a regiao de
-- MAIOR oferta (17,15 leitos/10 mil hab agregado em abr/2026), nao a de menor.
-- Ordem real crescente: Sudeste 12,53 < Norte 14,97 < Centro-Oeste 15,39 <
-- Sul 16,25 < Nordeste 17,15.
--
-- Armadilha estatistica que o SQL gerado comete: AVG de um indicador per
-- capita entre UFs e uma MEDIA DE RAZOES, que nao equivale a razao agregada da
-- regiao (leitos da regiao / populacao da regiao). No Norte a divergencia e de
-- 14,97 (agregado) contra 16,98 (media simples).
--
-- Esta resposta NAO pode ser usada.


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
-- RESULTADO REAL (runsql, 2,41 s):
--   [ { "Unidade da Federacao" : "RR" }, { "Unidade da Federacao" : "TO" },
--     { "Unidade da Federacao" : "MA" }, { "Unidade da Federacao" : "PI" },
--     { "Unidade da Federacao" : "CE" }, { "Unidade da Federacao" : "PB" }, ... ]
--
-- CONFERENCIA: CORRETA na parte visivel. A media nacional ponderada pelas
-- internacoes em abr/2026 e 4,882 dias e as UFs acima dela sao AL, CE, DF, MA,
-- PB, PE, PI, RJ, RR, RS, SP, TO (12 UFs). As seis visiveis pertencem todas a
-- esse conjunto. O restante ficou truncado na tela.


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
-- RESULTADO REAL (runsql, 4,35 s):
--   [ { "SIGLA_UF" : "RS", "AUMENTO" : 1187 } ]
--
-- CONFERENCIA: CORRETA. O RS teve o maior aumento absoluto (+1.187 internacoes,
-- +1,62%). Abril foi mes de queda nacional (1.256.010 -> 1.218.903) e apenas 5
-- UFs cresceram: RS +1.187, MS +506, AL +261, AP +143, AM +112. O modelo
-- devolveu so a primeira colocada, embora a pergunta esteja no plural.


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
-- RESULTADO REAL (runsql, 2,09 s):
--   [ { "REGIAO":"Norte",    "TOTAL_INTERNACOES":108136, "TOTAL_LEITOS_SUS":28346 },
--     { "REGIAO":"Nordeste", "TOTAL_INTERNACOES":311866, "TOTAL_LEITOS_SUS":98381 },
--     { "REGIAO":"Sudeste",  "TOTAL_INTERNACOES":483748, ... ]
--
-- CONFERENCIA: CORRETA E EXATA, numero a numero:
--   Norte        108.136 internacoes / 28.346 leitos
--   Nordeste     311.866 / 98.381
--   Sudeste      483.748 / 111.532
--   Sul          217.146 / 51.197
--   Centro-Oeste  98.007 / 26.779

-- ---------------------------------------------------------------------------
-- Depois de preencher os blocos "RESULTADO REAL" acima, copie o conteúdo
-- também para docs/evidencias/select_ai_perguntas.md.
