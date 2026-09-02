# Evidências — Select AI (LEITO360)

## Status final: **funcionando**, com provider Cohere

Depois de duas rodadas bloqueadas pelo OCI Generative AI (documentadas abaixo,
porque o percurso faz parte da evidência), o Select AI passou a responder de
verdade ao trocar o provedor de inferência para **Cohere**, mantendo todo o
resto igual: mesmo pacote `DBMS_CLOUD_AI`, mesmo perfil `LEITO360_AI`, mesmas
ações `chat` / `showsql` / `runsql`, mesmos objetos do LEITO360 no `object_list`.

**Ambiente:** LiveLabs Sandbox `MovieStreamWorkshop229748`, tenancy
`c4ustudent03`, usuário `ADMIN`, 01/09/2026.
**Provider:** `cohere` (Trial Key gratuita, `dashboard.cohere.com`).
**Endpoint alcançado:** `api.cohere.ai/v2/chat`.

### O passo que não está no LiveLabs 4222 e sem o qual nada funciona

Com provedor externo (Cohere), o Autonomous Database bloqueia a saída de rede
por padrão. A primeira chamada falhou com:

```
ORA-24247: Network access denied by access control list (ACL)
```

A correção é liberar o host na ACL de rede do banco — passo que o workshop
4222 não cobre (porque lá o provedor é o OCI, interno à própria tenancy):

```sql
BEGIN
  DBMS_NETWORK_ACL_ADMIN.APPEND_HOST_ACE(
    host => 'api.cohere.ai',
    ace  => xs$ace_type(
              privilege_list => xs$name_list('connect'),
              principal_name => 'ADMIN',
              principal_type => xs_acl.ptype_db)
  );
END;
/
```

Depois disso, a chamada passou a atravessar a rede e o erro mudou para
`ORA-20401: Authorization failed for URI - bearer://api.cohere.ai/v2/chat`
(chave colada com problema). Recriada a credencial com a chave copiada pelo
botão de cópia do painel do Cohere, a chamada passou a completar normalmente.

Sequência final que funciona, na ordem:

1. `DBMS_NETWORK_ACL_ADMIN.APPEND_HOST_ACE` para `api.cohere.ai`
2. `DBMS_CLOUD.CREATE_CREDENTIAL` (`COHERE_CRED`, username `COHERE`, password = chave de API)
3. `DBMS_CLOUD_AI.CREATE_PROFILE` (`LEITO360_AI`, provider `cohere`)
4. `DBMS_CLOUD_AI.GENERATE` com `chat` / `showsql` / `runsql`

Os scripts prontos estão em `oracle/sql/07_select_ai_profile.sql` (Opção B) e
`oracle/sql/08_select_ai_perguntas.sql`.

---

## Resultados reais capturados

### Teste de conectividade (`action => 'chat'`) — 4,1 s

Prompt: `o que é o LEITO360`

Resposta (início, transcrito da tela):

> O **LEITO360** é uma plataforma digital desenvolvida pelo Ministério da Saúde
> do Brasil, em parceria com o DATASUS (Departamento de Informática do SUS),
> para gerenciar e monitorar os leitos hospitalares disponíveis no Sistema Únic…

**Limitação importante e declarada:** essa resposta é uma **alucinação do
modelo**. O LEITO360 é o projeto acadêmico deste grupo — não é uma plataforma
do Ministério da Saúde. A ação `chat` é conversa livre com o LLM e **não
consulta os dados do banco**; ela serve apenas para provar que o canal de
inferência está vivo. As ações que efetivamente usam os dados do projeto são
`showsql` e `runsql`. Registramos essa alucinação de propósito, em vez de
escondê-la: ela demonstra por que a interface do dashboard identifica
explicitamente o que é e o que não é gerado por IA.

### Pergunta 1 — `action => 'showsql'` — 2,87 s

Prompt: *"Quais Unidades da Federação tiveram mais internações por 100 mil
habitantes em abril de 2026?"*

SQL gerado pelo modelo (transcrito da tela, sem edição):

```sql
SELECT vw."ESTADO", vw."SIGLA_UF"
FROM "ADMIN"."VW_LEITO360_ANALITICO" vw
WHERE vw."COMPETENCIA" = '2026-04'
ORDER BY vw."INTERNACOES_POR_100K_HAB" DESC
```

Leitura: o modelo escolheu sozinho a view analítica correta, filtrou a
competência certa (`2026-04`), e ordenou pelo indicador certo
(`INTERNACOES_POR_100K_HAB`, descendente). É NL2SQL real sobre o schema do
LEITO360 — nenhum SQL foi escrito à mão aqui.

### Pergunta 1 — `action => 'runsql'` — 1,75 s

Retorno (início, transcrito da tela):

