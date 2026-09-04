/*
===============================================================================
Script: Clear Tables and Views
===============================================================================
Script Purpose:
    Drops every table and view in the bronze, silver and gold schemas.
    Views are dropped first (silver/gold views read from bronze/silver
    tables), then tables, in gold -> silver -> bronze order.
    Driven off sys.tables/sys.views, so a new table or view added by any
    pipeline YAML is dropped automatically, no per-table edits needed here.
===============================================================================
*/

DECLARE @schemas TABLE (name NVARCHAR(128), rnk INT);
INSERT INTO @schemas (name, rnk) VALUES ('gold', 0), ('silver', 1), ('bronze', 2);

DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql = @sql + N'DROP VIEW ' + QUOTENAME(s.name) + N'.' + QUOTENAME(v.name) + N';' + CHAR(13)
FROM sys.views v
JOIN sys.schemas s ON s.schema_id = v.schema_id
JOIN @schemas ps ON ps.name = s.name
ORDER BY ps.rnk, v.name;

EXEC sp_executesql @sql;

SET @sql = N'';

SELECT @sql = @sql + N'DROP TABLE ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) + N';' + CHAR(13)
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
JOIN @schemas ps ON ps.name = s.name
ORDER BY ps.rnk, t.name;

EXEC sp_executesql @sql;
