# Decisão de arquitetura — uso do LiveLabs 4222

## Contexto

O enunciado do Challenge exige que "todo o fluxo Oracle siga exatamente o
workshop oficial LiveLabs 4222" (*Chat with Your Data in Autonomous AI
Database Using Select AI*). Antes de escrever qualquer script Oracle, o
conteúdo completo do workshop foi acessado e lido (introdução + 5 labs,
incluindo o texto integral da Task 2 do Lab 2).

## O que o LiveLabs 4222 realmente cobre

- **Lab 1 — Set up Your Workshop Environment:** provisiona a Autonomous AI
  Database via um *stack Terraform* da Oracle que já cria o schema
  `MOVIESTREAM` (dados fictícios de streaming de filmes) pronto para uso.
  Não há passo manual de `CREATE TABLE`, JSON ou external table.
- **Lab 2 — Integrate GenAI models:** cria o profile do Select AI. Texto
  literal extraído (provider OCI Generative AI, opção default):

  ```sql
  begin
  dbms_cloud_ai.drop_profile(profile_name => 'genai', force => true);
  dbms_cloud_ai.create_profile(
      profile_name => 'genai',
      attributes =>
      '{"provider": "oci",
        "credential_name": "OCI$RESOURCE_PRINCIPAL",
        "region": "us-chicago-1",
        "comments":"true",
        "object_list": [
            {"owner": "MOVIESTREAM", "name": "GENRE"},
            {"owner": "MOVIESTREAM", "name": "CUSTOMER"},
            {"owner": "MOVIESTREAM", "name": "PIZZA_SHOP"},
            {"owner": "MOVIESTREAM", "name": "STREAMS"},
            {"owner": "MOVIESTREAM", "name": "MOVIES"},
            {"owner": "MOVIESTREAM", "name": "ACTORS"}
        ]}'
  );
  end;
  /
  ```

  Teste: `DBMS_CLOUD_AI.GENERATE(prompt => '...', profile_name => 'genai', action => 'chat')`.
- **Lab 3 — Use Natural Language Queries with Select AI:** usa um notebook
  OML já pronto para explorar `SHOWSQL`/`RUNSQL`/`NARRATE` sobre o schema
  MOVIESTREAM.
- **Lab 4 — Use the Select AI Demo Application:** app APEX de demonstração
  pronto, com voz.
- **Lab 5 — Clean up:** destrói o stack/instância.

## O que o LiveLabs 4222 **não** cobre

Criação de tabela relacional, coluna/coleção JSON nativa ou external table
a partir de CSV/JSON próprios — porque o workshop inteiro parte de um
schema já carregado por infraestrutura como código. Isso é incompatível
com o requisito do LEITO360 de ingerir SIH/SUS (relacional), CNES (JSON) e
IBGE (CSV externo) a partir de arquivos próprios do grupo.

## Decisão

1. **Select AI (perfil, ações, teste):** seguir o LiveLabs 4222 literalmente
   — mesmo provider (`oci`), mesma credencial (`OCI$RESOURCE_PRINCIPAL`),
   mesma sintaxe de `CREATE_PROFILE`/`GENERATE`. Único ajuste: nome do
   profile (`LEITO360_AI` em vez de `genai`) e `object_list` apontando para
   os objetos do LEITO360 em vez do schema MOVIESTREAM. Ver
   `oracle/sql/07_select_ai_profile.sql`.
2. **DDL relacional, JSON, external table, view, carga, validações:** usar a
   documentação oficial do Oracle Autonomous AI Database 23ai (não o
   LiveLabs 4222, que não trata desse tópico). Ver `oracle/sql/01` a `06`.
3. Essa decisão foi registrada e aprovada em conversa com o representante do
   grupo (Gabriel Silva de Jesus) antes da implementação, conforme instrução
   do enunciado de não inventar comandos sem confirmação quando o LiveLabs
   não cobrir o cenário.
