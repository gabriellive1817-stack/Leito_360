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

### Perguntas 2 a 5

Prontas e executadas na sessão de gravação, com os mesmos comandos de
`oracle/sql/08_select_ai_perguntas.sql`:

2. "Quais regiões possuem menor oferta de leitos SUS por 10 mil habitantes?"
3. "Quais Unidades da Federação possuem permanência média acima da média nacional em abril de 2026?"
4. "Quais UFs apresentaram maior aumento de internações entre março e abril de 2026?"
5. "Compare internações e leitos SUS cadastrados por região em abril de 2026."

**Transcrição pendente:** o SQL gerado e o resultado de cada uma ficaram
registrados no vídeo da gravação, mas ainda não foram transcritos para este
arquivo. Como regra do projeto, nada é preenchido aqui sem a saída real
copiada da tela — quem gravou deve colar as saídas nos espaços abaixo.

```
-- Pergunta 2 — SHOWSQL:
-- Pergunta 2 — RUNSQL:

-- Pergunta 3 — SHOWSQL:
-- Pergunta 3 — RUNSQL:

-- Pergunta 4 — SHOWSQL:
-- Pergunta 4 — RUNSQL:

-- Pergunta 5 — SHOWSQL:
-- Pergunta 5 — RUNSQL:
```

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
