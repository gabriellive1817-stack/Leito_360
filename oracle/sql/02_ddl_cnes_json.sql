-- =============================================================================
-- LEITO360 — DDL: LEITO360_CNES_JSON (coleção / documento JSON)
-- Fonte: CNES - Leitos de Internação (DATASUS TabNet, cnes/cnv/leiintbr.def)
-- Grão: 1 documento JSON por competência x Unidade da Federação (162 docs).
--
-- Usa o tipo JSON nativo do Oracle Autonomous AI Database 23ai (binário,
-- OSON). Cada linha guarda o documento inteiro tal como exportado pelo ETL
-- em oracle/data/cnes_leitos.json.
--
-- NOTA (execução real, LiveLabs sandbox #229599, 31/08-01/09/2026): a versão
-- original deste script usava colunas virtuais com a sintaxe de ponto
-- (doc.competencia.string()), que resultou em ORA-01747 "especificação de
-- coluna inválida" nesse ambiente. A versão abaixo (testada e confirmada
-- com 162 linhas carregadas) usa apenas a coluna JSON pura; a extração dos
-- campos para join é feita via JSON_VALUE diretamente na view analítica
-- (05_view_analitica.sql), que é a abordagem mais portável entre versões.
-- =============================================================================

DROP TABLE LEITO360_CNES_JSON CASCADE CONSTRAINTS PURGE;

CREATE TABLE LEITO360_CNES_JSON (
    id   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc  JSON NOT NULL
);

COMMENT ON TABLE LEITO360_CNES_JSON IS
    'LEITO360: leitos de internação cadastrados e destinados ao SUS por UF e '
    'competência, armazenados como documento JSON nativo (fonte: CNES via '
    'DATASUS TabNet, cnes/cnv/leiintbr.def). Leitos cadastrados != vagas livres.';
COMMENT ON COLUMN LEITO360_CNES_JSON.doc IS
    'Documento JSON completo: {competencia, codigo_uf, sigla_uf, estado, regiao, leitos_sus_cadastrados}.';

-- Índice funcional de apoio ao join com a view analítica (opcional, mas
-- recomendado se o volume de documentos crescer).
CREATE INDEX ix_leito360_cnes_json_comp_uf
    ON LEITO360_CNES_JSON (JSON_VALUE(doc, '$.competencia'), JSON_VALUE(doc, '$.codigo_uf'));

-- Validação (após carga):
-- SELECT COUNT(*) FROM LEITO360_CNES_JSON WHERE doc IS JSON;  -- esperado: 162
