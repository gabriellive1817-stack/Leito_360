-- =============================================================================
-- LEITO360 — Fallback: LEITO360_POPULACAO (tabela relacional simples)
--
-- Este script foi o realmente executado e testado na sessão de 31/08-01/09/2026
-- (LiveLabs sandbox #229599), como alternativa rápida à external table de
-- 03_external_table_ibge.sql. Motivo: montar um bucket de Object Storage e
-- uma credencial DBMS_CLOUD.CREATE_CREDENTIAL consome tempo que não havia
-- disponível dentro da janela do sandbox (que expira). Os dados e o
-- resultado são os mesmos; muda apenas o mecanismo de armazenamento (tabela
-- relacional comum em vez de external table sobre CSV no Object Storage).
--
-- Se você tiver um bucket de Object Storage disponível, prefira
-- 03_external_table_ibge.sql (é o que o enunciado pede — "external table
-- ou mecanismo CSV indicado"). Este script é o caminho alternativo válido
-- quando isso não é viável no tempo disponível.
-- =============================================================================

DROP TABLE LEITO360_POPULACAO CASCADE CONSTRAINTS PURGE;

CREATE TABLE LEITO360_POPULACAO (
    ano_referencia NUMBER(4) NOT NULL,
    codigo_uf      VARCHAR2(2) NOT NULL,
    sigla_uf       VARCHAR2(2) NOT NULL,
    estado         VARCHAR2(60) NOT NULL,
    regiao         VARCHAR2(20) NOT NULL,
    populacao      NUMBER(12) NOT NULL,
    CONSTRAINT pk_leito360_populacao PRIMARY KEY (ano_referencia, codigo_uf)
);

COMMENT ON TABLE LEITO360_POPULACAO IS
    'LEITO360: população estimada por UF (ano de referência 2026). Fonte: '
    'IBGE/SIDRA, tabela 6579. Carregada a partir de oracle/data/ibge_populacao.csv.';

-- Carga: copie os valores de oracle/data/ibge_populacao.csv (27 linhas) em
-- INSERT INTO LEITO360_POPULACAO VALUES (...) — ver README para o roteiro
-- completo, ou use Database Actions > Data Load para o CSV diretamente.

-- Validação (após carga):
-- SELECT COUNT(*) FROM LEITO360_POPULACAO;        -- esperado: 27
-- SELECT SUM(populacao) FROM LEITO360_POPULACAO;  -- esperado: 214.211.951 (ou o valor mais recente do IBGE/SIDRA)