```json
[ { "ESTADO" : "Rondônia", "SIGLA_UF" : "RO", "INTERNACOES_POR_100K_HAB" : 701.17 },
  { "ESTADO" : "Acre",     "SIGLA_UF" : "AC", "INTERNACOES_POR_100K_HAB" : 557.67 },
  { "ESTADO" : "Amazonas", "SIGLA_UF" : "AM", "INTERNAC… ]
```

**Duas observações críticas, registradas por rigor:**

1. **`SHOWSQL` e `RUNSQL` são chamadas independentes ao modelo.** O SQL que o
   `showsql` exibiu selecionava apenas `ESTADO` e `SIGLA_UF`; o `runsql`
   devolveu também `INTERNACOES_POR_100K_HAB`. Ou seja, o modelo gerou um SQL
   diferente em cada chamada — comportamento não determinístico esperado de um
   LLM. Para uma demonstração fiel, `showsql` e `runsql` devem ser lidos como
   duas execuções, não como "o SQL e o resultado dele".

2. **A ordenação do `runsql` não corresponde ao esperado.** As linhas voltaram
   em RO (11), AC (12), AM (13) — ordem de `codigo_uf`, não de
   `internacoes_por_100k_hab` decrescente. Pelo pipeline validado
   (`data/processed/leito360_consolidado.json`), o topo real de abr/2026 é
   **PR 703,74 · SC 702,27 · RO 701,17 · AP 686,83 · RS 664,58**. Portanto o
   SQL efetivamente executado pelo `runsql` provavelmente não trazia o
   `ORDER BY`. Os **valores** estão corretos (RO 701,17 confere exatamente com
   o ETL); a **ordem** não. Isso reforça a necessidade de conferir a saída do
   Select AI contra a fonte validada, em vez de aceitá-la sem verificação.

### Apresentação do resultado em formato de tabela

Para exibir o retorno do `runsql` como tabela relacional (em vez do JSON
compactado), a saída pode ser desmontada com `JSON_TABLE`:

```sql
SELECT jt.*
FROM (
    SELECT DBMS_CLOUD_AI.GENERATE(
        prompt       => 'Quais Unidades da Federação tiveram mais internações por 100 mil habitantes em abril de 2026?',
        profile_name => 'LEITO360_AI',
        action       => 'runsql') AS resultado
    FROM dual
) t,
JSON_TABLE(t.resultado, '$[*]'
    COLUMNS (
        estado                   VARCHAR2(60) PATH '$.ESTADO',
        sigla_uf                 VARCHAR2(2)  PATH '$.SIGLA_UF',
        internacoes_por_100k_hab NUMBER       PATH '$.INTERNACOES_POR_100K_HAB'
    )
) jt
ORDER BY internacoes_por_100k_hab DESC;
```

O `ORDER BY` externo também **corrige** o problema de ordenação apontado
acima, já que a ordenação passa a ser garantida pelo SQL do projeto e não
pelo SQL gerado pelo modelo.

### Perguntas 2 a 5 — `runsql` executado e conferido

Executadas no mesmo perfil. Abaixo, o retorno real transcrito da tela e a
**conferência contra o pipeline validado** (`data/processed/leito360_consolidado.json`).
O `showsql` dessas quatro não foi capturado — só os resultados —, então o SQL
que o modelo gerou em cada uma não pode ser afirmado aqui.

#### Pergunta 2 — ❌ **resposta incorreta** (o caso mais instrutivo)

*"Quais regiões possuem menor oferta de leitos SUS por 10 mil habitantes?"*

**`runsql`** (2,36 s):

```json
[ { "REGIAO" : "Nordeste" } ]
```

**`showsql`** (3,17 s) — SQL gerado, transcrito da tela (truncado no `ORDE…`):

```sql
SELECT "REGIAO" AS "REGIAO" FROM "ADMIN"."VW_LEITO360_ANALITICO"
GROUP BY "REGIAO"
HAVING AVG("LEITOS_SUS_POR_10K_HAB") < (
    SELECT AVG("LEITOS_SUS_POR_10K_HAB") FROM "ADMIN"."VW_LEITO360_ANALITICO"
) ORDE…
```

Comparando as duas saídas com o pipeline, aparecem **três problemas
sobrepostos**:

**1. O `runsql` não executou o SQL que o `showsql` mostrou.** Reproduzindo a
lógica do `showsql` sobre os dados do projeto, ela retornaria **Sudeste e
Centro-Oeste** — as duas regiões abaixo da média global de 16,06. O `runsql`
devolveu **Nordeste**, que não está nesse conjunto. É a demonstração mais
clara de que as duas ações são chamadas independentes ao modelo e produziram
SQL diferente; o SQL efetivamente executado provavelmente tinha a comparação
invertida (`>` em vez de `<`) ou ordenação decrescente.

