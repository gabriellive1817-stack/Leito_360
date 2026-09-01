# LEITO360

Plataforma analítica para consolidar dados públicos do SUS e permitir que
gestores comparem internações, permanência média, mortalidade hospitalar,
capacidade cadastrada de leitos SUS e população entre regiões e Unidades da
Federação do Brasil.

**Challenge FIAP + Oracle 2026 — Sprint 2 · Turma 1TSCOA · Grupo 61**

| RM | Integrante | Responsabilidade |
|---|---|---|
| 569250 | Gabriel Silva de Jesus (representante) | Dados, fontes, arquitetura |
| 573021 | João Gabriel Bernardes | ETL e indicadores |
| 570993 | Natália Naomi Nakamura | Gestão, negócio e documentação |
| 568816 | Pedro Henrique Wei Chern | IA e Select AI |
| 570130 | Vitória Cristina da Silva Coutinho | UX/UI, protótipo e front-end |

---

## Problema

Gestores de saúde não têm um painel único, público e reprodutível para
comparar a pressão assistencial hospitalar (internações), a permanência
média, a mortalidade hospitalar e a capacidade cadastrada de leitos SUS
entre Unidades da Federação — precisando cruzar manualmente relatórios do
SIH/SUS, do CNES e do IBGE.

## Público-alvo

Gestores públicos de saúde, pesquisadores e analistas que precisam de uma
visão comparativa nacional/regional/estadual baseada em dados oficiais
abertos, sem depender de sistemas internos hospitalares.

## Escopo (o que o MVP entrega — e o que não entrega)

O LEITO360 **não é** um sistema de monitoramento hospitalar em tempo real.
Ele consolida **competências fechadas** do SIH/SUS e do CNES (dados sujeitos
a atualização retroativa pelo DATASUS) e a população estimada pelo IBGE.

Explicitamente **fora de escopo** nesta versão:
- Ocupação hospitalar em tempo real ou vagas livres (leitos SUS cadastrados
  ≠ vagas disponíveis agora).
- Monitoramento operacional "ao vivo".
- Alertas automáticos.
- Qualquer promessa de redução de custo ou impacto assistencial não validada.

O indicador geográfico principal do dashboard chama-se **"pressão
assistencial comparativa — internações por 100 mil habitantes"**, nunca
"ocupação hospitalar".

## Recorte de dados

Seis competências: **11/2025, 12/2025, 01/2026, 02/2026, 03/2026, 04/2026**.
Competência padrão do dashboard: **04/2026** (mais recente com cobertura das
27 UFs nas três fontes no momento da extração).

## Fontes oficiais

| Fonte | Uso | Consulta |
|---|---|---|
| SIH/SUS — Morbidade Hospitalar | internações, permanência média, óbitos, taxa de mortalidade, por UF/competência | `tabnet.datasus.gov.br/cgi/deftohtm.exe?sih/cnv/niuf.def` |
| CNES — Leitos de Internação | leitos de internação cadastrados destinados ao SUS, por UF/competência | `tabnet.datasus.gov.br/cgi/deftohtm.exe?cnes/cnv/leiintbr.def` |
| IBGE/SIDRA — População estimada | população estimada 2026 por UF | `apisidra.ibge.gov.br/values/t/6579/n3/all/v/9324/p/last` |

Os totais de controle originalmente informados foram reconciliados: a
execução mais recente do ETL bateu exatamente (diferença zero) com todos os
6 totais mensais de internações e leitos SUS. Ver
`data/processed/validacao_pipeline.json` para o relatório completo gerado a
cada execução — se o DATASUS atualizar os dados retroativamente, o pipeline
usa e reporta o valor mais recente, documentando a diferença.

## Indicadores e fórmulas

1. **Internações por 100 mil habitantes** = internações ÷ população × 100.000
2. **Leitos SUS por 10 mil habitantes** = leitos SUS cadastrados ÷ população × 10.000
3. **Permanência média ponderada** = Σ(permanência média da UF × internações da UF) ÷ Σ(internações)
4. **Variação mensal de internações** = (internações mês atual ÷ internações mês anterior − 1) × 100
5. **Internações por leito cadastrado** = internações ÷ leitos SUS cadastrados
6. **Tercil de pressão assistencial comparativa** = classificação por tercis do indicador (1) dentro de cada competência, usada para colorir o mapa.

## Arquitetura implementada

```
Fontes oficiais (TabNet SIH/CNES, API IBGE/SIDRA)
        │  POST/GET reais (etl/fetch_raw.py)
        ▼
data/raw/            — respostas originais preservadas (HTML/JSON brutos)
        │  parse + padronização + validação (etl/parse_validate_build.py)
        ▼
data/processed/       — CSV/JSON tratados + relatório de validação
        │
        ├──► oracle/data/  — 3 formatos separados (CSV relacional, JSON, CSV externo)
        │        │  scripts oracle/sql/*.sql (DDL, carga, view, Select AI)
        │        ▼
        │    Oracle Autonomous AI Database (relacional + JSON nativo + external table)
        │        │  export/print de evidências (execução manual do usuário)
        │        ▼
        │    docs/evidencias/
        │
        └──► public/data/leito360.json — JSON sanitizado, sem credenciais
                 │
                 ▼
             Dashboard React/Vite (src/) — site estático, publicável no GitHub Pages
```

