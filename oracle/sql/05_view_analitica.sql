-- =============================================================================
-- LEITO360 — View analítica: VW_LEITO360_ANALITICO
-- Reúne as três fontes (SIH relacional, CNES JSON, IBGE external table),
-- calcula os indicadores derivados e serve de base tanto para o Select AI
-- quanto para as consultas de negócio do dashboard.
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
    ROUND(s.internacoes / p.populacao * 100000, 2)  AS internacoes_por_100k_hab,
    ROUND(c.leitos_sus  / p.populacao * 10000, 2)   AS leitos_sus_por_10k_hab,
    ROUND(s.internacoes / NULLIF(c.leitos_sus, 0), 3) AS internacoes_por_leito,
    NTILE(3) OVER (
        PARTITION BY s.competencia
        ORDER BY s.internacoes / p.populacao * 100000
    ) AS tercil_pressao_assistencial
FROM LEITO360_SIH s
JOIN LEITO360_CNES_JSON c
    ON c.competencia = s.competencia AND c.codigo_uf = s.codigo_uf
JOIN LEITO360_POPULACAO_EXT p
    ON p.codigo_uf = s.codigo_uf;

COMMENT ON TABLE VW_LEITO360_ANALITICO IS
    'LEITO360: view analítica que integra SIH/SUS (internações, permanência, '
    'mortalidade), CNES (leitos SUS cadastrados) e IBGE (população), com os '
    'indicadores derivados definidos no README (internações por 100 mil '
    'habitantes = "pressão assistencial comparativa"; leitos SUS por 10 mil '
    'habitantes; internações por leito cadastrado; tercil de comparação).';

-- Conferência de grão (162 linhas esperadas):
-- SELECT COUNT(*) FROM VW_LEITO360_ANALITICO;
