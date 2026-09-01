-- =============================================================================
-- LEITO360 — DDL: LEITO360_CNES_JSON (coleção / documento JSON)
-- Fonte: CNES - Leitos de Internação (DATASUS TabNet, cnes/cnv/leiintbr.def)
-- Grão: 1 documento JSON por competência x Unidade da Federação (162 docs).
--
-- Usa o tipo JSON nativo do Oracle Autonomous AI Database 23ai (binário,
-- OSON). Cada linha guarda o documento inteiro tal como exportado pelo ETL
-- em oracle/data/cnes_leitos.json; colunas virtuais extraem os campos usados
-- em joins/filtros para permitir index e constraints sem duplicar o dado.
-- =============================================================================

DROP TABLE LEITO360_CNES_JSON CASCADE CONSTRAINTS PURGE;

CREATE TABLE LEITO360_CNES_JSON (
    id              NUMBER          GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc             JSON            NOT NULL,
    competencia     VARCHAR2(7)     GENERATED ALWAYS AS (doc.competencia.string()) VIRTUAL,
    codigo_uf       VARCHAR2(2)     GENERATED ALWAYS AS (doc.codigo_uf.string()) VIRTUAL,
    leitos_sus      NUMBER          GENERATED ALWAYS AS (doc.leitos_sus_cadastrados.number()) VIRTUAL,
    CONSTRAINT uq_leito360_cnes_json UNIQUE (competencia, codigo_uf)
);

COMMENT ON TABLE LEITO360_CNES_JSON IS
    'LEITO360: leitos de internação cadastrados e destinados ao SUS por UF e '
    'competência, armazenados como documento JSON nativo (fonte: CNES via '
    'DATASUS TabNet, cnes/cnv/leiintbr.def). Leitos cadastrados != vagas livres.';
COMMENT ON COLUMN LEITO360_CNES_JSON.doc IS
    'Documento JSON completo: {competencia, codigo_uf, sigla_uf, estado, regiao, '
    'leitos_sus_cadastrados, metadados_fonte:{sistema, consulta, indicador, definicao, url_fonte}}.';
COMMENT ON COLUMN LEITO360_CNES_JSON.competencia IS
    'Coluna virtual extraída de doc.competencia — usada em joins com LEITO360_SIH.';
COMMENT ON COLUMN LEITO360_CNES_JSON.codigo_uf IS
    'Coluna virtual extraída de doc.codigo_uf — código IBGE da UF (2 dígitos).';
COMMENT ON COLUMN LEITO360_CNES_JSON.leitos_sus IS
    'Coluna virtual extraída de doc.leitos_sus_cadastrados — quantidade de leitos SUS.';

-- Índice de apoio ao join com a view analítica e às consultas do Select AI.
CREATE INDEX ix_leito360_cnes_json_comp_uf ON LEITO360_CNES_JSON (competencia, codigo_uf);
