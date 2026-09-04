
IF NOT EXISTS (
    SELECT 1
    FROM sys.symmetric_keys
    WHERE name = '##MS_DatabaseMasterKey##'
)
BEGIN
    CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'ClaudeCodeMasterKey123!';
END;
GO

OPEN MASTER KEY DECRYPTION BY PASSWORD = 'ClaudeCodeMasterKey123!';
GO

CREATE DATABASE SCOPED CREDENTIAL BlobReadCred
WITH
    IDENTITY = 'SHARED ACCESS SIGNATURE',
    SECRET = 'sv=2026-02-06&ss=bfqt&srt=co&sp=rwdlacupiytfx&se=2026-09-30T20:01:15Z&st=2026-08-30T11:46:15Z&spr=https&sig=81ZO0xAXCWBb9x1LA9wb0ffPuK7q5z1yo3wHKB0b6CE%3D';
GO

CREATE EXTERNAL DATA SOURCE AzureBlobStorageDataSource
WITH
(
    TYPE = BLOB_STORAGE,
    LOCATION = 'https://claudedataarchstrg.blob.core.windows.net/datasets',
    CREDENTIAL = BlobReadCred
);
GO

SELECT * FROM sys.external_data_sources;
SELECT * FROM sys.database_scoped_credentials;
GO