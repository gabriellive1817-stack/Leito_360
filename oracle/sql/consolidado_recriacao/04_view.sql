-- LEITO360 -- Bloco 4/4: VW_LEITO360_ANALITICO
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
JOIN LEITO360_POPULACAO p
    ON p.codigo_uf = s.codigo_uf;

SELECT COUNT(*) FROM VW_LEITO360_ANALITICO; -- esperado: 162
