-- =============================================================================
-- LEITO360 — Perfil do Select AI
--
-- RESULTADO REAL: a OPÇÃO B (Cohere) é a que FUNCIONA e foi usada na
-- demonstração. As opções A e C (OCI Generative AI) foram testadas em dois
-- sandboxes do LiveLabs, três regiões e duas credenciais diferentes, e em
-- todas o serviço devolveu ORA-20404 com uma URL malformada contendo o literal
-- "my$cloud_domain" — bug de provisionamento do lado da Oracle nesses
-- ambientes de sandbox. Diagnóstico completo:
-- docs/evidencias/select_ai_perguntas.md
--
-- Rode APENAS UMA das opções.
-- =============================================================================


-- =============================================================================
-- OPÇÃO B — Cohere  ✅ FUNCIONANDO (usada na demonstração)
--
-- Provedor demonstrado na aula do Challenge (professor Milton Goya,
-- dashboard.cohere.com), com a sintaxe geral documentada pela Oracle para
-- DBMS_CLOUD_AI com provedores de terceiros via chave de API. NÃO está coberto
-- pelo LiveLabs 4222 — o workshop só trata do provider OCI.
--
-- Confirmado em 01/09/2026, LiveLabs sandbox MovieStreamWorkshop229748,
-- tenancy c4ustudent03, usuário ADMIN. Tempo de resposta: 1,7 a 4,1 s.
-- =============================================================================

-- Passo 1 — LIBERAR A SAÍDA DE REDE PARA O HOST DO COHERE.
-- Sem isso, todo GENERATE falha com:
--   ORA-24247: Network access denied by access control list (ACL)
-- Este passo NÃO existe no LiveLabs 4222 (lá o provedor é interno à tenancy).
BEGIN
  DBMS_NETWORK_ACL_ADMIN.APPEND_HOST_ACE(
    host => 'api.cohere.ai',
    ace  => xs$ace_type(
              privilege_list => xs$name_list('connect'),
              principal_name => 'ADMIN',          -- troque se usar outro schema
              principal_type => xs_acl.ptype_db)
  );
EXCEPTION
  WHEN OTHERS THEN NULL;   -- já liberado numa execução anterior: segue o jogo
END;
/

-- Passo 2 — credencial com a chave de API do Cohere.
-- A chave é pessoal e NUNCA deve ser versionada. Copie-a pelo botão de cópia
-- do painel (dashboard.cohere.com > API Keys) para não arrastar espaços — uma
-- chave colada com sujeira produz:
--   ORA-20401: Authorization failed for URI - bearer://api.cohere.ai/v2/chat
BEGIN
    DBMS_CLOUD.DROP_CREDENTIAL('COHERE_CRED');
EXCEPTION
  WHEN OTHERS THEN NULL;   -- não existia ainda
END;
/

BEGIN
    DBMS_CLOUD.CREATE_CREDENTIAL(
        credential_name => 'COHERE_CRED',
        username        => 'COHERE',                        -- rótulo, não é login
        password        => '<SUA_CHAVE_DE_API_DO_COHERE>'   -- nunca commitar
    );
END;
/

-- Passo 3 — perfil do Select AI restrito aos objetos do LEITO360.
-- "comments": "true" envia ao modelo os COMMENT ON TABLE/COLUMN definidos em
-- 01_ddl_sih.sql, 02_ddl_cnes_json.sql e 05_view_analitica.sql como contexto
-- semântico — é o que faz o modelo escolher a view e a coluna certas sozinho.
BEGIN
    DBMS_CLOUD_AI.DROP_PROFILE(profile_name => 'LEITO360_AI', force => TRUE);

    DBMS_CLOUD_AI.CREATE_PROFILE(
        profile_name => 'LEITO360_AI',
        attributes   =>
            '{"provider": "cohere",
              "credential_name": "COHERE_CRED",
              "comments": "true",
              "object_list": [
                  {"owner": "ADMIN", "name": "LEITO360_SIH"},
                  {"owner": "ADMIN", "name": "LEITO360_CNES_JSON"},
                  {"owner": "ADMIN", "name": "LEITO360_POPULACAO"},
                  {"owner": "ADMIN", "name": "VW_LEITO360_ANALITICO"}
              ]
             }'
    );
