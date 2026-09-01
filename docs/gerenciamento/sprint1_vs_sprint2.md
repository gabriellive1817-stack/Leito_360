# Planejado na Sprint 1 x Entregue na Sprint 2

> **Pendência:** a apresentação da Sprint 1 não foi anexada a esta sessão de
> trabalho. Esta tabela foi montada a partir do protótipo Figma entregue
> (única evidência disponível da Sprint 1) e precisa ser revisada/completada
> pelo grupo com o conteúdo real da apresentação da Sprint 1 antes de ir para
> o PPT final.

| Item | Sprint 1 (protótipo Figma) | Sprint 2 (este repositório) | Status |
|---|---|---|---|
| Dados | Números fixos no código (ocupação, ranking, internações) | Pipeline real (SIH/SUS, CNES, IBGE), 162 registros reconciliados | Implementado |
| Fontes | Citadas como texto ("DATASUS/SIH-SUS", "CNES") sem integração | Fontes reais consultadas via TabNet/API, brutos preservados em `data/raw/` | Implementado |
| Oracle | Mencionado na UI ("Oracle 23ai") sem execução real | Tabela relacional, JSON nativo, external table, view analítica — scripts prontos em `oracle/sql/` | Implementado (execução real depende do usuário rodar no ambiente acadêmico — ver `docs/evidencias/`) |
| Select AI | SQL "gerado pelo Select AI" era texto estático no componente `SQLHighlight` | Perfil real `LEITO360_AI` seguindo o LiveLabs 4222, perguntas reais via `SHOWSQL`/`RUNSQL` | Parcialmente implementado — scripts prontos, execução e evidências pendentes de rodar no Oracle acadêmico |
| Dashboard — Visão Executiva | 2 telas mockadas, sem filtros funcionais | Filtro por competência/região, seleção de UF, mapa por pressão assistencial real, ranking real, tendência 6 meses real | Implementado |
| Dashboard — Consulta | "Consulta em Linguagem Natural" simulando resposta em 0,8s | "Explorador Analítico" com filtros guiados reais + exportação CSV; Select AI de verdade fica no Database Actions | Implementado |
| "Ao vivo" / ocupação em tempo real | Badge "Ao vivo" e % de ocupação fictícios | Removidos; indicador renomeado para "pressão assistencial comparativa" (dados de competência fechada) | Corrigido |
| Publicação | Não publicado | Pendente — depende de ação do usuário (GitHub público, GitHub Pages) | Planejado |
| Vídeo pitch | Não existia | Roteiro pronto em `docs/roteiro_pitch/`; gravação pendente de todos os componentes estarem publicados | Planejado |

## Gerenciamento do trabalho nesta sessão

- Escopo revisado com o representante do grupo antes de iniciar (materiais
  faltantes identificados, decisão sobre LiveLabs 4222 registrada, política
  de credenciais confirmada).
- ETL: implementado, executado e validado (evidência: `data/processed/validacao_pipeline.json`).
- Scripts Oracle: implementados; execução real requer o ambiente acadêmico
  do usuário (ver `README.md`, seção "Como executar as cargas Oracle").
- Dashboard: reescrito para consumir dados reais; teste visual em navegador
  pendente porque esta máquina não tem Node.js instalado (ver `README.md`).
