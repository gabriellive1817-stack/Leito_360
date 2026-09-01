-- =============================================================================
-- LEITO360 — Perfil do Select AI
-- Padrão extraído literalmente do LiveLabs 4222 ("Chat with Your Data in
-- Autonomous AI Database Using Select AI", lab "Integrate GenAI models with
-- Autonomous AI Database", Task 2, provider OCI Generative AI — default).
-- Único ajuste feito: profile_name e object_list, restritos aos objetos do
-- LEITO360 (o workshop original usa profile_name 'genai' e o schema
-- MOVIESTREAM). Região: troque 'us-chicago-1' pela região da sua tenancy com
-- OCI Generative AI habilitado (ex.: 'sa-saopaulo-1' para Brasil-Leste, se
-- disponível) — ver lista de regiões no README.
-- =============================================================================

BEGIN
    -- Remove o profile caso já exista, para permitir reexecução idempotente.
    DBMS_CLOUD_AI.DROP_PROFILE(
        profile_name => 'LEITO360_AI',
        force        => TRUE
    );

    DBMS_CLOUD_AI.CREATE_PROFILE(
        profile_name => 'LEITO360_AI',
        attributes   =>
            '{"provider": "oci",
              "credential_name": "OCI$RESOURCE_PRINCIPAL",
              "region": "us-chicago-1",
              "comments": "true",
              "object_list": [
                  {"owner": "<SCHEMA_LEITO360>", "name": "LEITO360_SIH"},
                  {"owner": "<SCHEMA_LEITO360>", "name": "LEITO360_CNES_JSON"},
                  {"owner": "<SCHEMA_LEITO360>", "name": "LEITO360_POPULACAO_EXT"},
                  {"owner": "<SCHEMA_LEITO360>", "name": "VW_LEITO360_ANALITICO"}
              ]
             }'
    );
END;
/

-- Substitua <SCHEMA_LEITO360> pelo nome do schema/usuário onde os objetos
-- foram criados (ex.: ADMIN, ou um usuário dedicado como MOVIESTREAM no
-- workshop original) antes de executar.

-- Teste básico do profile (idêntico ao Task 3 do LiveLabs 4222):
SELECT DBMS_CLOUD_AI.GENERATE(
    prompt       => 'o que é o LEITO360',
    profile_name => 'LEITO360_AI',
    action       => 'chat')
FROM dual;