**2. O SQL não filtra a competência.** Sem `WHERE competencia = …`, a média é
calculada sobre as 162 linhas (as seis competências juntas), e não sobre um
período. A pergunta não citava o mês, então isso é defensável — mas muda o
resultado e precisa ser percebido por quem lê.

**3. "Menor oferta" virou "abaixo da média".** O `HAVING AVG(...) < AVG global`
responde *quais regiões estão abaixo da média*, não *qual tem a menor oferta*.
São perguntas diferentes.

E, mesmo corrigindo tudo isso, a resposta entregue está **invertida**: o
Nordeste é a região de **maior** oferta, não a de menor.

| Região | Leitos SUS / 10 mil hab (agregado, abr/2026) | Média simples das UFs |
|---|---|---|
| Sudeste | **12,53** ← menor | 13,09 |
| Norte | 14,97 | 16,98 |
| Centro-Oeste | 15,39 | 15,33 |
| Sul | 16,25 | 16,07 |
| Nordeste | **17,15** ← maior | 16,94 |

Vale registrar ainda uma armadilha estatística que o SQL gerado comete e que
passaria despercebida sem conferência: `AVG` de um indicador *per capita* entre
UFs é uma **média de razões**, que não equivale à razão agregada da região
(leitos da região ÷ população da região). As duas colunas da tabela acima
mostram o tamanho da divergência — no Norte, 14,97 contra 16,98.

**Conclusão desta pergunta: a resposta não pode ser usada.**

#### Pergunta 3 — ✅ correta (na parte visível)

*"Quais Unidades da Federação possuem permanência média acima da média nacional em abril de 2026?"* (2,41 s)

```json
[ { "Unidade da Federação" : "RR" }, { "Unidade da Federação" : "TO" },
  { "Unidade da Federação" : "MA" }, { "Unidade da Federação" : "PI" },
  { "Unidade da Federação" : "CE" }, { "Unidade da Federação" : "PB" }, … ]
```

A média nacional ponderada pelas internações em abr/2026 é **4,882 dias**, e as
UFs acima dela são: **AL, CE, DF, MA, PB, PE, PI, RJ, RR, RS, SP, TO** (12 UFs;
a média simples das UFs, 4,922, produz exatamente o mesmo conjunto). As seis
visíveis no retorno pertencem todas a esse conjunto. O restante ficou truncado
na tela, então a lista completa não pôde ser conferida.

#### Pergunta 4 — ✅ correta

*"Quais UFs apresentaram maior aumento de internações entre março e abril de 2026?"* (4,35 s)

```json
[ { "SIGLA_UF" : "RS", "AUMENTO" : 1187 } ]
```

**Confere exatamente.** O RS teve o maior aumento absoluto: 1.187 internações
a mais (+1,62%). Vale notar que abril foi um mês de queda nacional
(1.256.010 → 1.218.903), e apenas **cinco UFs** cresceram: RS (+1.187),
MS (+506), AL (+261), AP (+143) e AM (+112). O modelo devolveu só a primeira
colocada, embora a pergunta esteja no plural.

#### Pergunta 5 — ✅ correta e exata

*"Compare internações e leitos SUS cadastrados por região em abril de 2026."* (2,09 s)

```json
[ { "REGIAO" : "Norte",    "TOTAL_INTERNACOES" : 108136, "TOTAL_LEITOS_SUS" : 28346 },
  { "REGIAO" : "Nordeste", "TOTAL_INTERNACOES" : 311866, "TOTAL_LEITOS_SUS" : 98381 },
  { "REGIAO" : "Sudeste",  "TOTAL_INTERNACOES" : 483748, … ]
```

Todos os valores conferem com o pipeline, número a número:

| Região | Internações | Leitos SUS |
|---|---|---|
| Norte | 108.136 | 28.346 |
| Nordeste | 311.866 | 98.381 |
| Sudeste | 483.748 | 111.532 |
| Sul | 217.146 | 51.197 |
| Centro-Oeste | 98.007 | 26.779 |

### Placar da conferência

| Pergunta | Resultado |
|---|---|
| 1 — pressão assistencial por UF | Valores corretos, **ordenação errada** |
| 2 — menor oferta de leitos por região | ❌ **Incorreta** (respondeu a região oposta) |
| 3 — permanência acima da média nacional | ✅ Correta na parte visível |
| 4 — maior aumento de internações | ✅ Correta (RS +1.187) |
| 5 — internações x leitos por região | ✅ Correta e exata |

**Leitura honesta:** o Select AI acertou 3 das 5 perguntas de forma
plenamente verificável, errou a ordenação em 1 e errou o conteúdo em 1. Ou
seja: é uma ferramenta útil de exploração, mas **não substitui a consulta
auditada** — toda saída precisa ser conferida contra a fonte validada antes de
virar informação para decisão. É exatamente por isso que o dashboard do
LEITO360 não usa o Select AI para gerar seus números: ele consome o JSON
determinístico do ETL e identifica o SQL exibido como *não gerado por IA*.

