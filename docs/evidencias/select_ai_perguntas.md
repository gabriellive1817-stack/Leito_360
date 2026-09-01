# Evidências — Select AI (LEITO360)

## Status desta execução (LiveLabs Sandbox, reserva #229599, 31/08–01/09/2026)

O perfil `LEITO360_AI` foi criado com sucesso, real, no ambiente de sandbox do
LiveLabs 4222 (usuário `MOVIESTREAM`, tenancy `C4U04`, região `ap-hyderabad-1`),
seguindo exatamente o padrão da Task 2/3 do Lab 1 do workshop
(`DBMS_CLOUD_AI.CREATE_PROFILE`, provider `oci`). A execução real do
`DBMS_CLOUD_AI.GENERATE` (ações `chat`, `showsql`) **não completou dentro do
tempo disponível na sessão** — cada chamada ficou pendente por vários minutos
até falhar, indicando indisponibilidade momentânea do serviço OCI Generative AI
neste ambiente de sandbox (LiveLabs), não um erro de configuração do LEITO360.

### O que foi tentado e confirmado, na ordem

1. **Tentativa 1 — credencial `OCI$RESOURCE_PRINCIPAL`, região `ap-osaka-1`**
   (a região "Generative AI Endpoint Region" mostrada no painel de reserva do
   LiveLabs): erro imediato e reproduzível
   `ORA-20404: Object not found - https://inference.generativeai.ap-osaka-1.oci.my$cloud_domain/20231130/actions/chat`.
   O literal `my$cloud_domain` na URL do erro indica uma variável de template
   não substituída na configuração de rede/policy desse sandbox específico —
   não algo controlável a partir do SQL Worksheet.

2. **Tentativa 2 — mesma credencial, região `ap-hyderabad-1`** (região nativa
   da instância): mesmo padrão de erro
   `ORA-20404: Object not found - https://inference.generativeai.ap-hyderabad-1.oci.my$cloud_domain/...`.

3. **Descoberta:** consulta a `user_credentials` revelou uma credencial já
   provisionada pelo próprio workshop, `AI_CREDENTIAL` (usuário
   `ocid1.user.oc1..aa...`, sem `RESOURCE_PRINCIPAL`) — exatamente o que a
   **Task 2: "Query the Available Native OCI Credential"** do Lab 1 pedia
   para localizar antes de configurar o profile.

4. **Tentativa 3 — perfil recriado com `credential_name => 'AI_CREDENTIAL'`**
   (sem `region`, deixando o default do provider): o `CREATE_PROFILE` e o
   `DROP_PROFILE` executam normalmente e rápido (~1-2s cada). Porém toda
   chamada subsequente a `DBMS_CLOUD_AI.GENERATE` — testada com `action =>
   'chat'` (prompts "o que e o LEITO360", "ping", "oi") e `action =>
   'showsql'` (pergunta de negócio real sobre internações por 100 mil
   habitantes) — ficou pendente entre ~3 e ~5+ minutos antes de falhar com
   `Falha na execução de código` (sem corpo de erro recuperável na mesma
   sessão), em duas abas/worksheets diferentes e em momentos diferentes.

Uma consulta SQL comum (`SELECT 1 FROM dual`) no mesmo worksheet, com o mesmo
usuário, respondeu em milissegundos — confirmando que o banco e a conexão
estão saudáveis; o problema está isolado à chamada de inferência do OCI
Generative AI feita pelo `DBMS_CLOUD_AI.GENERATE` dentro deste sandbox.

### Classificação honesta

- **Implementado e verificado:** criação do profile, uso da credencial
  correta indicada pelo workshop, sintaxe das 5 perguntas prontas em
  `oracle/sql/08_select_ai_perguntas.sql`.
- **Bloqueado nesta execução:** obtenção de resposta real do modelo de
  linguagem (chat/SHOWSQL/RUNSQL) — falha de infraestrutura do provedor
  (OCI Generative AI) no ambiente de sandbox do LiveLabs, não do código do
  LEITO360.
- **Próximo passo:** reexecutar `oracle/sql/08_select_ai_perguntas.sql` em um
  ambiente Oracle com OCI Generative AI confirmadamente saudável (tenancy
  acadêmica própria, ou uma nova reserva de sandbox em outro horário/região)
  e preencher as 5 perguntas abaixo com prompt, SQL gerado, resultado e
  interpretação reais.

---

## Configuração do perfil (sem expor credenciais)

- Provider usado: OCI Generative AI (`oci`)
- Credencial: `AI_CREDENTIAL` (credencial nativa provisionada pelo LiveLabs 4222, Task 2 do Lab 1 — não é `OCI$RESOURCE_PRINCIPAL`)
- Tenancy: `C4U04` — Região da instância: `ap-hyderabad-1` (India South)
- `object_list`: `MOVIESTREAM.LEITO360_SIH`, `MOVIESTREAM.LEITO360_CNES_JSON`, `MOVIESTREAM.LEITO360_POPULACAO`, `MOVIESTREAM.VW_LEITO360_ANALITICO`
- Modelo: não determinado (chamada de inferência não completou)

## Perguntas 1 a 5

Prompts prontos e testados sintaticamente em `oracle/sql/08_select_ai_perguntas.sql`;
SQL gerado, resultado, tempo de execução e interpretação **pendentes de uma
execução bem-sucedida do serviço OCI Generative AI** (ver diagnóstico acima).

1. "Quais Unidades da Federação tiveram mais internações por 100 mil habitantes em abril de 2026?" — pendente
2. "Quais regiões possuem menor oferta de leitos SUS por 10 mil habitantes?" — pendente
3. "Quais Unidades da Federação possuem permanência média acima da média nacional?" — pendente
4. "Quais UFs apresentaram maior aumento de internações entre março e abril de 2026?" — pendente
5. "Compare internações e leitos SUS cadastrados por região em abril de 2026." — pendente
