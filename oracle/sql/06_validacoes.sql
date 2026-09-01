-- =============================================================================
-- LEITO360 — Validações Oracle (rodar após a carga e execução da view)
-- Rode cada bloco, capture o resultado (print screen) e cole no relatório de
-- evidências (docs/evidencias/). Os valores esperados vêm de
-- data/processed/validacao_pipeline.json, gerado pelo ETL local.
-- =============================================================================

-- 1) Contagem total do conjunto consolidado — esperado: 162
SELECT COUNT(*) AS total_registros FROM VW_LEITO360_ANALITICO;

-- 2) 27 UFs por competência
SELECT competencia, COUNT(DISTINCT codigo_uf) AS qtd_ufs
FROM VW_LEITO360_ANALITICO
GROUP BY competencia
ORDER BY competencia;

-- 3) Seis competências
SELECT COUNT(DISTINCT competencia) AS qtd_competencias FROM VW_LEITO360_ANALITICO;

-- 4) Nenhuma duplicata na chave (competencia, codigo_uf)
SELECT competencia, codigo_uf, COUNT(*)
FROM LEITO360_SIH
GROUP BY competencia, codigo_uf
HAVING COUNT(*) > 1;
-- esperado: 0 linhas retornadas

-- 5) Nenhum nulo em campo crítico
SELECT COUNT(*) AS linhas_com_nulo
FROM LEITO360_SIH
WHERE competencia IS NULL OR codigo_uf IS NULL OR sigla_uf IS NULL
   OR estado IS NULL OR regiao IS NULL OR internacoes IS NULL
   OR permanencia_media IS NULL OR taxa_mortalidade IS NULL;
-- esperado: 0

-- 6) Soma de internações por competência (comparar com
--    data/processed/validacao_pipeline.json -> reconciliacao_tabnet)
SELECT competencia, SUM(internacoes) AS total_internacoes
FROM LEITO360_SIH
GROUP BY competencia
ORDER BY competencia;

-- 7) Soma de leitos SUS cadastrados por competência
SELECT competencia, SUM(leitos_sus) AS total_leitos_sus
FROM LEITO360_CNES_JSON
GROUP BY competencia
ORDER BY competencia;

-- 8) Comparação Oracle x arquivos tratados (execução manual):
--    compare o resultado dos itens 6 e 7 acima linha a linha com
--    data/processed/leito360_consolidado.csv (agrupado por competência).

-- 9) Consulta de conferência da view integrada (amostra)
SELECT * FROM VW_LEITO360_ANALITICO
WHERE competencia = '2026-04'
ORDER BY internacoes_por_100k_hab DESC
FETCH FIRST 10 ROWS ONLY;

-- 10) Validação do documento JSON (estrutura e contagem)
SELECT COUNT(*) AS documentos_validos
FROM LEITO360_CNES_JSON
WHERE doc IS JSON;
-- esperado: 162

SELECT doc FROM LEITO360_CNES_JSON FETCH FIRST 1 ROWS ONLY;

-- 11) Validação da External Table (IBGE)
SELECT COUNT(*) AS linhas_ext_table FROM LEITO360_POPULACAO_EXT; -- esperado: 27
SELECT SUM(populacao) AS populacao_brasil_2026 FROM LEITO360_POPULACAO_EXT;

-- 12) Consultas de negócio de apoio ao pitch --------------------------------

-- UFs com maior pressão assistencial comparativa em abr/2026
SELECT sigla_uf, estado, internacoes_por_100k_hab
FROM VW_LEITO360_ANALITICO
WHERE competencia = '2026-04'
ORDER BY internacoes_por_100k_hab DESC
FETCH FIRST 10 ROWS ONLY;

-- Regiões com menor oferta de leitos SUS por 10 mil habitantes
SELECT regiao, ROUND(AVG(leitos_sus_por_10k_hab), 2) AS media_leitos_10k
FROM VW_LEITO360_ANALITICO
WHERE competencia = '2026-04'
GROUP BY regiao
ORDER BY media_leitos_10k ASC;

-- UFs com permanência média acima da média nacional ponderada (abr/2026)
SELECT a.sigla_uf, a.estado, a.permanencia_media, nacional.media_ponderada
FROM VW_LEITO360_ANALITICO a
CROSS JOIN (
    SELECT SUM(permanencia_media * internacoes) / SUM(internacoes) AS media_ponderada
    FROM VW_LEITO360_ANALITICO
    WHERE competencia = '2026-04'
) nacional
WHERE a.competencia = '2026-04'
  AND a.permanencia_media > nacional.media_ponderada
ORDER BY a.permanencia_media DESC;

-- Variação de internações entre mar/2026 e abr/2026 por UF
SELECT m.sigla_uf, m.estado,
       a.internacoes AS internacoes_mar_2026,
       m.internacoes AS internacoes_abr_2026,
       ROUND((m.internacoes / a.internacoes - 1) * 100, 2) AS variacao_pct
FROM VW_LEITO360_ANALITICO a
JOIN VW_LEITO360_ANALITICO m
    ON m.codigo_uf = a.codigo_uf AND a.competencia = '2026-03' AND m.competencia = '2026-04'
ORDER BY variacao_pct DESC;

-- Internações x leitos SUS cadastrados por região (abr/2026)
SELECT regiao, SUM(internacoes) AS internacoes, SUM(leitos_sus) AS leitos_sus
FROM VW_LEITO360_ANALITICO
WHERE competencia = '2026-04'
GROUP BY regiao
ORDER BY internacoes DESC;
