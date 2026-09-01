"""Etapa complementar do pipeline LEITO360: gera a malha territorial das UFs
usada pelo mapa do dashboard a partir da malha oficial do IBGE.

Fonte:
  - IBGE / API de Malhas Territoriais v3 (servicodados.ibge.gov.br), recorte do
    Brasil com intrarregiao=UF e qualidade=minima. A resposta original é
    preservada em data/raw/ibge_malha_uf.geojson.

Saída: public/data/uf_malha.json — mesma malha já projetada para o sistema de
coordenadas do SVG (viewBox 0 0 W H), simplificada por Douglas-Peucker para
manter o arquivo leve, com o ponto-âncora do rótulo de cada UF.

O mapa do dashboard passa a usar geometria oficial do IBGE (não mais um
desenho estilizado), mantendo a mesma origem pública dos demais dados.

Uso: python etl/build_malha_uf.py
"""
from __future__ import annotations

import gzip
import json
import math
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ufs import UFS  # noqa: E402

RAW_PATH = Path(__file__).parent.parent / "data" / "raw" / "ibge_malha_uf.geojson"
OUT_PATH = Path(__file__).parent.parent / "public" / "data" / "uf_malha.json"

MALHA_URL = (
    "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR"
    "?formato=application/vnd.geo+json&intrarregiao=UF&qualidade=minima"
)
USER_AGENT = "LEITO360-ETL/1.0 (uso academico FIAP Challenge Grupo 61)"

# Retrato do Brasil: a malha é mais alta do que larga.
VIEW_W = 460.0
VIEW_H = 470.0
PADDING = 6.0
# Tolerância do Douglas-Peucker, já em unidades do viewBox (px do SVG).
TOLERANCIA = 0.45

SIGLA_POR_CODIGO = {u["codigo_uf"]: u["sigla"] for u in UFS}
NOME_POR_CODIGO = {u["codigo_uf"]: u["uf"] for u in UFS}


