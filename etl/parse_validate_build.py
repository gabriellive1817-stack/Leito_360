"""Etapas 2 a 11 do pipeline LEITO360: parseia os brutos, padroniza,
valida, calcula indicadores, reconcilia com o TABNET e gera as saídas
tratadas (CSV/JSON) e os três arquivos separados para o Oracle.

Uso: python etl/parse_validate_build.py
Código de saída != 0 se qualquer critério de qualidade falhar.
"""
from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ufs import (  # noqa: E402
    CODIGOS_UF,
    COMPETENCIAS,
    COMPETENCIA_PADRAO,
    POPULACAO_BRASIL_CONTROLE_2026,
    TOTAIS_CONTROLE_INTERNACOES,
    TOTAIS_CONTROLE_LEITOS,
    UF_BY_CODIGO,
)

ROOT = Path(__file__).parent.parent
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
ORACLE_DATA_DIR = ROOT / "oracle" / "data"
PUBLIC_DATA_DIR = ROOT / "public" / "data"

HTML_ENTITIES = {
    "&ccedil;": "ç", "&atilde;": "ã", "&aacute;": "á", "&eacute;": "é",
    "&iacute;": "í", "&oacute;": "ó", "&uacute;": "ú", "&ecirc;": "ê",
    "&ocirc;": "ô", "&otilde;": "õ", "&Oacute;": "Ó", "&Aacute;": "Á",
    "&Eacute;": "É", "&acirc;": "â", "&agrave;": "à", "&uuml;": "ü",
    "&nbsp;": " ", "&amp;": "&",
}


def _decode_entities(text: str) -> str:
    for entity, char in HTML_ENTITIES.items():
        text = text.replace(entity, char)
    return text


def _extract_pre_block(html_bytes: bytes) -> str:
    html = html_bytes.decode("iso-8859-1")
    match = re.search(r"<PRE>(.*?)</PRE>", html, re.S)
    if not match:
        raise ValueError("Bloco <PRE> com os dados não encontrado na resposta do TabNet")
    return _decode_entities(match.group(1))


def _parse_prn_rows(pre_text: str) -> list[list[str]]:
    rows = []
    for line in pre_text.strip().splitlines():
        line = line.strip()
        if not line or line == "&":
            continue
        cells = [c.strip('"') for c in line.split(";")]
        rows.append(cells)
    return rows


def _br_number(value: str) -> float:
    return float(value.replace(".", "").replace(",", "."))


def parse_sih(competencia: str) -> dict[str, dict]:
    raw = (RAW_DIR / f"sih_{competencia}.html").read_bytes()
    rows = _parse_prn_rows(_extract_pre_block(raw))
    header, *data_rows = rows
    assert header[:5] == [
        "Unidade da Federação", "Internações", "Média permanência", "Óbitos", "Taxa mortalidade",
    ], f"Cabeçalho SIH inesperado para {competencia}: {header}"

    out: dict[str, dict] = {}
    total_row = None
    for row in data_rows:
        label, internacoes, permanencia, obitos, taxa_mort = row
        if label == "Total":
            total_row = {
                "internacoes": int(internacoes),
                "obitos": int(obitos),
                "taxa_mortalidade": _br_number(taxa_mort),
            }
            continue
        codigo_uf = label.split(" ", 1)[0]
        out[codigo_uf] = {
            "internacoes": int(internacoes),
            "permanencia_media": _br_number(permanencia),
            "obitos": int(obitos),
            "taxa_mortalidade": _br_number(taxa_mort),
        }
    out["__total__"] = total_row
    return out


def parse_cnes(competencia: str) -> dict[str, dict]:
    raw = (RAW_DIR / f"cnes_{competencia}.html").read_bytes()
    rows = _parse_prn_rows(_extract_pre_block(raw))
    header, *data_rows = rows
    assert header[:2] == ["Unidade da Federação", "Quantidade SUS"], (
        f"Cabeçalho CNES inesperado para {competencia}: {header}"
    )

    out: dict[str, dict] = {}
    total_row = None
    for row in data_rows:
        label, leitos_sus = row
        if label == "Total":
            total_row = {"leitos_sus": int(leitos_sus)}
            continue
        codigo_uf = label.split(" ", 1)[0]
        out[codigo_uf] = {"leitos_sus": int(leitos_sus)}
    out["__total__"] = total_row
    return out


