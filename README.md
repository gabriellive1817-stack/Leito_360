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

## Entregáveis

| Item | Link |
|---|---|
| Repositório público | [github.com/gabriellive1817-stack/Leito_360](https://github.com/gabriellive1817-stack/Leito_360) |
| Aplicação publicada | [gabriellive1817-stack.github.io/Leito_360](https://gabriellive1817-stack.github.io/Leito_360/) |
| Vídeo pitch (YouTube) | [https://www.youtube.com/watch?v=IAoJ_zeWXmQ](https://www.youtube.com/watch?v=IAoJ_zeWXmQ) |
| Apresentação | `EC_Sprint_2_1TSCOA_EvidenciasConstrucao_LEITO360_GRUPO61.pptx` |

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
| IBGE — Malhas Territoriais | malha oficial das 27 UFs usada no mapa do dashboard | `servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&qualidade=minima` |

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
opções de provedor:

- **Opção B — Cohere** ✅ **é a que funciona e a que foi usada na demonstração**. Chave de API gratuita em `dashboard.cohere.com`, conforme demonstrado em aula. Não coberto pelo LiveLabs 4222.
- **Opção A — OCI Generative AI (`OCI$RESOURCE_PRINCIPAL`)**: segue literalmente o LiveLabs 4222. Bloqueada nos sandboxes testados (ver abaixo).
- **Opção C — credencial nativa `AI_CREDENTIAL`**: provisionada pelo próprio LiveLabs 4222 (Task 2 do Lab 1) em alguns sandboxes. Também bloqueada.

### Status real da execução: **funcionando** (01/09/2026)

O Select AI responde de verdade com o provider **Cohere**, no sandbox
`MovieStreamWorkshop229748` (tenancy `c4ustudent03`, usuário `ADMIN`), com
tempos de 1,7 a 4,1 s. A Pergunta 1 gerou, sozinha, este SQL a partir da
pergunta em português:

```sql
SELECT vw."ESTADO", vw."SIGLA_UF"
FROM "ADMIN"."VW_LEITO360_ANALITICO" vw
WHERE vw."COMPETENCIA" = '2026-04'
ORDER BY vw."INTERNACOES_POR_100K_HAB" DESC
```

O modelo escolheu a view analítica, a competência e o indicador corretos sem
nenhuma dica no prompt — o `"comments": "true"` do perfil envia os
`COMMENT ON TABLE/COLUMN` dos scripts `01`, `02` e `05` como contexto
semântico.

**Passo crítico que não está no LiveLabs 4222:** com provedor externo, o
Autonomous Database bloqueia a saída de rede e todo `GENERATE` falha com
`ORA-24247: Network access denied by access control list (ACL)`. É preciso
liberar o host com `DBMS_NETWORK_ACL_ADMIN.APPEND_HOST_ACE` antes de criar a
credencial — está no Passo 1 do script `07`.

**As 5 perguntas foram conferidas contra o pipeline validado** — e o resultado
honesto é misto:

| Pergunta | Conferência |
|---|---|
| 1 · Pressão assistencial por UF | Valores corretos, **ordenação errada** |
| 2 · Menor oferta de leitos por região | ❌ **Incorreta** — respondeu "Nordeste", que é a região de *maior* oferta (17,15/10 mil hab); a menor é o Sudeste (12,53) |
| 3 · Permanência acima da média nacional | ✅ Correta na parte visível |
| 4 · Maior aumento de internações mar→abr | ✅ Correta (RS +1.187, exato) |
| 5 · Internações x leitos por região | ✅ Correta, número a número |

Ou seja: **3 de 5 plenamente corretas, 1 com ordenação errada, 1 incorreta**.
O Select AI é uma boa ferramenta de exploração, mas não substitui a consulta
auditada — é exatamente por isso que o dashboard não usa o Select AI para
gerar seus números: ele consome o JSON determinístico do ETL e identifica o
SQL exibido como *não gerado por IA*. Detalhamento completo, com os retornos
transcritos e a conferência de cada um, em
[`docs/evidencias/select_ai_perguntas.md`](docs/evidencias/select_ai_perguntas.md).

Outra limitação registrada: a ação `chat` alucinou ao descrever o próprio
projeto (ela não consulta o banco — só `showsql` e `runsql` usam os dados).

**Por que Cohere e não OCI:** as opções A e C foram testadas em 2 sandboxes,
2 tenancies, 3 regiões e com 2 credenciais diferentes. Em todas, o serviço
devolveu `ORA-20404` com uma URL malformada contendo o literal
`my$cloud_domain` — variável de template não substituída pela infraestrutura
do sandbox, do lado da Oracle. A troca de provedor manteve toda a arquitetura
Select AI intacta, o que confirma na prática que o `DBMS_CLOUD_AI` isola bem
a aplicação do provedor de LLM.

## Como executar o ETL

Requisitos: Python 3.10+ (biblioteca padrão apenas, sem dependências
externas).

```bash
python etl/fetch_raw.py
python etl/parse_validate_build.py
python etl/build_malha_uf.py
```

O primeiro script busca as três fontes oficiais e grava as respostas
originais em `data/raw/`. O segundo parseia, padroniza, valida (cobertura
das 27 UFs, duplicatas, nulos, reconciliação com os totais do TABNET),
calcula os indicadores e gera:

- `data/processed/leito360_consolidado.csv` e `.json` (162 registros)
- `data/processed/validacao_pipeline.json` (relatório de validação/reconciliação)
- `oracle/data/sih_internacoes.csv`, `oracle/data/cnes_leitos.json`, `oracle/data/ibge_populacao.csv`

O terceiro script (`build_malha_uf.py`) baixa a malha territorial oficial das
UFs no IBGE, preserva a resposta original em `data/raw/ibge_malha_uf.geojson`,
projeta a geometria para o sistema de coordenadas do SVG, simplifica por
Douglas-Peucker e grava `public/data/uf_malha.json` — o mapa do dashboard.
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
4. Rode `07_select_ai_profile.sql` — **Opção B (Cohere)**, os quatro passos em
   ordem: liberar a ACL de rede para `api.cohere.ai`, criar a credencial com a
   sua chave de API, criar o perfil, testar com `chat`. Depois
   `08_select_ai_perguntas.sql`.
5. Preencha `docs/evidencias/select_ai_perguntas.md` com os resultados reais
   e guarde as capturas (sem expor usuário/senha) em `docs/evidencias/prints/`.

Atalho para recriar o schema num ambiente novo: `oracle/sql/consolidado_recriacao/`
tem os quatro blocos (`01_sih.sql`, `02_cnes.sql`, `03_populacao.sql`,
`04_view.sql`) com o DDL e todos os `INSERT` já gerados a partir de
`oracle/data/` — cole cada um no SQL Worksheet e rode como **script**. Foram
gerados pelo ETL, não digitados à mão, e reproduzem exatamente os 162 + 162 +
27 registros validados.

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

## Dashboard — o que cada tela mostra

**Visão Executiva.** Quatro indicadores do recorte selecionado (internações
do período, média por dia, permanência média ponderada e leitos SUS
cadastrados), o mapa das 27 UFs colorido pelo tercil de pressão assistencial
da competência, o ranking das cinco UFs sob maior pressão e a série das seis
competências.

**Explorador Analítico.** Quatro consultas guiadas — maior pressão
assistencial, menor oferta de leitos, maior permanência média e maior taxa de
mortalidade — com o resultado em tabela, o SQL equivalente (identificado como
**não** gerado por IA), o painel de qualidade e cobertura do pipeline, as
fontes oficiais e as limitações metodológicas. O botão de exportação gera o
CSV do recorte atual.

**O recorte é único e vale para as duas telas.** Competência e região vêm da
barra superior; clicar numa UF (no mapa ou no ranking) recorta tudo — títulos,
indicadores, ranking, série, tabela e o `WHERE` do SQL equivalente passam a
responder só por aquela UF. "Limpar recorte" volta ao Brasil.

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
- O mapa usa a malha oficial do IBGE em qualidade mínima, ainda simplificada
  por Douglas-Peucker e projetada em equirretangular: serve para leitura
  comparativa entre UFs, não para medição cartográfica.
- Select AI depende de um provedor de LLM configurado na conta Oracle do
  usuário (aqui: Cohere, com chave de API pessoal) e da liberação de ACL de
  rede para o host do provedor; não há chave/credencial embutida no
  repositório nem no dashboard.
- O SQL gerado pelo Select AI é não determinístico: `showsql` e `runsql` são
  chamadas separadas ao modelo e podem produzir SQL diferente entre si. Na
  conferência das 5 perguntas, 3 vieram corretas, 1 com ordenação errada e 1
  com o conteúdo invertido. Toda saída do Select AI deve ser conferida contra
  `data/processed/` antes de virar informação para decisão.
- A ação `chat` do `DBMS_CLOUD_AI` não consulta o banco — é conversa livre com
  o modelo e pode alucinar (aconteceu: descreveu o LEITO360 como plataforma do
  Ministério da Saúde). Só `showsql` e `runsql` usam os dados do projeto.

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
├── etl/                        — pipeline Python (fetch, parse, validação, indicadores, malha)
├── data/raw/                   — respostas originais das fontes (preservadas)
├── data/processed/             — CSV/JSON tratados + relatório de validação
├── oracle/data/                — 3 formatos separados (CSV relacional, JSON, CSV externo)
├── oracle/sql/                 — DDL, carga, view analítica, Select AI
├── docs/evidencias/            — evidências documentadas (o quê, prova, fonte, limitação)
├── docs/evidencias/prints/     — capturas do dashboard publicado (sem credenciais)
├── docs/arquitetura/           — diagramas e decisões de arquitetura
├── docs/gerenciamento/         — gestão do projeto (Sprint 1 x Sprint 2)
├── docs/roteiro_pitch/         — roteiro de gravação + texto falado do pitch
├── apresentacao/               — gerador do PPTX de evidências (pptxgenjs)
└── README.md
```
