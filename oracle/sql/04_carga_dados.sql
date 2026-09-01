-- =============================================================================
-- LEITO360 — Scripts/roteiro de carga dos 3 formatos
-- =============================================================================
-- Existem duas formas equivalentes de carregar LEITO360_SIH e
-- LEITO360_CNES_JSON no Autonomous AI Database. Escolha UMA delas — não é
-- preciso rodar as duas.
--
-- CAMINHO A (recomendado para quem não tem bucket de Object Storage
-- configurado): Database Actions > Data Load > arrastar o arquivo local.
--   1. Abra Database Actions (SQL) como usuário MOVIESTREAM/schema do
--      projeto > menu de navegação > Data Load.
--   2. Selecione "Load Data" > arraste oracle/data/sih_internacoes.csv >
--      escolha a tabela existente LEITO360_SIH (já criada pelo script 01) >
--      confirme o mapeamento de colunas (idêntico ao cabeçalho do CSV) > Run.
--   3. Repita para oracle/data/cnes_leitos.json, mapeando cada objeto do
--      array JSON para a coluna DOC da tabela LEITO360_CNES_JSON (já criada
--      pelo script 02). O assistente de Data Load do Database Actions
--      reconhece arquivos .json e insere cada elemento do array como um
--      documento.
--   4. Rode as validações do script 06_validacoes.sql em seguida.
--
-- CAMINHO B (para quem já tem bucket + credencial de Object Storage
-- configurados, necessário de qualquer forma para a external table do
-- script 03): usar DBMS_CLOUD.COPY_DATA / DBMS_CLOUD.COPY_COLLECTION.
-- Substitua os placeholders antes de executar; não commitar valores reais.
-- =============================================================================

-- --- CAMINHO B — SIH relacional -------------------------------------------
BEGIN
    DBMS_CLOUD.COPY_DATA(
        table_name      => 'LEITO360_SIH',
        credential_name => '<CREDENTIAL_NAME>',
        file_uri_list   => '<URI_DO_ARQUIVO_NO_OBJECT_STORAGE>/sih_internacoes.csv',
        format          => JSON_OBJECT('type' VALUE 'CSV', 'skipheaders' VALUE '1',
                                        'characterset' VALUE 'AL32UTF8')
    );
END;
/

-- --- CAMINHO B — CNES JSON (coleção) ---------------------------------------
-- Pré-requisito: LEITO360_CNES_JSON precisa existir como SODA collection
-- compatível, ou usar carga documento a documento via APEX_JSON / import de
-- arquivo. Alternativa simples testada localmente com o array de 162
-- documentos gerado pelo ETL (oracle/data/cnes_leitos.json):
--
--   1. Faça upload do arquivo para o Object Storage.
--   2. Use DBMS_CLOUD.GET_OBJECT + JSON_TABLE para inserir cada elemento do
--      array como uma linha:
DECLARE
    v_blob BLOB;
    v_clob CLOB;
BEGIN
    v_blob := DBMS_CLOUD.GET_OBJECT(
        credential_name => '<CREDENTIAL_NAME>',
        object_uri      => '<URI_DO_ARQUIVO_NO_OBJECT_STORAGE>/cnes_leitos.json'
    );
    v_clob := DBMS_LOB.SUBSTR(v_blob, DBMS_LOB.GETLENGTH(v_blob), 1); -- ajustar p/ arquivos grandes
    INSERT INTO LEITO360_CNES_JSON (doc)
    SELECT JSON_QUERY(v_clob, '$[' || TO_CHAR(rn) || ']' RETURNING JSON)
    FROM (SELECT LEVEL - 1 AS rn FROM dual CONNECT BY LEVEL <= 162);
END;
/

-- --- Ambos os caminhos — External Table IBGE --------------------------------
-- Já criada e populada automaticamente pela leitura do CSV no script 03
-- (external table não requer carga: os dados são lidos sob demanda direto
-- do Object Storage a cada consulta).