def baixar_malha() -> dict:
    if RAW_PATH.exists():
        print(f"[malha] usando resposta preservada em {RAW_PATH.name}")
        return json.loads(RAW_PATH.read_text(encoding="utf-8"))

    print("[malha] baixando malha oficial das UFs no IBGE…")
    req = urllib.request.Request(MALHA_URL, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as resp:
        corpo = resp.read()
    # a API responde gzip mesmo sem negociação — descompacta quando necessário
    if corpo[:2] == bytes((0x1F, 0x8B)):
        corpo = gzip.decompress(corpo)
    bruto = corpo.decode("utf-8")
    RAW_PATH.parent.mkdir(parents=True, exist_ok=True)
    RAW_PATH.write_text(bruto, encoding="utf-8")
    print(f"[malha] resposta original preservada em {RAW_PATH.name} ({len(bruto)/1024:.0f} KB)")
    return json.loads(bruto)


def aneis(geometria: dict) -> list[list[list[float]]]:
    """Devolve todos os anéis externos (ignora buracos, irrelevantes no recorte)."""
    tipo = geometria["type"]
    if tipo == "Polygon":
        return [geometria["coordinates"][0]]
    if tipo == "MultiPolygon":
        return [poligono[0] for poligono in geometria["coordinates"]]
    raise ValueError(f"geometria não suportada: {tipo}")


def douglas_peucker(pontos: list[tuple[float, float]], tol: float) -> list[tuple[float, float]]:
    if len(pontos) < 3:
        return pontos
    (x1, y1), (x2, y2) = pontos[0], pontos[-1]
    dx, dy = x2 - x1, y2 - y1
    norma = math.hypot(dx, dy)
    indice, maior = 0, 0.0
    for i in range(1, len(pontos) - 1):
        x, y = pontos[i]
        if norma == 0:
            dist = math.hypot(x - x1, y - y1)
        else:
            dist = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / norma
        if dist > maior:
            indice, maior = i, dist
    if maior <= tol:
        return [pontos[0], pontos[-1]]
    esquerda = douglas_peucker(pontos[: indice + 1], tol)
    direita = douglas_peucker(pontos[indice:], tol)
    return esquerda[:-1] + direita


def area_e_centroide(anel: list[tuple[float, float]]) -> tuple[float, float, float]:
    soma = cx = cy = 0.0
    for i in range(len(anel) - 1):
        x1, y1 = anel[i]
        x2, y2 = anel[i + 1]
        cruz = x1 * y2 - x2 * y1
        soma += cruz
        cx += (x1 + x2) * cruz
        cy += (y1 + y2) * cruz
    if soma == 0:
        return 0.0, anel[0][0], anel[0][1]
    return abs(soma) / 2, cx / (3 * soma), cy / (3 * soma)


def main() -> int:
    geojson = baixar_malha()
    features = geojson["features"]
    if len(features) != 27:
        print(f"[erro] esperava 27 UFs na malha, vieram {len(features)}")
        return 1

    # Projeção equirretangular simples, com correção de longitude pela latitude
    # média do Brasil — suficiente para um mapa temático nacional.
    todas = [pt for f in features for anel in aneis(f["geometry"]) for pt in anel]
    lat_media = sum(p[1] for p in todas) / len(todas)
    k = math.cos(math.radians(lat_media))
    xs = [p[0] * k for p in todas]
    ys = [-p[1] for p in todas]
    min_x, max_x, min_y, max_y = min(xs), max(xs), min(ys), max(ys)
    escala = min((VIEW_W - 2 * PADDING) / (max_x - min_x), (VIEW_H - 2 * PADDING) / (max_y - min_y))
    off_x = (VIEW_W - (max_x - min_x) * escala) / 2
    off_y = (VIEW_H - (max_y - min_y) * escala) / 2

    def projetar(lon: float, lat: float) -> tuple[float, float]:
        return (
            round((lon * k - min_x) * escala + off_x, 1),
            round((-lat - min_y) * escala + off_y, 1),
        )

    saida = []
    for f in features:
        codigo = str(f["properties"]["codarea"])[:2]
        sigla = SIGLA_POR_CODIGO.get(codigo)
        if not sigla:
            print(f"[erro] código de UF desconhecido na malha: {codigo}")
            return 1

        partes, maior_area, ancora = [], 0.0, (0.0, 0.0)
        for anel in aneis(f["geometry"]):
            pontos = [projetar(lon, lat) for lon, lat in anel]
            # remove pontos repetidos consecutivos antes de simplificar
            limpo = [pontos[0]]
            for p in pontos[1:]:
                if p != limpo[-1]:
                    limpo.append(p)
            if len(limpo) < 4:
                continue
            simplificado = douglas_peucker(limpo, TOLERANCIA)
            if len(simplificado) < 4:
                continue
            area, cx, cy = area_e_centroide(simplificado)
            if area < 1.5:  # descarta ilhas minúsculas, invisíveis no mapa
                continue
            partes.append(simplificado)
            if area > maior_area:
                maior_area, ancora = area, (round(cx, 1), round(cy, 1))

        d = " ".join(
            "M" + " L".join(f"{x} {y}" for x, y in parte) + " Z" for parte in partes
        )
        saida.append(
            {
                "codigo_uf": codigo,
                "sigla_uf": sigla,
                "estado": NOME_POR_CODIGO[codigo],
                "path": d,
                "label_x": ancora[0],
                "label_y": ancora[1],
                "area": round(maior_area, 1),
            }
        )

    saida.sort(key=lambda u: u["sigla_uf"])
    payload = {
        "fonte": "IBGE — API de Malhas Territoriais v3 (qualidade mínima, intrarregião UF)",
        "projecao": "equirretangular com correção de longitude pela latitude média",
        "view_box": {"largura": VIEW_W, "altura": VIEW_H},
        "ufs": saida,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"[malha] {len(saida)} UFs escritas em {OUT_PATH} ({OUT_PATH.stat().st_size/1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.setrecursionlimit(10000)
    raise SystemExit(main())
