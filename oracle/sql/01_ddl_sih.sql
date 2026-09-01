-- =============================================================================
-- LEITO360 — DDL: LEITO360_SIH (tabela relacional)
-- Fonte: SIH/SUS - Morbidade Hospitalar (DATASUS TabNet, sih/cnv/niuf.def)
-- Grão: 1 linha por competência x Unidade da Federação (162 linhas esperadas)
--
-- Referência de sintaxe: documentação oficial Oracle Autonomous AI Database
-- 23ai (não é o LiveLabs 4222 — esse workshop cobre apenas o Select AI sobre
-- um schema MOVIESTREAM pré-carregado, e não ensina criação de tabelas
-- relacionais/JSON/external table para dados customizados). Ver README.md,
-- seção "Oracle e os três formatos" para o detalhamento dessa decisão.
-- =============================================================================

DROP TABLE LEITO360_SIH CASCADE CONSTRAINTS PURGE;

CREATE TABLE LEITO360_SIH (
    competencia         VARCHAR2(7)     NOT NULL,   -- formato AAAA-MM
    codigo_uf           VARCHAR2(2)     NOT NULL,   -- código IBGE da UF (2 dígitos)
    sigla_uf            VARCHAR2(2)     NOT NULL,
    estado              VARCHAR2(60)    NOT NULL,
    regiao              VARCHAR2(20)    NOT NULL,
    internacoes         NUMBER(10)      NOT NULL,
    permanencia_media   NUMBER(6,2)     NOT NULL,   -- dias, já ponderado pelo TabNet na UF
    taxa_mortalidade    NUMBER(6,2)     NOT NULL,   -- percentual (óbitos / internações * 100)
    CONSTRAINT pk_leito360_sih PRIMARY KEY (competencia, codigo_uf),
    CONSTRAINT ck_leito360_sih_regiao CHECK (regiao IN
        ('Norte','Nordeste','Sudeste','Sul','Centro-Oeste')),
    CONSTRAINT ck_leito360_sih_internacoes CHECK (internacoes >= 0),
    CONSTRAINT ck_leito360_sih_permanencia CHECK (permanencia_media >= 0),
    CONSTRAINT ck_leito360_sih_mortalidade CHECK (taxa_mortalidade >= 0)
);

COMMENT ON TABLE LEITO360_SIH IS
    'LEITO360: internações, permanência média e taxa de mortalidade hospitalar '
    'por Unidade da Federação e competência, extraídos do SIH/SUS (DATASUS '
    'TabNet, sih/cnv/niuf.def). Não representa ocupação de leitos em tempo real.';

COMMENT ON COLUMN LEITO360_SIH.competencia IS
    'Competência no formato AAAA-MM (ex.: 2026-04). Recorte: Nov/2025 a Abr/2026.';
COMMENT ON COLUMN LEITO360_SIH.codigo_uf IS
    'Código IBGE da Unidade da Federação (2 dígitos), compatível com CNES e IBGE/SIDRA.';
COMMENT ON COLUMN LEITO360_SIH.sigla_uf IS 'Sigla da Unidade da Federação (ex.: SP, RJ).';
COMMENT ON COLUMN LEITO360_SIH.estado IS 'Nome completo da Unidade da Federação.';
COMMENT ON COLUMN LEITO360_SIH.regiao IS 'Grande região do Brasil (Norte, Nordeste, Sudeste, Sul, Centro-Oeste).';
COMMENT ON COLUMN LEITO360_SIH.internacoes IS
    'Número absoluto de internações SUS aprovadas (AIH) na competência, por UF de internação.';
COMMENT ON COLUMN LEITO360_SIH.permanencia_media IS
    'Permanência média em dias das internações da UF na competência (indicador Média_permanência do SIH/SUS).';
COMMENT ON COLUMN LEITO360_SIH.taxa_mortalidade IS
    'Taxa de mortalidade hospitalar (%) = óbitos / internações x 100, conforme indicador do SIH/SUS.';