def parse_ibge() -> dict[str, int]:
    raw = json.loads((RAW_DIR / "ibge_populacao.json").read_text(encoding="utf-8"))
    out: dict[str, int] = {}
    for row in raw[1:]:
        out[row["D1C"]] = int(row["V"])
    return out


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    ORACLE_DATA_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DATA_DIR.mkdir(parents=True, exist_ok=True)

    print("=== LEITO360 ETL — Etapas 2-11: parse, validação, indicadores, saídas ===")

    populacao = parse_ibge()
    for codigo in CODIGOS_UF:
        if codigo not in populacao:
            errors.append(f"IBGE: UF {codigo} ausente na resposta da API SIDRA")
    pop_total = sum(populacao.get(c, 0) for c in CODIGOS_UF)
    if pop_total != POPULACAO_BRASIL_CONTROLE_2026:
        warnings.append(
            f"IBGE: soma da população das 27 UFs = {pop_total:,} difere do total de "
            f"controle informado ({POPULACAO_BRASIL_CONTROLE_2026:,}). Usando o valor "
            f"obtido nesta execução (fonte pode ter sido atualizada)."
        )

    registros: dict[tuple[str, str], dict] = {}
    reconciliacao: list[dict] = []

    for competencia, _sufixo in COMPETENCIAS:
        sih = parse_sih(competencia)
        cnes = parse_cnes(competencia)

        # --- Validação 4: cobertura das 27 UFs -------------------------------
        for codigo in CODIGOS_UF:
            if codigo not in sih:
                errors.append(f"SIH {competencia}: UF {codigo} ausente")
            if codigo not in cnes:
                errors.append(f"CNES {competencia}: UF {codigo} ausente")

        # --- Reconciliação interna: soma das UFs == linha Total do TabNet ----
        soma_internacoes = sum(sih[c]["internacoes"] for c in CODIGOS_UF if c in sih)
        soma_leitos = sum(cnes[c]["leitos_sus"] for c in CODIGOS_UF if c in cnes)
        if sih.get("__total__") and soma_internacoes != sih["__total__"]["internacoes"]:
            errors.append(
                f"SIH {competencia}: soma por UF ({soma_internacoes}) != linha Total "
                f"do TabNet ({sih['__total__']['internacoes']})"
            )
        if cnes.get("__total__") and soma_leitos != cnes["__total__"]["leitos_sus"]:
            errors.append(
                f"CNES {competencia}: soma por UF ({soma_leitos}) != linha Total do "
                f"TabNet ({cnes['__total__']['leitos_sus']})"
            )

        controle_internacoes = TOTAIS_CONTROLE_INTERNACOES.get(competencia)
        controle_leitos = TOTAIS_CONTROLE_LEITOS.get(competencia)
        reconciliacao.append({
            "competencia": competencia,
            "internacoes_tabnet_execucao": soma_internacoes,
            "internacoes_total_controle_original": controle_internacoes,
            "internacoes_diferenca": soma_internacoes - controle_internacoes,
            "leitos_tabnet_execucao": soma_leitos,
            "leitos_total_controle_original": controle_leitos,
            "leitos_diferenca": soma_leitos - controle_leitos,
        })
        if soma_internacoes != controle_internacoes:
            warnings.append(
                f"SIH {competencia}: total obtido nesta execução ({soma_internacoes:,}) "
                f"difere do total de controle original ({controle_internacoes:,}); "
                f"diferença de {soma_internacoes - controle_internacoes:+,}. Fonte "
                f"provavelmente atualizada pelo DATASUS desde a extração original — "
                f"mantendo o valor desta execução."
            )
        if soma_leitos != controle_leitos:
            warnings.append(
                f"CNES {competencia}: total obtido nesta execução ({soma_leitos:,}) "
                f"difere do total de controle original ({controle_leitos:,}); "
                f"diferença de {soma_leitos - controle_leitos:+,}."
            )

        for codigo in CODIGOS_UF:
            if codigo not in sih or codigo not in cnes or codigo not in populacao:
                continue
            uf_info = UF_BY_CODIGO[codigo]
            key = (competencia, codigo)
            if key in registros:
                errors.append(f"Duplicata na chave (competência, UF): {key}")
                continue
            registros[key] = {
                "competencia": competencia,
                "codigo_uf": codigo,
                "sigla_uf": uf_info["sigla"],
                "estado": uf_info["uf"],
                "regiao": uf_info["regiao"],
                "internacoes": sih[codigo]["internacoes"],
                "permanencia_media": sih[codigo]["permanencia_media"],
                "obitos": sih[codigo]["obitos"],
                "taxa_mortalidade": sih[codigo]["taxa_mortalidade"],
                "leitos_sus": cnes[codigo]["leitos_sus"],
                "populacao": populacao[codigo],
            }

    # --- Validação 6: nulos em campos críticos -------------------------------
    campos_criticos = [
        "competencia", "codigo_uf", "sigla_uf", "estado", "regiao",
        "internacoes", "permanencia_media", "leitos_sus", "populacao",
    ]
    for key, rec in registros.items():
        for campo in campos_criticos:
            if rec.get(campo) in (None, ""):
                errors.append(f"Nulo em campo crítico '{campo}' no registro {key}")

    # --- Validação de contagem total: 27 UFs x 6 competências = 162 --------
    esperado = len(CODIGOS_UF) * len(COMPETENCIAS)
    if len(registros) != esperado:
        errors.append(
            f"Contagem de registros consolidados = {len(registros)}, esperado {esperado}"
        )

    if errors:
        print("\nFALHAS DE VALIDAÇÃO:")
        for e in errors:
            print(f"  [ERRO] {e}")
        print(f"\n{len(errors)} erro(s) encontrado(s). Pipeline interrompido.")
        return 1

    # --- Indicadores derivados -----------------------------------------------
    por_competencia_uf = {(r["competencia"], r["codigo_uf"]): r for r in registros.values()}
    ordem_competencias = [c for c, _ in COMPETENCIAS]

    for rec in registros.values():
        pop = rec["populacao"]
        rec["internacoes_por_100k_hab"] = round(rec["internacoes"] / pop * 100_000, 2)
        rec["leitos_sus_por_10k_hab"] = round(rec["leitos_sus"] / pop * 10_000, 2)
        rec["internacoes_por_leito"] = round(rec["internacoes"] / rec["leitos_sus"], 3)

        idx = ordem_competencias.index(rec["competencia"])
        if idx > 0:
            comp_anterior = ordem_competencias[idx - 1]
            anterior = por_competencia_uf.get((comp_anterior, rec["codigo_uf"]))
            if anterior:
                rec["variacao_mensal_internacoes_pct"] = round(
                    (rec["internacoes"] / anterior["internacoes"] - 1) * 100, 2
                )
            else:
                rec["variacao_mensal_internacoes_pct"] = None
        else:
            rec["variacao_mensal_internacoes_pct"] = None

    # Tercis do indicador principal (internações por 100k hab.), por competência
    for competencia in ordem_competencias:
        vals = sorted(
            r["internacoes_por_100k_hab"] for r in registros.values() if r["competencia"] == competencia
        )
        n = len(vals)
        t1 = vals[n // 3 - 1] if n // 3 >= 1 else vals[0]
        t2 = vals[(2 * n) // 3 - 1] if (2 * n) // 3 >= 1 else vals[-1]
        for r in registros.values():
            if r["competencia"] != competencia:
                continue
            v = r["internacoes_por_100k_hab"]
            if v <= t1:
                r["tercil_pressao_assistencial"] = "baixo"
            elif v <= t2:
                r["tercil_pressao_assistencial"] = "medio"
            else:
                r["tercil_pressao_assistencial"] = "alto"

    registros_ordenados = sorted(registros.values(), key=lambda r: (r["competencia"], r["codigo_uf"]))

    # --- Saída consolidada (data/processed) ----------------------------------
    campos_csv = [
        "competencia", "codigo_uf", "sigla_uf", "estado", "regiao",
        "internacoes", "permanencia_media", "obitos", "taxa_mortalidade",
        "leitos_sus", "populacao", "internacoes_por_100k_hab",
        "leitos_sus_por_10k_hab", "internacoes_por_leito",
        "variacao_mensal_internacoes_pct", "tercil_pressao_assistencial",
    ]
    with open(PROCESSED_DIR / "leito360_consolidado.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=campos_csv)
        w.writeheader()
        for r in registros_ordenados:
            w.writerow({k: r[k] for k in campos_csv})

    with open(PROCESSED_DIR / "leito360_consolidado.json", "w", encoding="utf-8") as f:
        json.dump(registros_ordenados, f, ensure_ascii=False, indent=2)

    # --- Três arquivos separados para o Oracle -------------------------------
    with open(ORACLE_DATA_DIR / "sih_internacoes.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=[
            "competencia", "codigo_uf", "sigla_uf", "estado", "regiao",
            "internacoes", "permanencia_media", "taxa_mortalidade",
        ])
        w.writeheader()
        for r in registros_ordenados:
            w.writerow({k: r[k] for k in w.fieldnames})

    cnes_docs = []
    for r in registros_ordenados:
        cnes_docs.append({
            "competencia": r["competencia"],
            "codigo_uf": r["codigo_uf"],
            "sigla_uf": r["sigla_uf"],
            "estado": r["estado"],
            "regiao": r["regiao"],
            "leitos_sus_cadastrados": r["leitos_sus"],
            "metadados_fonte": {
                "sistema": "CNES",
                "consulta": "cnes/cnv/leiintbr.def",
                "indicador": "Quantidade_SUS",
                "definicao": "Leitos de internação cadastrados e destinados ao SUS "
                              "(nao representa vagas livres em tempo real)",
                "url_fonte": "http://tabnet.datasus.gov.br/cgi/deftohtm.exe?cnes/cnv/leiintbr.def",
            },
        })
    with open(ORACLE_DATA_DIR / "cnes_leitos.json", "w", encoding="utf-8") as f:
        json.dump(cnes_docs, f, ensure_ascii=False, indent=2)

    with open(ORACLE_DATA_DIR / "ibge_populacao.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["ano_referencia", "codigo_uf", "sigla_uf", "estado", "regiao", "populacao"])
        for codigo in CODIGOS_UF:
            uf_info = UF_BY_CODIGO[codigo]
            w.writerow([2026, codigo, uf_info["sigla"], uf_info["uf"], uf_info["regiao"], populacao[codigo]])

    # --- JSON sanitizado para o dashboard (public/data) ----------------------
    dashboard_payload = {
        "gerado_em_competencia_padrao": COMPETENCIA_PADRAO,
        "competencias_disponiveis": ordem_competencias,
        "fonte": {
            "sih": "DATASUS SIH/SUS - Morbidade Hospitalar (tabnet.datasus.gov.br)",
            "cnes": "DATASUS CNES - Leitos de Internação (tabnet.datasus.gov.br)",
            "ibge": "IBGE/SIDRA - Tabela 6579, população estimada (apisidra.ibge.gov.br)",
        },
        "limitacoes": [
            "Leitos SUS cadastrados não representam vagas livres em tempo real.",
            "Não há monitoramento operacional ao vivo: os dados refletem competências "
            "fechadas do SIH/SUS e do CNES, sujeitas a atualização retroativa pelo DATASUS.",
            "O indicador geográfico principal é 'pressão assistencial comparativa "
            "(internações por 100 mil habitantes)', não ocupação hospitalar.",
        ],
        "registros": registros_ordenados,
    }
    with open(PUBLIC_DATA_DIR / "leito360.json", "w", encoding="utf-8") as f:
        json.dump(dashboard_payload, f, ensure_ascii=False, indent=2)

    # --- Relatório de validação/reconciliação --------------------------------
    relatorio = {
        "status": "OK",
        "registros_consolidados": len(registros_ordenados),
        "esperado": esperado,
        "ufs_por_competencia": len(CODIGOS_UF),
        "competencias": len(COMPETENCIAS),
        "avisos": warnings,
        "reconciliacao_tabnet": reconciliacao,
        "populacao_brasil_2026_execucao": pop_total,
        "populacao_brasil_2026_controle_original": POPULACAO_BRASIL_CONTROLE_2026,
    }
    with open(PROCESSED_DIR / "validacao_pipeline.json", "w", encoding="utf-8") as f:
        json.dump(relatorio, f, ensure_ascii=False, indent=2)

    print(f"\n{len(registros_ordenados)} registros consolidados (esperado {esperado}). OK.")
    if warnings:
        print(f"\n{len(warnings)} aviso(s) de reconciliação (não bloqueantes):")
        for w_ in warnings:
            print(f"  [AVISO] {w_}")
    print("\nSaídas geradas:")
    print("  data/processed/leito360_consolidado.csv")
    print("  data/processed/leito360_consolidado.json")
    print("  data/processed/validacao_pipeline.json")
    print("  oracle/data/sih_internacoes.csv")
    print("  oracle/data/cnes_leitos.json")
    print("  oracle/data/ibge_populacao.csv")
    print("  public/data/leito360.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
