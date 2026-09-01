"""Tabela de referência estática: código IBGE da UF, sigla, nome e região.

Os códigos de UF usados aqui são os códigos oficiais do IBGE (2 dígitos) e
coincidem com os códigos retornados tanto pelo TabNet (SIH/CNES) quanto pela
API SIDRA do IBGE, o que permite o join direto entre as três fontes.
"""

UFS = [
    {"codigo_uf": "11", "sigla": "RO", "uf": "Rondônia", "regiao": "Norte"},
    {"codigo_uf": "12", "sigla": "AC", "uf": "Acre", "regiao": "Norte"},
    {"codigo_uf": "13", "sigla": "AM", "uf": "Amazonas", "regiao": "Norte"},
    {"codigo_uf": "14", "sigla": "RR", "uf": "Roraima", "regiao": "Norte"},
    {"codigo_uf": "15", "sigla": "PA", "uf": "Pará", "regiao": "Norte"},
    {"codigo_uf": "16", "sigla": "AP", "uf": "Amapá", "regiao": "Norte"},
    {"codigo_uf": "17", "sigla": "TO", "uf": "Tocantins", "regiao": "Norte"},
    {"codigo_uf": "21", "sigla": "MA", "uf": "Maranhão", "regiao": "Nordeste"},
    {"codigo_uf": "22", "sigla": "PI", "uf": "Piauí", "regiao": "Nordeste"},
    {"codigo_uf": "23", "sigla": "CE", "uf": "Ceará", "regiao": "Nordeste"},
    {"codigo_uf": "24", "sigla": "RN", "uf": "Rio Grande do Norte", "regiao": "Nordeste"},
    {"codigo_uf": "25", "sigla": "PB", "uf": "Paraíba", "regiao": "Nordeste"},
    {"codigo_uf": "26", "sigla": "PE", "uf": "Pernambuco", "regiao": "Nordeste"},
    {"codigo_uf": "27", "sigla": "AL", "uf": "Alagoas", "regiao": "Nordeste"},
    {"codigo_uf": "28", "sigla": "SE", "uf": "Sergipe", "regiao": "Nordeste"},
    {"codigo_uf": "29", "sigla": "BA", "uf": "Bahia", "regiao": "Nordeste"},
    {"codigo_uf": "31", "sigla": "MG", "uf": "Minas Gerais", "regiao": "Sudeste"},
    {"codigo_uf": "32", "sigla": "ES", "uf": "Espírito Santo", "regiao": "Sudeste"},
    {"codigo_uf": "33", "sigla": "RJ", "uf": "Rio de Janeiro", "regiao": "Sudeste"},
    {"codigo_uf": "35", "sigla": "SP", "uf": "São Paulo", "regiao": "Sudeste"},
    {"codigo_uf": "41", "sigla": "PR", "uf": "Paraná", "regiao": "Sul"},
    {"codigo_uf": "42", "sigla": "SC", "uf": "Santa Catarina", "regiao": "Sul"},
    {"codigo_uf": "43", "sigla": "RS", "uf": "Rio Grande do Sul", "regiao": "Sul"},
    {"codigo_uf": "50", "sigla": "MS", "uf": "Mato Grosso do Sul", "regiao": "Centro-Oeste"},
    {"codigo_uf": "51", "sigla": "MT", "uf": "Mato Grosso", "regiao": "Centro-Oeste"},
    {"codigo_uf": "52", "sigla": "GO", "uf": "Goiás", "regiao": "Centro-Oeste"},
    {"codigo_uf": "53", "sigla": "DF", "uf": "Distrito Federal", "regiao": "Centro-Oeste"},
]

UF_BY_CODIGO = {u["codigo_uf"]: u for u in UFS}
CODIGOS_UF = sorted(UF_BY_CODIGO.keys())

# Competências do recorte da Sprint 2 (formato AAAA-MM) -> sufixo AAMM usado
# pelos arquivos .dbf do TabNet (ex.: niuf2511.dbf = Nov/2025).
COMPETENCIAS = [
    ("2025-11", "2511"),
    ("2025-12", "2512"),
    ("2026-01", "2601"),
    ("2026-02", "2602"),
    ("2026-03", "2603"),
    ("2026-04", "2604"),
]

COMPETENCIA_PADRAO = "2026-04"

# Totais de controle informados originalmente (extraídos do TABNET antes
# desta execução). São usados apenas para o relatório de reconciliação —
# o pipeline sempre confia nos dados buscados nesta execução.
TOTAIS_CONTROLE_INTERNACOES = {
    "2025-11": 1_193_539,
    "2025-12": 1_162_871,
    "2026-01": 1_178_308,
    "2026-02": 1_143_546,
    "2026-03": 1_256_010,
    "2026-04": 1_218_903,
}

TOTAIS_CONTROLE_LEITOS = {
    "2025-11": 315_733,
    "2025-12": 316_529,
    "2026-01": 316_339,
    "2026-02": 316_227,
    "2026-03": 316_454,
    "2026-04": 316_235,
}

POPULACAO_BRASIL_CONTROLE_2026 = 214_211_951
