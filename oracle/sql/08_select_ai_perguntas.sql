-- =============================================================================
-- LEITO360 — Perguntas do Select AI (execução obrigatória pelo usuário)
--
-- Estas 5 perguntas devem ser executadas de fato no SQL Worksheet / Database
-- Actions, na ordem SHOWSQL (mostra o SQL gerado pelo modelo, sem rodar) e
-- depois RUNSQL (roda e traz o resultado) — mesmo padrão de ações usado no
-- LiveLabs 4222 (lá com action => 'chat'; aqui usamos 'showsql' e 'runsql',
-- as ações do pacote DBMS_CLOUD_AI para NL2SQL).
--
-- IMPORTANTE: não escreva o SQL manualmente e cole aqui como se fosse gerado
-- pelo modelo. Rode cada bloco de verdade, copie o SQL retornado por SHOWSQL,
-- o resultado de RUNSQL, e cole abaixo do comentário "-- RESULTADO REAL:" de
-- cada pergunta, junto com a interpretação e as limitações observadas.
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
-- RESULTADO REAL: (colar aqui SQL gerado + linhas retornadas + interpretação + limitações)


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
-- Depois de preencher os 5 blocos "RESULTADO REAL" acima, copie o conteúdo
-- também para docs/evidencias/select_ai_perguntas.md (mesmo texto, formato
-- de evidência com print screen) — ver template nesse arquivo.
