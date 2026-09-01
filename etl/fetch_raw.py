"""Etapa 1 do pipeline LEITO360: busca nas fontes oficiais e preserva as
respostas originais (brutas) em data/raw/, sem qualquer tratamento.

Fontes:
  - SIH/SUS (TabNet, sih/cnv/niuf.def): internações, permanência média,
    óbitos, taxa de mortalidade por UF e competência.
  - CNES (TabNet, cnes/cnv/leiintbr.def): leitos de internação destinados
    ao SUS por UF e competência.
  - IBGE/SIDRA (API pública, tabela 6579): população estimada por UF.

Uso: python etl/fetch_raw.py
"""
from __future__ import annotations

import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ufs import COMPETENCIAS  # noqa: E402

RAW_DIR = Path(__file__).parent.parent / "data" / "raw"

SIH_URL = "http://tabnet.datasus.gov.br/cgi/tabcgi.exe?sih/cnv/niuf.def"
CNES_URL = "http://tabnet.datasus.gov.br/cgi/tabcgi.exe?cnes/cnv/leiintbr.def"
IBGE_URL = "https://apisidra.ibge.gov.br/values/t/6579/n3/all/v/9324/p/last"

USER_AGENT = "LEITO360-ETL/1.0 (uso academico FIAP Challenge Grupo 61)"


def _post_latin1(url: str, pairs: list[tuple[str, str]], retries: int = 3) -> bytes:
    def enc(s: str) -> str:
        return urllib.parse.quote(s.encode("latin-1"), safe="")

    body = "&".join(f"{enc(k)}={enc(v)}" for k, v in pairs).encode("ascii")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                return resp.read()
        except (urllib.error.URLError, TimeoutError) as exc:
            last_err = exc
            print(f"  tentativa {attempt}/{retries} falhou: {exc}", file=sys.stderr)
            time.sleep(2 * attempt)
    raise RuntimeError(f"Falha ao consultar {url} apos {retries} tentativas: {last_err}")


def fetch_sih(competencia: str, sufixo: str) -> Path:
    pairs = [
        ("Linha", "Unidade_da_Federação"),
        ("Coluna", "--Não-Ativa--"),
        ("Incremento", "Internações"),
        ("Incremento", "Média_permanência"),
        ("Incremento", "Óbitos"),
        ("Incremento", "Taxa_mortalidade"),
        ("Arquivos", f"niuf{sufixo}.dbf"),
        ("SRegião", "TODAS_AS_CATEGORIAS__"),
        ("SUnidade_da_Federação", "TODAS_AS_CATEGORIAS__"),
        ("formato", "prn"),
        ("mostre", "Mostra"),
    ]
    content = _post_latin1(SIH_URL, pairs)
    out = RAW_DIR / f"sih_{competencia}.html"
    out.write_bytes(content)
    return out


def fetch_cnes(competencia: str, sufixo: str) -> Path:
    pairs = [
        ("Linha", "Unidade_da_Federação"),
        ("Coluna", "--Não-Ativa--"),
        ("Incremento", "Quantidade_SUS"),
        ("Arquivos", f"ltbr{sufixo}.dbf"),
        ("SRegião", "TODAS_AS_CATEGORIAS__"),
        ("SUnidade_da_Federação", "TODAS_AS_CATEGORIAS__"),
        ("formato", "prn"),
        ("mostre", "Mostra"),
    ]
    content = _post_latin1(CNES_URL, pairs)
    out = RAW_DIR / f"cnes_{competencia}.html"
    out.write_bytes(content)
    return out


def fetch_ibge() -> Path:
    req = urllib.request.Request(IBGE_URL, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=45) as resp:
        content = resp.read()
    out = RAW_DIR / "ibge_populacao.json"
    out.write_bytes(content)
    return out


def main() -> int:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    print("=== LEITO360 ETL — Etapa 1: coleta bruta das fontes oficiais ===")

    print("[IBGE/SIDRA] população estimada por UF...")
    path = fetch_ibge()
    print(f"  salvo em {path.relative_to(Path.cwd())}")

    for competencia, sufixo in COMPETENCIAS:
        print(f"[SIH/SUS] competência {competencia} (arquivo niuf{sufixo}.dbf)...")
        path = fetch_sih(competencia, sufixo)
        print(f"  salvo em {path.relative_to(Path.cwd())}")
        time.sleep(1)

        print(f"[CNES] competência {competencia} (arquivo ltbr{sufixo}.dbf)...")
        path = fetch_cnes(competencia, sufixo)
        print(f"  salvo em {path.relative_to(Path.cwd())}")
        time.sleep(1)

    print("Coleta concluída. Arquivos brutos preservados em data/raw/.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
