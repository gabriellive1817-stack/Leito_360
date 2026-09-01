-- =============================================================================
-- LEITO360 — External Table: LEITO360_POPULACAO_EXT (CSV via Object Storage)
-- Fonte: IBGE/SIDRA — tabela 6579, população estimada por UF (2026).
--
-- ATENÇÃO — PREENCHER ANTES DE EXECUTAR:
--   1. Faça upload de oracle/data/ibge_populacao.csv para um bucket do seu
--      Object Storage (OCI) na conta/tenancy acadêmica.
--   2. Substitua <CREDENTIAL_NAME> e <URI_DO_ARQUIVO_NO_OBJECT_STORAGE> pelos
--      valores reais do seu ambiente. NUNCA commitar esses valores reais no
--      repositório — mantenha apenas os placeholders abaixo no Git.
--   3. A credencial (DBMS_CLOUD.CREATE_CREDENTIAL) deve ser criada uma única
--      vez com um Auth Token/API key do próprio usuário — não incluída aqui.
--
-- Este script segue a documentação oficial do Oracle Autonomous AI Database
-- (DBMS_CLOUD.CREATE_EXTERNAL_TABLE) — o LiveLabs 4222 não cobre este
-- mecanismo (ver nota em oracle/sql/01_ddl_sih.sql).
-- =============================================================================

BEGIN
    DBMS_CLOUD.CREATE_EXTERNAL_TABLE(
        table_name      => 'LEITO360_POPULACAO_EXT',
        credential_name => '<CREDENTIAL_NAME>',
        file_uri_list   => '<URI_DO_ARQUIVO_NO_OBJECT_STORAGE>/ibge_populacao.csv',
        format          => JSON_OBJECT(
                                'type'       VALUE 'CSV',
                                'skipheaders' VALUE '1',
                                'dateformat' VALUE 'YYYY-MM-DD',
                                'ignoremissingcolumns' VALUE 'true',
                                'rejectlimit' VALUE '0',
                                'characterset' VALUE 'AL32UTF8'
                            ),
        column_list     => 'ano_referencia NUMBER(4),
                             codigo_uf      VARCHAR2(2),
                             sigla_uf       VARCHAR2(2),
                             estado         VARCHAR2(60),
                             regiao         VARCHAR2(20),
                             populacao      NUMBER(12)'
    );
END;
/

COMMENT ON TABLE LEITO360_POPULACAO_EXT IS
    'LEITO360: população estimada por UF (ano de referência 2026), lida '
    'diretamente do CSV oracle/data/ibge_populacao.csv via external table '
    '(DBMS_CLOUD.CREATE_EXTERNAL_TABLE). Fonte: IBGE/SIDRA, tabela 6579.';

-- Validação rápida após a criação:
-- SELECT COUNT(*) FROM LEITO360_POPULACAO_EXT;              -- esperado: 27
-- SELECT SUM(populacao) FROM LEITO360_POPULACAO_EXT;        -- reconciliar com data/processed
