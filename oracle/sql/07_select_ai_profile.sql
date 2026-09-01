-- =============================================================================
-- LEITO360 — Perfil do Select AI
--
-- Duas opções abaixo, dependendo de qual provedor de IA está disponível no
-- seu ambiente. Rode APENAS UMA das duas (comente/apague a outra).
-- =============================================================================


-- =============================================================================
-- OPÇÃO A — OCI Generative AI
-- Padrão extraído literalmente do LiveLabs 4222 ("Chat with Your Data in
-- Autonomous AI Database Using Select AI", lab "Integrate GenAI models with
-- Autonomous AI Database", Task 2, provider OCI Generative AI — default).
-- Único ajuste feito: profile_name e object_list, restritos aos objetos do
-- LEITO360 (o workshop original usa profile_name 'genai' e o schema
-- MOVIESTREAM). Região: troque 'us-chicago-1' pela região da sua tenancy com
-- OCI Generative AI habilitado (ex.: 'sa-saopaulo-1' para Brasil-Leste, se
-- disponível) — ver lista de regiões no README.
-- Use esta opção se sua tenancy tem OCI Generative AI habilitado e você não
-- depende de uma chave de API externa.
-- =============================================================================

BEGIN
    DBMS_CLOUD_AI.DROP_PROFILE(profile_name => 'LEITO360_AI', force => TRUE);

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


-- =============================================================================
-- OPÇÃO B — Cohere
-- Padrão conforme demonstrado na aula do Challenge (professor Milton Goya,
-- provedor Cohere — dashboard.cohere.com) e a sintaxe geral documentada pela
-- Oracle para DBMS_CLOUD_AI com provedores de terceiros via chave de API
-- (DBMS_CLOUD.CREATE_CREDENTIAL + CREATE_PROFILE). ATENÇÃO: este provedor NÃO
-- está coberto pelo LiveLabs 4222 (que só cobre OCI/OpenAI/Azure/Google
-- Gemini) — confirme com o professor/tutor se o nome do provider e o formato
-- do model_name abaixo são exatamente os usados em aula antes de rodar.
-- Use esta opção se sua tenancy OCI existe mas não tem OCI Generative AI
-- habilitado, e você já tem uma chave de API gratuita do Cohere
-- (dashboard.cohere.com → API Keys).
-- =============================================================================

-- Passo 1 — credencial com a chave de API do Cohere (rodar uma única vez):
BEGIN
    DBMS_CLOUD.CREATE_CREDENTIAL(
        credential_name => 'COHERE_CRED',
        username        => 'COHERE',
        password        => '<SUA_CHAVE_DE_API_DO_COHERE>'
    );
END;
/

-- Passo 2 — perfil do Select AI usando essa credencial:
BEGIN
    DBMS_CLOUD_AI.DROP_PROFILE(profile_name => 'LEITO360_AI', force => TRUE);

    DBMS_CLOUD_AI.CREATE_PROFILE(
        profile_name => 'LEITO360_AI',
        attributes   =>
            '{"provider": "cohere",
              "credential_name": "COHERE_CRED",
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

-- Em ambas as opções: substitua <SCHEMA_LEITO360> pelo nome do schema/usuário
-- onde os objetos foram criados (ex.: ADMIN). Nunca commitar a chave de API
-- real do Cohere no repositório — ela fica só na credencial dentro do banco.

-- Teste básico do profile (idêntico ao Task 3 do LiveLabs 4222):
SELECT DBMS_CLOUD_AI.GENERATE(
    prompt       => 'o que é o LEITO360',
    profile_name => 'LEITO360_AI',
    action       => 'chat')
FROM dual;
