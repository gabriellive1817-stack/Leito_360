-- =============================================================================
-- LEITO360 — View analítica: VW_LEITO360_ANALITICO
-- Reúne as três fontes (SIH relacional, CNES JSON, IBGE relacional ou
-- external table), calcula os indicadores derivados e serve de base tanto
-- para o Select AI quanto para as consultas de negócio do dashboard.
--
-- Testado e confirmado (LiveLabs sandbox #229599, 31/08-01/09/2026):
-- SELECT COUNT(*) FROM VW_LEITO360_ANALITICO; → 162 (27 UFs x 6 competências).
-- Se você usou 03_external_table_ibge.sql (LEITO360_POPULACAO_EXT) em vez do
-- fallback 03b (LEITO360_POPULACAO), troque o nome da tabela no último JOIN.
-- =============================================================================

CREATE OR REPLACE VIEW VW_LEITO360_ANALITICO AS
SELECT
    s.competencia,
    s.codigo_uf,
    s.sigla_uf,
    s.estado,
    s.regiao,
    s.internacoes,
    s.permanencia_media,
    s.taxa_mortalidade,
    c.leitos_sus,
    p.populacao,
    ROUND(s.internacoes / p.populacao * 100000, 2)    AS internacoes_por_100k_hab,
    ROUND(c.leitos_sus  / p.populacao * 10000, 2)     AS leitos_sus_por_10k_hab,
    ROUND(s.internacoes / NULLIF(c.leitos_sus, 0), 3) AS internacoes_por_leito,
    NTILE(3) OVER (
        PARTITION BY s.competencia
        ORDER BY s.internacoes / p.populacao * 100000
    ) AS tercil_pressao_assistencial
FROM LEITO360_SIH s
JOIN (
    SELECT
        JSON_VALUE(doc, '$.competencia')                          AS competencia,
        JSON_VALUE(doc, '$.codigo_uf')                             AS codigo_uf,
        JSON_VALUE(doc, '$.leitos_sus_cadastrados' RETURNING NUMBER) AS leitos_sus
    FROM LEITO360_CNES_JSON
) c
    ON c.competencia = s.competencia AND c.codigo_uf = s.codigo_uf
JOIN LEITO360_POPULACAO p          -- troque para LEITO360_POPULACAO_EXT se usou a external table
    ON p.codigo_uf = s.codigo_uf;

COMMENT ON TABLE VW_LEITO360_ANALITICO IS
    'LEITO360: view analítica que integra SIH/SUS (internações, permanência, '
    'mortalidade), CNES (leitos SUS cadastrados) e IBGE (população), com os '
    'indicadores derivados definidos no README (internações por 100 mil '
    'habitantes = "pressão assistencial comparativa"; leitos SUS por 10 mil '
    'habitantes; internações por leito cadastrado; tercil de comparação).';

-- Conferência de grão (162 linhas esperadas):
-- SELECT COUNT(*) FROM VW_LEITO360_ANALITICO;