END;
/

-- Passo 4 — teste de conectividade (equivalente ao Task 3 do LiveLabs 4222).
-- ATENÇÃO: a ação 'chat' é conversa livre com o LLM e NÃO consulta o banco —
-- na execução real ela alucinou, descrevendo o LEITO360 como uma plataforma do
-- Ministério da Saúde. Serve só para provar que o canal de inferência responde.
-- As ações que realmente usam os dados são 'showsql' e 'runsql' (script 08).
SELECT DBMS_CLOUD_AI.GENERATE(
    prompt       => 'o que é o LEITO360',
    profile_name => 'LEITO360_AI',
    action       => 'chat')
FROM dual;


-- =============================================================================
-- OPÇÃO A — OCI Generative AI  ❌ BLOQUEADA nos sandboxes testados
-- Padrão extraído literalmente do LiveLabs 4222 ("Chat with Your Data in
-- Autonomous AI Database Using Select AI", Lab 2, Task 2, provider default).
-- Único ajuste: profile_name e object_list (o workshop usa 'genai' sobre o
-- schema MOVIESTREAM).
--
-- Resultado real, reproduzido em us-chicago-1, us-phoenix-1, ap-osaka-1 e
-- ap-hyderabad-1:
--   ORA-20404: Object not found -
--   https://inference.generativeai.<REGIAO>.oci.my$cloud_domain/20231130/actions/chat
-- O literal "my$cloud_domain" é uma variável de template não substituída pela
-- infraestrutura do sandbox. Mantida aqui por fidelidade ao workshop e porque
-- deve funcionar numa tenancy OCI com Generative AI corretamente habilitado.
-- =============================================================================

-- BEGIN
--     DBMS_CLOUD_AI.DROP_PROFILE(profile_name => 'LEITO360_AI', force => TRUE);
--
--     DBMS_CLOUD_AI.CREATE_PROFILE(
--         profile_name => 'LEITO360_AI',
--         attributes   =>
--             '{"provider": "oci",
--               "credential_name": "OCI$RESOURCE_PRINCIPAL",
--               "region": "us-chicago-1",
--               "comments": "true",
--               "object_list": [
--                   {"owner": "ADMIN", "name": "LEITO360_SIH"},
--                   {"owner": "ADMIN", "name": "LEITO360_CNES_JSON"},
--                   {"owner": "ADMIN", "name": "LEITO360_POPULACAO"},
--                   {"owner": "ADMIN", "name": "VW_LEITO360_ANALITICO"}
--               ]
--              }'
--     );
-- END;
-- /


-- =============================================================================
-- OPÇÃO C — credencial nativa AI_CREDENTIAL  ❌ BLOQUEADA (timeout)
-- Credencial que a Task 2 do Lab 1 do LiveLabs 4222 manda localizar com
--   SELECT credential_name, username FROM user_credentials;
-- Existe em alguns sandboxes e não em outros. Onde existia, o CREATE_PROFILE
-- completou sem erro, mas todo GENERATE ficou pendente de 3 a 10 minutos e
-- falhou sem corpo de erro recuperável.
-- =============================================================================

-- BEGIN
--     DBMS_CLOUD_AI.DROP_PROFILE(profile_name => 'LEITO360_AI', force => TRUE);
--
--     DBMS_CLOUD_AI.CREATE_PROFILE(
--         profile_name => 'LEITO360_AI',
--         attributes   =>
--             '{"provider": "oci",
--               "credential_name": "AI_CREDENTIAL",
--               "comments": "true",
--               "object_list": [
--                   {"owner": "ADMIN", "name": "LEITO360_SIH"},
--                   {"owner": "ADMIN", "name": "LEITO360_CNES_JSON"},
--                   {"owner": "ADMIN", "name": "LEITO360_POPULACAO"},
--                   {"owner": "ADMIN", "name": "VW_LEITO360_ANALITICO"}
--               ]
--              }'
--     );
-- END;
-- /

-- Em todas as opções: substitua ADMIN pelo schema onde os objetos do LEITO360
-- foram criados, se for diferente. Nunca commitar chaves de API reais.
