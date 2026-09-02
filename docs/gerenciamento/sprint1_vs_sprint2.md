# Planejado na Sprint 1 x Entregue na Sprint 2

Comparativo entre o que a Sprint 1 propôs (protótipo Figma + apresentação) e o
que foi efetivamente implementado nesta Sprint 2.

> **Nota sobre a identificação do grupo:** a Sprint 1 foi entregue como
> **GRUPO 77**. O grupo foi renumerado depois disso e passou a ser o
> **GRUPO 61**, identificação usada nesta Sprint 2 e na planilha
> `Informacoes_Finais_Projeto_Integrantes_v1.xlsx`. Mesmo grupo, mesmos cinco
> integrantes. Os arquivos da Sprint 1 mantêm o nome original da entrega para
> não alterar o material tal como foi submetido na época.

| Item | Sprint 1 (protótipo) | Sprint 2 (este repositório) | Status |
|---|---|---|---|
| Dados | Números fixos no código (ocupação, ranking, internações) | Pipeline real (SIH/SUS, CNES, IBGE), 162 registros reconciliados com os totais de controle do TabNet | Implementado |
| Fontes | Citadas como texto ("DATASUS/SIH-SUS", "CNES") sem integração | Consultadas por HTTP real via TabNet e API do IBGE, respostas originais preservadas em `data/raw/` | Implementado |
| Oracle | Mencionado na UI ("Oracle 23ai") sem execução real | Tabela relacional, JSON nativo, external table e view analítica **carregados e conferidos** no Oracle (LiveLabs sandbox #229599, 31/08–01/09/2026) | Implementado |
| Select AI | SQL "gerado pelo Select AI" era texto estático no componente `SQLHighlight` | Perfil `LEITO360_AI` real com provider Cohere, respondendo em 1,7–4,3 s; NL2SQL confirmado, e as 5 respostas conferidas contra o pipeline (3 corretas, 1 com ordenação errada, 1 incorreta) | Implementado — evidências em `docs/evidencias/select_ai_perguntas.md` |
| Dashboard — Visão Executiva | 2 telas mockadas, sem filtros funcionais | Filtro por competência e região, mapa com a **malha oficial do IBGE** colorido por tercil, ranking, série de 6 competências; clicar numa UF recorta a tela inteira | Implementado |
| Dashboard — Consulta | "Consulta em Linguagem Natural" simulando resposta em 0,8s | "Explorador Analítico" com 4 consultas guiadas, SQL equivalente identificado como não gerado por IA, qualidade/cobertura do pipeline e exportação CSV | Implementado |
| "Ao vivo" / ocupação em tempo real | Badge "Ao vivo" e % de ocupação fictícios | Removidos; indicador renomeado para "pressão assistencial comparativa" (competência fechada), com a limitação declarada na própria tela | Corrigido |
| Publicação | Não publicado | Repositório público no GitHub e dashboard no ar via GitHub Pages | Implementado |
| Vídeo pitch | Não existia | Roteiro e texto falado em `docs/roteiro_pitch/`, gravado com demonstração ao vivo do dashboard publicado e do Oracle Database Actions (incluindo o Select AI respondendo) | Implementado |

## Evidências de cada linha

| Afirmação | Onde conferir |
|---|---|
| 162 registros, 0 duplicatas, 0 nulos, reconciliação com o TabNet | `data/processed/validacao_pipeline.json` |
| Execução real no Oracle | `docs/evidencias/` e slide 14 da apresentação |
| Select AI respondendo (SQL gerado + resultado) | `docs/evidencias/select_ai_perguntas.md` e slide 15 |
| Dashboard sem mocks | `docs/evidencias/prints/` (capturas da aplicação publicada) |
| Malha oficial do IBGE | `etl/build_malha_uf.py` e `data/raw/ibge_malha_uf.geojson` |

## Gerenciamento do trabalho

- Escopo revisado com o representante do grupo antes de iniciar: materiais
  faltantes identificados, decisão sobre o uso do LiveLabs 4222 registrada em
  `docs/arquitetura/decisao_livelabs_4222.md`, política de credenciais
  confirmada (nada de segredo versionado).
- ETL implementado, executado e validado — a validação é automática e o
  pipeline sai com código diferente de zero se a qualidade falhar.
- Scripts Oracle implementados e executados; as evidências da rodada real
  estão registradas com o número do sandbox e a data.
- Dashboard reescrito para consumir dados reais, testado no navegador e
  publicado; as capturas versionadas em `docs/evidencias/prints/` são as
  mesmas que aparecem nos slides 7 e 8.
- Apresentação gerada por script (`apresentacao/build_pptx.js`), não editada
  à mão, para continuar reprodutível junto com o restante do projeto.

## O que ficou de fora desta sprint

- Captura do `showsql` das perguntas 2 a 5 (só os resultados foram
  transcritos), o que permitiria explicar com certeza por que a pergunta 2
  respondeu errado.
- Automatização da carga do Oracle por job agendado.