O front-end **não** se conecta diretamente ao Oracle nem contém
credenciais: ele lê um JSON estático gerado pelo ETL local. O Select AI é
executado e demonstrado diretamente no Database Actions da Oracle (ver
`oracle/sql/07_select_ai_profile.sql` e `08_select_ai_perguntas.sql`); o
dashboard mostra apenas consultas guiadas equivalentes, claramente
identificadas como não geradas por IA.

## Oracle — os três formatos

| Objeto | Formato | Script |
|---|---|---|
| `LEITO360_SIH` | Tabela relacional | `oracle/sql/01_ddl_sih.sql` |
| `LEITO360_CNES_JSON` | Coleção/documento JSON nativo (23ai) | `oracle/sql/02_ddl_cnes_json.sql` |
| `LEITO360_POPULACAO_EXT` | External table sobre CSV no Object Storage | `oracle/sql/03_external_table_ibge.sql` |
| `VW_LEITO360_ANALITICO` | View analítica integrando as três fontes | `oracle/sql/05_view_analitica.sql` |

**Nota importante sobre fontes de sintaxe SQL:** o workshop oficial
[LiveLabs 4222](https://livelabs.oracle.com/ords/r/dbpm/livelabs/view-workshop?wid=4222)
("Chat with Your Data in Autonomous AI Database Using Select AI") foi
inspecionado integralmente. Ele cobre a criação do **perfil do Select AI**
(`DBMS_CLOUD_AI.CREATE_PROFILE`) sobre um schema `MOVIESTREAM` já
provisionado por um stack Terraform da Oracle — e esse é o padrão que
seguimos literalmente em `oracle/sql/07_select_ai_profile.sql` e
`08_select_ai_perguntas.sql` (mesmo provider `oci`, credencial
`OCI$RESOURCE_PRINCIPAL`, ações `showsql`/`runsql`/`chat`). Ele **não**
ensina criação de tabela relacional, coleção JSON ou external table para
dados customizados — por isso os scripts `01`, `02`, `03`, `04`, `05` e `06`
seguem a documentação oficial do Oracle Autonomous AI Database 23ai
(`DBMS_CLOUD.CREATE_EXTERNAL_TABLE`, tipo `JSON` nativo, etc.), não o
LiveLabs 4222. Essa decisão foi validada com o representante do grupo antes
da implementação.

## Select AI

Perfil `LEITO360_AI`, restrito aos objetos do LEITO360
(`LEITO360_SIH`, `LEITO360_CNES_JSON`, `LEITO360_POPULACAO`,
`VW_LEITO360_ANALITICO`). `oracle/sql/07_select_ai_profile.sql` traz três
opções de provedor — escolha a que funcionar no seu ambiente:

- **Opção A — OCI Generative AI (`OCI$RESOURCE_PRINCIPAL`)**: segue literalmente o LiveLabs 4222. Requer OCI Generative AI habilitado na região da sua tenancy.
- **Opção B — Cohere**: conforme demonstrado em aula (professor Milton Goya, chave de API gratuita em `dashboard.cohere.com`). Não coberto pelo LiveLabs 4222.
- **Opção C — credencial nativa `AI_CREDENTIAL`**: a credencial que o próprio LiveLabs 4222 (Task 2 do Lab 1) provisiona automaticamente em ambientes de sandbox — encontre com `SELECT credential_name FROM user_credentials`.

### Status real da execução (LiveLabs sandbox #229599, 31/08–01/09/2026)

O perfil `LEITO360_AI` foi criado com sucesso usando a **Opção C**. As
chamadas de `DBMS_CLOUD_AI.GENERATE` (ações `chat` e `showsql`), porém,
ficaram pendentes por vários minutos e falharam por timeout em 4 tentativas
distintas — diagnóstico completo, com os erros exatos observados, em
[`docs/evidencias/select_ai_perguntas.md`](docs/evidencias/select_ai_perguntas.md).
Uma query comum (`SELECT 1 FROM dual`) respondeu normalmente no mesmo
worksheet, o que aponta para indisponibilidade do serviço OCI Generative AI
nesse sandbox específico, não um erro de configuração do LEITO360. As 5
perguntas de negócio exigidas pelo Challenge estão prontas em
`oracle/sql/08_select_ai_perguntas.sql`, aguardando uma execução em ambiente
com o serviço saudável.

## Como executar o ETL

Requisitos: Python 3.10+ (biblioteca padrão apenas, sem dependências
externas).

```bash
python etl/fetch_raw.py
python etl/parse_validate_build.py
```

O primeiro script busca as três fontes oficiais e grava as respostas
originais em `data/raw/`. O segundo parseia, padroniza, valida (cobertura
das 27 UFs, duplicatas, nulos, reconciliação com os totais do TABNET),
calcula os indicadores e gera:

- `data/processed/leito360_consolidado.csv` e `.json` (162 registros)
- `data/processed/validacao_pipeline.json` (relatório de validação/reconciliação)
- `oracle/data/sih_internacoes.csv`, `oracle/data/cnes_leitos.json`, `oracle/data/ibge_populacao.csv`
- `public/data/leito360.json` (consumido pelo dashboard)

O pipeline termina com código de saída diferente de zero se qualquer
critério de qualidade falhar (cobertura incompleta, duplicata, nulo em
campo crítico, ou divergência entre a soma por UF e o total do TabNet).

## Como executar as cargas Oracle

1. Provisione um Autonomous AI Database na sua conta OCI acadêmica.
2. No SQL Worksheet (Database Actions), rode em ordem:
   `01_ddl_sih.sql` → `02_ddl_cnes_json.sql` → `03_external_table_ibge.sql`
   (preencha os placeholders de credencial/URI do seu Object Storage) →
   `04_carga_dados.sql` (ou use Database Actions > Data Load para os
   arquivos de `oracle/data/`, caminho A descrito no próprio script) →
   `05_view_analitica.sql`.
3. Rode `06_validacoes.sql` e compare os resultados com
   `data/processed/validacao_pipeline.json`.
4. Rode `07_select_ai_profile.sql` (ajuste `<SCHEMA_LEITO360>` e a região) e
   depois `08_select_ai_perguntas.sql`.
5. Preencha `docs/evidencias/select_ai_perguntas.md` com os resultados reais
   e capture prints (sem expor usuário/senha) em `oracle/evidencias/`.

**Nenhuma credencial, senha, wallet ou string de conexão deve ser commitada
neste repositório.** Os scripts usam placeholders (`<CREDENTIAL_NAME>`,
`<URI_DO_ARQUIVO_NO_OBJECT_STORAGE>`, `<SCHEMA_LEITO360>`) que cada membro
substitui localmente antes de executar.

## Como executar o dashboard

```bash
pnpm i     # ou npm i
pnpm dev   # ou npm run dev
```

O dashboard lê `public/data/leito360.json` (gerado pelo ETL) — rode o ETL
antes de abrir o dashboard pela primeira vez.

## Como publicar

- **Dashboard (já publicado):** [gabriellive1817-stack.github.io/Leito_360](https://gabriellive1817-stack.github.io/Leito_360/)
  — build estático (`pnpm build`, com `base: '/Leito_360/'` em `vite.config.ts`)
  publicado na branch `gh-pages`. Sem backend, sem credenciais Oracle no bundle.
  Para republicar após uma alteração: `pnpm build`, depois copie o conteúdo de
  `dist/` para a branch `gh-pages` e faça push (ou use um workflow de deploy).
- **Repositório:** [github.com/gabriellive1817-stack/Leito_360](https://github.com/gabriellive1817-stack/Leito_360),
  público.
- Testado em janela anônima: link do GitHub, link da aplicação, links das
  fontes oficiais, e responsividade (mobile/desktop).

## Limitações

- Leitos SUS cadastrados não representam vagas livres em tempo real.
- Dados de competências fechadas, sujeitos a atualização retroativa pelo DATASUS.
- Sem monitoramento operacional ao vivo nem alertas automáticos.
- O geocódigo do mapa usa uma geometria estilizada dos estados (herdada do
  protótipo Figma), não um shapefile oficial do IBGE.
- Select AI depende de acesso a um provedor de LLM (OCI Generative AI,
  OpenAI, Azure ou Google Gemini) configurado na conta Oracle do usuário;
  não há chave/credencial embutida no repositório nem no dashboard.

## Próximos passos

- Automatizar a carga Oracle (scripts `04`/atualização da view) via job
  agendado, mantendo o histórico de competências.
- Avaliar exposição de um endpoint ORDS seguro para consulta guiada direto
  do Oracle, substituindo o JSON estático.
- Ampliar o recorte de indicadores (ex.: por tipo de procedimento/CID) caso
  o Challenge avance para novas sprints.

## Estrutura do repositório

```
LEITO360/
├── index.html, src/            — front-end React + TypeScript + Vite
├── public/data/                — JSON sanitizado consumido pelo dashboard
├── etl/                        — pipeline Python (fetch, parse, validação, indicadores)
├── data/raw/                   — respostas originais das fontes (preservadas)
├── data/processed/             — CSV/JSON tratados + relatório de validação
├── oracle/data/                — 3 formatos separados (CSV relacional, JSON, CSV externo)
├── oracle/sql/                 — DDL, carga, view analítica, Select AI
├── oracle/evidencias/          — prints da execução Oracle (sem credenciais)
├── docs/evidencias/            — evidências documentadas (o quê, prova, fonte, limitação)
├── docs/arquitetura/           — diagramas e decisões de arquitetura
├── docs/gerenciamento/         — gestão do projeto (Sprint 1 x Sprint 2)
├── docs/roteiro_pitch/         — roteiro do vídeo hands-on
└── README.md
```
