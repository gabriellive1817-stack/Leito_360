-- =============================================================================
-- LEITO360 — Perfil do Select AI
--
-- Três opções abaixo, dependendo de qual provedor de IA está disponível no
-- seu ambiente. Rode APENAS UMA (comente/apague as outras).
--
-- RESULTADO REAL (LiveLabs sandbox #229599, 31/08-01/09/2026): a OPÇÃO C foi
-- a única que criou o profile sem erro (a Opção A deu ORA-20404 nesse
-- sandbox — ver docs/evidencias/select_ai_perguntas.md para o diagnóstico
-- completo). Ainda assim, as chamadas de DBMS_CLOUD_AI.GENERATE ficaram
-- pendentes e falharam por timeout — indisponibilidade do serviço OCI
-- Generative AI nesse ambiente específico, não um erro deste script.
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

-- =============================================================================
-- OPÇÃO C — Credencial nativa do LiveLabs (AI_CREDENTIAL)
-- Padrão que REALMENTE funcionou (criação do profile sem erro) na sessão de
-- 31/08-01/09/2026, no sandbox #229599. É a credencial que a própria Task 2
-- do Lab 1 do LiveLabs 4222 pede para localizar com
-- "SELECT credential_name, username FROM user_credentials" antes de montar
-- o profile — não é OCI$RESOURCE_PRINCIPAL nem uma credencial nova.
-- Use esta opção se, ao consultar user_credentials no seu ambiente, já
-- existir uma linha chamada AI_CREDENTIAL (ou nome equivalente).
-- =============================================================================

-- Passo 0 — confirme que a credencial existe no seu ambiente:
-- SELECT credential_name, username, comments FROM user_credentials;

BEGIN
    DBMS_CLOUD_AI.DROP_PROFILE(profile_name => 'LEITO360_AI', force => TRUE);

    DBMS_CLOUD_AI.CREATE_PROFILE(
        profile_name => 'LEITO360_AI',
        attributes   =>
            '{"provider": "oci",
              "credential_name": "AI_CREDENTIAL",
              "comments": "true",
              "object_list": [
                  {"owner": "<SCHEMA_LEITO360>", "name": "LEITO360_SIH"},
                  {"owner": "<SCHEMA_LEITO360>", "name": "LEITO360_CNES_JSON"},
                  {"owner": "<SCHEMA_LEITO360>", "name": "LEITO360_POPULACAO"},
                  {"owner": "<SCHEMA_LEITO360>", "name": "VW_LEITO360_ANALITICO"}
              ]
             }'
    );
END;
/

-- Em todas as opções: substitua <SCHEMA_LEITO360> pelo nome do schema/usuário
-- onde os objetos foram criados (ex.: ADMIN, ou MOVIESTREAM no ambiente do
-- workshop). Nunca commitar chaves de API reais no repositório.

-- Teste básico do profile (idêntico ao Task 3 do LiveLabs 4222):
SELECT DBMS_CLOUD_AI.GENERATE(
    prompt       => 'o que é o LEITO360',
    profile_name => 'LEITO360_AI',
    action       => 'chat')
FROM dual;