---

## Histórico das tentativas com OCI Generative AI (bloqueadas)

Mantido no repositório porque o diagnóstico é parte do trabalho: mostra que a
troca de provedor foi uma decisão fundamentada, não um chute.

### Rodada 1 — Sandbox #229599, tenancy `C4U04`, 31/08–01/09/2026

- **`OCI$RESOURCE_PRINCIPAL`, região `ap-osaka-1`:**
  `ORA-20404: Object not found - https://inference.generativeai.ap-osaka-1.oci.my$cloud_domain/20231130/actions/chat`
- **Mesma credencial, região `ap-hyderabad-1`:** mesmo erro, mesma URL malformada.
- **Descoberta:** `SELECT credential_name, username FROM user_credentials`
  revelou a credencial nativa `AI_CREDENTIAL`, que a Task 2 do Lab 1 do
  workshop manda localizar.
- **`AI_CREDENTIAL`:** `CREATE_PROFILE` executou sem erro (~1-2 s), mas todo
  `GENERATE` ficou pendente de 3 a 10 minutos e falhou sem corpo de erro
  recuperável — 4 tentativas, 2 worksheets, prompts diferentes.
- `SELECT 1 FROM dual` respondia em milissegundos no mesmo worksheet,
  confirmando que o banco estava saudável.

### Rodada 2 — Sandbox `MovieStreamWorkshop229748`, tenancy `c4ustudent03`, 01/09/2026

Reserva nova e independente. Schema LEITO360 recriado do zero (162 linhas SIH,
162 documentos CNES JSON, 27 linhas de população) e **reconciliado com o ETL
local**: o ranking de `internacoes_por_100k_hab` em abr/2026 voltou idêntico ao
`data/processed/leito360_consolidado.json` (PR 703,74 · SC 702,27 · RO 701,17 ·
AP 686,83 · RS 664,58 · DF 654,12 · MG 625,17 · ES 618,45).

Aqui `user_credentials` trazia apenas `OCI$RESOURCE_PRINCIPAL` — cada sandbox
provisiona credenciais diferentes. O `CREATE_PROFILE` completou em ~1 s, mas o
`GENERATE` falhou de forma **imediata e determinística** (3 s):

- Região `us-chicago-1`: `ORA-20404: … https://inference.generativeai.us-chicago-1.oci.my$cloud_domain/20231130/actions/chat`
- Região `us-phoenix-1`: `ORA-20404: … https://inference.generativeai.us-phoenix-1.oci.my$cloud_domain/20231130/actions/chat`

Também foram testados os profiles `GENAI` pré-provisionados pelo próprio
workshop (`MOVIESTREAM.GENAI` e `SELECT_AI_USER.GENAI`, existência confirmada
em `DBA_CLOUD_AI_PROFILES`), a partir do `ADMIN`:
`ORA-20000: Profile "<OWNER>"."GENAI" does not exist` — o `GENERATE` não
enxerga profile de outro schema sem autenticação como o dono, e o LiveLabs não
fornece senha desses usuários auxiliares.

### Conclusão do diagnóstico

O literal `my$cloud_domain` (variável de template do endpoint não substituída)
apareceu em **2 sandboxes**, **2 tenancies**, **3 regiões** e com **2
credenciais diferentes**. Isso descarta erro de configuração do LEITO360 ou de
sintaxe: é falha de provisionamento do lado da Oracle, específica dos ambientes
de sandbox de estudante do LiveLabs.

A resposta técnica foi trocar o provedor de inferência mantendo toda a
arquitetura Select AI intacta — o que confirma, na prática, que o
`DBMS_CLOUD_AI` isola bem a aplicação do provedor de LLM.

---

## Configuração do perfil (sem expor credenciais)

- **Provider:** `cohere`
- **Credencial:** `COHERE_CRED` (chave de API pessoal, criada no banco via
  `DBMS_CLOUD.CREATE_CREDENTIAL`; **nunca versionada neste repositório**)
- **ACL de rede:** `api.cohere.ai` liberado para o principal `ADMIN`
- **`object_list`:** `ADMIN.LEITO360_SIH`, `ADMIN.LEITO360_CNES_JSON`,
  `ADMIN.LEITO360_POPULACAO`, `ADMIN.VW_LEITO360_ANALITICO`
- **`comments`:** `true` — os comentários de tabela/coluna dos scripts `01`,
  `02` e `05` são enviados ao modelo como contexto semântico, o que explica a
  escolha correta da view e da coluna do indicador na Pergunta 1.
