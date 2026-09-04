# Plan: Bronze -> Silver YAML Definitions

Scope: customer, sales, and marketing-campaign Bronze datasets (product tables
`bronze.crm_prd_info` and `bronze.erp_px_cat_g1v2` are out of scope, per the
prompt's explicit dataset list). This produces one `template.yaml` plus five
per-table YAML files in `workshop2/pipeline/yaml/`. **Plan only — do not
implement.**

## Profiling method

Connected to Azure SQL using `sqlconection` from `workshop2/.env` (via the
existing `dq_lib.buildConfig()` helper) and queried each Bronze table
directly: `INFORMATION_SCHEMA.COLUMNS`, row counts, null/distinct counts per
column, small-cardinality value distributions, duplicate-key groups, and
targeted checks (date validity, referential integrity, sales-math
consistency). All rules below come from those query results, not
assumptions. Scratch profiling scripts were deleted after use.

## Tables in scope and target files

| Bronze table                  | Rows   | Target file                              | Silver table                  |
|--------------------------------|--------|-------------------------------------------|--------------------------------|
| `bronze.crm_cust_info`         | 18,493 | `pipeline/yaml/crm_cust_info.yaml`         | `silver.crm_cust_info`         |
| `bronze.erp_cust_az12`         | 18,483 | `pipeline/yaml/erp_cust_az12.yaml`         | `silver.erp_cust_az12`         |
| `bronze.erp_loc_a101`          | 18,484 | `pipeline/yaml/erp_loc_a101.yaml`          | `silver.erp_loc_a101`          |
| `bronze.crm_sales_details`     | 60,398 | `pipeline/yaml/crm_sales_details.yaml`     | `silver.crm_sales_details`     |
| `bronze.mkt_campaign_events`   | 0 (empty) | `pipeline/yaml/mkt_campaign_events.yaml` | `silver.mkt_campaign_events`   |

`mkt_campaign_events` is currently empty — the Kafka consumer copy step
(workshop2 part 3, step 9) runs after this task. Its YAML is schema-derived
only (from the DDL and the dedup contract documented in `ddl_bronze.sql`
comments), not data-derived. This is called out again in its section below;
do not add extra checks for it beyond what the schema itself justifies.

## SQL convention across all 5 files

To fit the runner's model (`transform_sql` then `load_sql` executed in order,
per `create_pipeline.md`):
- **`transform_sql`** = idempotent DDL: `DROP TABLE IF EXISTS silver.X` +
  `CREATE TABLE silver.X (...)`, defining the cleaned/typed Silver shape.
- **`load_sql`** = `TRUNCATE TABLE silver.X` + `INSERT INTO silver.X (...)
  SELECT <cleaning/mapping logic> FROM bronze.X`.
- Batches are separated with `GO` (the existing `ddl_bronze.sql` /
  `loadbronze.sql` convention; the (not-yet-built) runner is expected to
  split on `GO`).
- Every Silver table gets one added column, `dwh_create_date DATETIME2(3)
  NOT NULL DEFAULT SYSUTCDATETIME()`, matching the load-metadata convention
  already used on `bronze.mkt_campaign_events.dwh_load_date`. This is a
  pipeline/lineage convention, not a business column — flagging it
  explicitly since it isn't literally present in Bronze.
- `checks[].sql` must return a single scalar (row 1, col 1); the runner
  compares it against `expected` as a string. All check SQL below follows
  that shape.

## template.yaml

Create at `workshop2/pipeline/yaml/template.yaml` with exactly the structure
given in the prompt (empty `source`/`target` so the runner skips it):

```yaml
table:
  source: ""
  target: ""
  description: ""

transform_sql: |
  # Bronze -> Silver transformation SQL

load_sql: |
  # SQL to load/insert transformed data into Silver

verify_sql: |
  # SQL to verify the loaded Silver data

checks:
  # Data-quality checks identified from the actual Bronze data
  - name: ""
    description: ""
    sql: ""
    expected: ""

table_details:
  columns:
    - name: ""
      source_column: ""
      type: ""
      description: ""
      transformation: ""
```

---

## 1. `crm_cust_info.yaml` — `bronze.crm_cust_info` -> `silver.crm_cust_info`

### Findings
- 18,493 rows. `cst_id`: 3 NULLs, 5 duplicate `cst_id` groups (6 extra rows —
  e.g. `cst_id = 29466` has 3 versions with increasing `cst_create_date` and
  progressively more-complete data; the latest row is the correct one).
- `cst_firstname` / `cst_lastname`: 7 / 6 NULLs; many values have leading or
  trailing spaces (e.g. `" Jon"`, `"Yang "`, `"  Zhu"`).
- `cst_marital_status`: only `S`, `M`, `NULL` (6 NULLs) — no unexpected codes.
- `cst_gndr`: only `M`, `F`, `NULL` (4,577 NULLs) — no unexpected codes.
- `cst_key`: 0 nulls/blanks; format `AW#########`, matches `erp_cust_az12`
  and `erp_loc_a101` customer IDs after those are normalized (see below).
- After excluding NULL `cst_id` and de-duplicating, expected distinct
  customers = 18,493 − 3 − 6 = **18,484**, which matches `erp_loc_a101`'s row
  count and `crm_sales_details`'s distinct `sls_cust_id` count exactly.

### transform_sql
```sql
IF OBJECT_ID('silver.crm_cust_info', 'U') IS NOT NULL
    DROP TABLE silver.crm_cust_info;
GO

CREATE TABLE silver.crm_cust_info (
    cst_id              INT,
    cst_key             NVARCHAR(50),
    cst_firstname       NVARCHAR(50),
    cst_lastname        NVARCHAR(50),
    cst_marital_status  NVARCHAR(10),
    cst_gndr            NVARCHAR(10),
    cst_create_date     DATE,
    dwh_create_date     DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
```

### load_sql
```sql
TRUNCATE TABLE silver.crm_cust_info;
GO

INSERT INTO silver.crm_cust_info (
    cst_id, cst_key, cst_firstname, cst_lastname,
    cst_marital_status, cst_gndr, cst_create_date
)
SELECT
    cst_id,
    cst_key,
    LTRIM(RTRIM(cst_firstname)) AS cst_firstname,
    LTRIM(RTRIM(cst_lastname))  AS cst_lastname,
    CASE UPPER(LTRIM(RTRIM(cst_marital_status)))
        WHEN 'S' THEN 'Single'
        WHEN 'M' THEN 'Married'
        ELSE 'n/a'
    END AS cst_marital_status,
    CASE UPPER(LTRIM(RTRIM(cst_gndr)))
        WHEN 'M' THEN 'Male'
        WHEN 'F' THEN 'Female'
        ELSE 'n/a'
    END AS cst_gndr,
    cst_create_date
FROM (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY cst_id ORDER BY cst_create_date DESC) AS rn
    FROM bronze.crm_cust_info
    WHERE cst_id IS NOT NULL
) t
WHERE rn = 1;
GO
```

### verify_sql
```sql
SELECT COUNT(*) AS silver_row_count FROM silver.crm_cust_info;
```

### checks
1. **Duplicate Key** — `no_duplicate_cst_id`
   sql: `SELECT COUNT(*) FROM (SELECT cst_id FROM silver.crm_cust_info GROUP BY cst_id HAVING COUNT(*) > 1) t`
   expected: `"0"`
2. **Marriage Details** — `marital_status_domain`
   sql: `SELECT COUNT(*) FROM silver.crm_cust_info WHERE cst_marital_status NOT IN ('Single','Married','n/a')`
   expected: `"0"`
3. **Gender** — `gender_domain`
   sql: `SELECT COUNT(*) FROM silver.crm_cust_info WHERE cst_gndr NOT IN ('Male','Female','n/a')`
   expected: `"0"`
4. **Null-key rows excluded and deduped correctly** — `cst_id_reconciliation`
   (real issue: 3 NULL `cst_id` rows + 6 duplicate-group extra rows in Bronze)
   sql: `SELECT CASE WHEN (SELECT COUNT(DISTINCT cst_id) FROM bronze.crm_cust_info WHERE cst_id IS NOT NULL) = (SELECT COUNT(*) FROM silver.crm_cust_info) THEN 1 ELSE 0 END`
   expected: `"1"`
5. **Name whitespace trimmed** — `name_whitespace_trimmed`
   (real issue: leading/trailing spaces observed in `cst_firstname`/`cst_lastname`)
   sql: `SELECT COUNT(*) FROM silver.crm_cust_info WHERE cst_firstname != LTRIM(RTRIM(cst_firstname)) OR cst_lastname != LTRIM(RTRIM(cst_lastname))`
   expected: `"0"`

### table_details.columns
| name | source_column | type | transformation |
|---|---|---|---|
| cst_id | cst_id | INT | Exclude NULLs; keep latest row per `cst_id` by `cst_create_date DESC` |
| cst_key | cst_key | NVARCHAR(50) | Passthrough |
| cst_firstname | cst_firstname | NVARCHAR(50) | `LTRIM(RTRIM(...))` |
| cst_lastname | cst_lastname | NVARCHAR(50) | `LTRIM(RTRIM(...))` |
| cst_marital_status | cst_marital_status | NVARCHAR(10) | `S`→`Single`, `M`→`Married`, else `n/a` |
| cst_gndr | cst_gndr | NVARCHAR(10) | `M`→`Male`, `F`→`Female`, else `n/a` |
| cst_create_date | cst_create_date | DATE | Passthrough |
| dwh_create_date | (n/a) | DATETIME2(3) | `SYSUTCDATETIME()` load timestamp |

---

## 2. `erp_cust_az12.yaml` — `bronze.erp_cust_az12` -> `silver.erp_cust_az12`

### Findings
- 18,483 rows, 0 duplicate `cid`, 0 nulls on `cid`/`bdate`.
- `cid` has two formats: 11,042 rows prefixed `NAS...` (e.g.
  `NASAW00011000`), 7,441 rows already bare (e.g. `AW00022042`). Stripping a
  leading `NAS` and joining to `crm_cust_info.cst_key` matches all 18,483
  rows (0 unmatched) — confirms the transformation rule.
- `bdate`: 16 rows are in the future (as far out as `9999-11-20`), clearly
  bad sentinel/entry-error values. Min valid-looking date is `1916-02-10`.
- `gen`: `Male` (8,608), `Female` (8,391), `NULL` (1,471), plus dirty
  variants `'F '` (5), `'M '` (4), `'  '` (4, effectively blank).

### transform_sql
```sql
IF OBJECT_ID('silver.erp_cust_az12', 'U') IS NOT NULL
    DROP TABLE silver.erp_cust_az12;
GO

CREATE TABLE silver.erp_cust_az12 (
    cid              NVARCHAR(50),
    bdate            DATE,
    gen              NVARCHAR(10),
    dwh_create_date  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
```

### load_sql
```sql
TRUNCATE TABLE silver.erp_cust_az12;
GO

INSERT INTO silver.erp_cust_az12 (cid, bdate, gen)
SELECT
    CASE WHEN cid LIKE 'NAS%' THEN SUBSTRING(cid, 4, LEN(cid)) ELSE cid END AS cid,
    CASE WHEN bdate > GETDATE() THEN NULL ELSE bdate END AS bdate,
    CASE UPPER(LTRIM(RTRIM(gen)))
        WHEN 'MALE' THEN 'Male'
        WHEN 'M' THEN 'Male'
        WHEN 'FEMALE' THEN 'Female'
        WHEN 'F' THEN 'Female'
        ELSE 'n/a'
    END AS gen
FROM bronze.erp_cust_az12;
GO
```

### verify_sql
```sql
SELECT COUNT(*) AS silver_row_count FROM silver.erp_cust_az12;
```

### checks
1. **Duplicate Key** — `no_duplicate_cid`
   sql: `SELECT COUNT(*) FROM (SELECT cid FROM silver.erp_cust_az12 GROUP BY cid HAVING COUNT(*) > 1) t`
   expected: `"0"`
2. **Gender** — `gender_domain`
   sql: `SELECT COUNT(*) FROM silver.erp_cust_az12 WHERE gen NOT IN ('Male','Female','n/a')`
   expected: `"0"`
   *(Marriage Details does not apply — this table has no marital-status column; not fabricated.)*
3. **No future birthdates** — `bdate_not_future`
   (real issue: 16 future/sentinel dates found in Bronze)
   sql: `SELECT COUNT(*) FROM silver.erp_cust_az12 WHERE bdate > GETDATE()`
   expected: `"0"`
4. **`cid` resolves to a known customer** — `cid_matches_crm_customer`
   sql: `SELECT COUNT(*) FROM silver.erp_cust_az12 e WHERE NOT EXISTS (SELECT 1 FROM silver.crm_cust_info c WHERE c.cst_key = e.cid)`
   expected: `"0"`

### table_details.columns
| name | source_column | type | transformation |
|---|---|---|---|
| cid | cid | NVARCHAR(50) | Strip leading `NAS` prefix when present |
| bdate | bdate | DATE | NULL out future dates (`bdate > GETDATE()`) |
| gen | gen | NVARCHAR(10) | `TRIM`+`UPPER` then map to `Male`/`Female`/`n/a` |
| dwh_create_date | (n/a) | DATETIME2(3) | `SYSUTCDATETIME()` load timestamp |

---

## 3. `erp_loc_a101.yaml` — `bronze.erp_loc_a101` -> `silver.erp_loc_a101`

### Findings
- 18,484 rows, 0 duplicate `cid`, 0 nulls on `cid`.
- `cid` always contains a hyphen (`AW-00011000`, 100% of rows). Stripping the
  hyphen and joining to `crm_cust_info.cst_key` matches every row.
- `cntry`: 10 distinct raw values including inconsistent codings for the
  same country — `USA` (2,591), `United States` (3,391), `US` (1,500) all
  mean the same country; `DE` (566) vs `Germany` (1,214) likewise. Also 332
  NULLs and 5 blank/whitespace-only values.

### transform_sql
```sql
IF OBJECT_ID('silver.erp_loc_a101', 'U') IS NOT NULL
    DROP TABLE silver.erp_loc_a101;
GO

CREATE TABLE silver.erp_loc_a101 (
    cid              NVARCHAR(50),
    cntry            NVARCHAR(50),
    dwh_create_date  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
```

### load_sql
```sql
TRUNCATE TABLE silver.erp_loc_a101;
GO

INSERT INTO silver.erp_loc_a101 (cid, cntry)
SELECT
    REPLACE(cid, '-', '') AS cid,
    CASE
        WHEN LTRIM(RTRIM(ISNULL(cntry, ''))) IN ('US', 'USA') THEN 'United States'
        WHEN LTRIM(RTRIM(ISNULL(cntry, ''))) = 'DE' THEN 'Germany'
        WHEN LTRIM(RTRIM(ISNULL(cntry, ''))) = '' THEN 'n/a'
        ELSE LTRIM(RTRIM(cntry))
    END AS cntry
FROM bronze.erp_loc_a101;
GO
```

### verify_sql
```sql
SELECT COUNT(*) AS silver_row_count FROM silver.erp_loc_a101;
```

### checks
1. **Duplicate Key** — `no_duplicate_cid`
   sql: `SELECT COUNT(*) FROM (SELECT cid FROM silver.erp_loc_a101 GROUP BY cid HAVING COUNT(*) > 1) t`
   expected: `"0"`
   *(Marriage Details / Gender do not apply — this table has no such columns; not fabricated.)*
2. **Country codes standardized** — `country_standardized`
   (real issue: `US`/`USA`/`United States` and `DE`/`Germany` coexisted in Bronze)
   sql: `SELECT COUNT(*) FROM silver.erp_loc_a101 WHERE cntry IN ('US','USA','DE')`
   expected: `"0"`
3. **`cid` resolves to a known customer** — `cid_matches_crm_customer`
   sql: `SELECT COUNT(*) FROM silver.erp_loc_a101 l WHERE NOT EXISTS (SELECT 1 FROM silver.crm_cust_info c WHERE c.cst_key = l.cid)`
   expected: `"0"`

### table_details.columns
| name | source_column | type | transformation |
|---|---|---|---|
| cid | cid | NVARCHAR(50) | Strip hyphen (`REPLACE(cid,'-','')`) |
| cntry | cntry | NVARCHAR(50) | Normalize `US`/`USA`→`United States`, `DE`→`Germany`, blank/NULL→`n/a` |
| dwh_create_date | (n/a) | DATETIME2(3) | `SYSUTCDATETIME()` load timestamp |

---

## 4. `crm_sales_details.yaml` — `bronze.crm_sales_details` -> `silver.crm_sales_details`

### Findings
- 60,398 rows. Composite key `(sls_ord_num, sls_prd_key)` has **0**
  duplicates — safe to enforce as the row-level key.
- Date columns (`sls_order_dt`/`sls_ship_dt`/`sls_due_dt`) are `INT` in
  `YYYYMMDD` form. `sls_order_dt` has 19 invalid values (17 are `0`, 2 have
  the wrong digit length); `sls_ship_dt`/`sls_due_dt` have none. No rows
  where `order_dt > ship_dt`.
- `sls_sales`: 8 NULLs, 5 non-null values `<= 0`.
- `sls_price`: 7 NULLs, 5 non-null values `<= 0` (all observed negative
  values are the exact negation of the correct price, e.g. `sls_price = -769`
  where `sls_sales = 769` and `sls_quantity = 1`).
- 35 rows where `sls_sales != sls_quantity * sls_price` (covers the NULL and
  sign-flipped cases above plus a few pure arithmetic mismatches).
- Every `sls_cust_id` matches a `crm_cust_info.cst_id` (0 unmatched) — good
  referential integrity to preserve going forward.

### transform_sql
```sql
IF OBJECT_ID('silver.crm_sales_details', 'U') IS NOT NULL
    DROP TABLE silver.crm_sales_details;
GO

CREATE TABLE silver.crm_sales_details (
    sls_ord_num      NVARCHAR(50),
    sls_prd_key      NVARCHAR(50),
    sls_cust_id      INT,
    sls_order_dt     DATE,
    sls_ship_dt      DATE,
    sls_due_dt       DATE,
    sls_sales        INT,
    sls_quantity     INT,
    sls_price        INT,
    dwh_create_date  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
```

### load_sql
```sql
TRUNCATE TABLE silver.crm_sales_details;
GO

INSERT INTO silver.crm_sales_details (
    sls_ord_num, sls_prd_key, sls_cust_id,
    sls_order_dt, sls_ship_dt, sls_due_dt,
    sls_sales, sls_quantity, sls_price
)
SELECT
    sls_ord_num,
    sls_prd_key,
    sls_cust_id,
    CASE WHEN sls_order_dt = 0 OR LEN(CAST(sls_order_dt AS VARCHAR)) != 8 THEN NULL
         ELSE CAST(CAST(sls_order_dt AS VARCHAR) AS DATE) END AS sls_order_dt,
    CASE WHEN sls_ship_dt = 0 OR LEN(CAST(sls_ship_dt AS VARCHAR)) != 8 THEN NULL
         ELSE CAST(CAST(sls_ship_dt AS VARCHAR) AS DATE) END AS sls_ship_dt,
    CASE WHEN sls_due_dt = 0 OR LEN(CAST(sls_due_dt AS VARCHAR)) != 8 THEN NULL
         ELSE CAST(CAST(sls_due_dt AS VARCHAR) AS DATE) END AS sls_due_dt,
    CASE WHEN sls_sales IS NULL OR sls_sales <= 0 OR sls_sales != sls_quantity * ABS(sls_price)
         THEN sls_quantity * ABS(sls_price)
         ELSE sls_sales END AS sls_sales,
    sls_quantity,
    CASE WHEN sls_price IS NULL OR sls_price <= 0
         THEN sls_sales / NULLIF(sls_quantity, 0)
         ELSE ABS(sls_price) END AS sls_price
FROM bronze.crm_sales_details;
GO
```

### verify_sql
```sql
SELECT COUNT(*) AS silver_row_count FROM silver.crm_sales_details;
```

### checks
1. **Duplicate Key** — `no_duplicate_order_line`
   sql: `SELECT COUNT(*) FROM (SELECT sls_ord_num, sls_prd_key FROM silver.crm_sales_details GROUP BY sls_ord_num, sls_prd_key HAVING COUNT(*) > 1) t`
   expected: `"0"`
   *(Marriage Details / Gender do not apply — this table has no such columns; not fabricated.)*
2. **Invalid order dates scrubbed, count matches source** — `order_date_scrub_count`
   (real issue: 19 rows had `sls_order_dt = 0` or wrong length in Bronze)
   sql: `SELECT COUNT(*) FROM silver.crm_sales_details WHERE sls_order_dt IS NULL`
   expected: `"19"`
3. **Sales = quantity x price for every row** — `sales_math_consistency`
   (real issue: 35 rows failed this in Bronze, including sign-flipped prices)
   sql: `SELECT COUNT(*) FROM silver.crm_sales_details WHERE sls_sales != sls_quantity * sls_price OR sls_sales <= 0 OR sls_price <= 0`
   expected: `"0"`
4. **`sls_cust_id` resolves to a known customer** — `cust_id_referential_integrity`
   sql: `SELECT COUNT(*) FROM silver.crm_sales_details s WHERE NOT EXISTS (SELECT 1 FROM silver.crm_cust_info c WHERE c.cst_id = s.sls_cust_id)`
   expected: `"0"`

### table_details.columns
| name | source_column | type | transformation |
|---|---|---|---|
| sls_ord_num | sls_ord_num | NVARCHAR(50) | Passthrough |
| sls_prd_key | sls_prd_key | NVARCHAR(50) | Passthrough |
| sls_cust_id | sls_cust_id | INT | Passthrough |
| sls_order_dt | sls_order_dt | DATE | `INT YYYYMMDD` → `DATE`; NULL if `0` or wrong length |
| sls_ship_dt | sls_ship_dt | DATE | `INT YYYYMMDD` → `DATE`; NULL if `0` or wrong length |
| sls_due_dt | sls_due_dt | DATE | `INT YYYYMMDD` → `DATE`; NULL if `0` or wrong length |
| sls_sales | sls_sales | INT | Recompute as `quantity * ABS(price)` when NULL/≤0/inconsistent |
| sls_quantity | sls_quantity | INT | Passthrough (no bad values found) |
| sls_price | sls_price | INT | `ABS(price)`; recompute as `sales / quantity` when NULL/≤0 |
| dwh_create_date | (n/a) | DATETIME2(3) | `SYSUTCDATETIME()` load timestamp |

---

## 5. `mkt_campaign_events.yaml` — `bronze.mkt_campaign_events` -> `silver.mkt_campaign_events`

### Findings
- **Table is currently empty (0 rows).** The Kafka copy step
  (`node kafka-stream-copy/consume_campaign_events.js`, workshop2 part 3
  step 9) runs after this task, so there is no live data to profile.
- Everything below is derived from the DDL (`ddl_bronze.sql`) and its
  comments, not from data content — per instructions, no additional
  data-pattern checks are invented here. The DDL comment explicitly states
  the table is append-only (not truncated between runs) and that duplicates
  from retried Kafka messages are expected and must be removed downstream by
  `event_id` — this directly justifies the dedup transform and the
  Duplicate Key check.
- `event_id`, `cmp_id`, `cmp_key`, `sls_ord_num` are always populated by the
  producer (`INSERT_SQL` in `consume_campaign_events.js` always supplies
  them), even though the Bronze column definitions are nullable — this
  justifies a completeness check on those four columns.
- **Action item once data is loaded:** re-run profiling on this table
  (value distributions for `cmp_channel`/`cmp_type`, `cmp_discount_pct`
  range, `applied_dt`/`event_ts` sanity, actual duplicate-event volume) and
  revisit this YAML's checks — do not treat this section as final.

### transform_sql
```sql
IF OBJECT_ID('silver.mkt_campaign_events', 'U') IS NOT NULL
    DROP TABLE silver.mkt_campaign_events;
GO

CREATE TABLE silver.mkt_campaign_events (
    event_id          NVARCHAR(64),
    cmp_id            INT,
    cmp_key           NVARCHAR(50),
    cmp_name          NVARCHAR(100),
    cmp_channel       NVARCHAR(50),
    cmp_type          NVARCHAR(50),
    cmp_discount_pct  INT,
    sls_ord_num       NVARCHAR(50),
    applied_dt        DATE,
    event_ts          DATETIME2(3),
    dwh_create_date   DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
```

### load_sql
```sql
TRUNCATE TABLE silver.mkt_campaign_events;
GO

INSERT INTO silver.mkt_campaign_events (
    event_id, cmp_id, cmp_key, cmp_name, cmp_channel, cmp_type,
    cmp_discount_pct, sls_ord_num, applied_dt, event_ts
)
SELECT
    event_id,
    cmp_id,
    cmp_key,
    LTRIM(RTRIM(cmp_name))    AS cmp_name,
    LTRIM(RTRIM(cmp_channel)) AS cmp_channel,
    LTRIM(RTRIM(cmp_type))    AS cmp_type,
    cmp_discount_pct,
    sls_ord_num,
    applied_dt,
    event_ts
FROM (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY event_ts DESC) AS rn
    FROM bronze.mkt_campaign_events
    WHERE event_id IS NOT NULL
) t
WHERE rn = 1;
GO
```

### verify_sql
```sql
SELECT COUNT(*) AS silver_row_count FROM silver.mkt_campaign_events;
```

### checks
1. **Duplicate Key** — `no_duplicate_event_id`
   (derived from the `ddl_bronze.sql` comment: retried Kafka messages create
   duplicate `event_id`s that must be deduped downstream)
   sql: `SELECT COUNT(*) FROM (SELECT event_id FROM silver.mkt_campaign_events GROUP BY event_id HAVING COUNT(*) > 1) t`
   expected: `"0"`
   *(Marriage Details / Gender do not apply — this table has no such columns; not fabricated.)*
2. **Critical fields populated** — `critical_fields_not_null`
   sql: `SELECT COUNT(*) FROM silver.mkt_campaign_events WHERE cmp_id IS NULL OR cmp_key IS NULL OR sls_ord_num IS NULL`
   expected: `"0"`

No further additional checks are added — the table has no data yet to
justify more than what the schema/DDL comments already evidence.

### table_details.columns
| name | source_column | type | transformation |
|---|---|---|---|
| event_id | event_id | NVARCHAR(64) | Exclude NULLs; keep latest row per `event_id` by `event_ts DESC` (dedup retried messages) |
| cmp_id | cmp_id | INT | Passthrough |
| cmp_key | cmp_key | NVARCHAR(50) | Passthrough |
| cmp_name | cmp_name | NVARCHAR(100) | `LTRIM(RTRIM(...))` |
| cmp_channel | cmp_channel | NVARCHAR(50) | `LTRIM(RTRIM(...))` |
| cmp_type | cmp_type | NVARCHAR(50) | `LTRIM(RTRIM(...))` |
| cmp_discount_pct | cmp_discount_pct | INT | Passthrough |
| sls_ord_num | sls_ord_num | NVARCHAR(50) | Passthrough |
| applied_dt | applied_dt | DATE | Passthrough |
| event_ts | event_ts | DATETIME2(3) | Passthrough |
| dwh_create_date | (n/a) | DATETIME2(3) | `SYSUTCDATETIME()` load timestamp |

---

## Implementation checklist (for the follow-up `implement` pass)

1. Create `workshop2/pipeline/yaml/` directory.
2. Create `template.yaml` exactly as specified above.
3. Create the 5 table YAMLs exactly as specified above, matching the naming
   convention (lowercase, `_`-separated, filename mirrors the Bronze table
   name, target is `silver.<table>`).
4. Do not create YAMLs for `crm_prd_info` / `erp_px_cat_g1v2` (out of scope
   per the prompt's dataset list).
5. Once `bronze.mkt_campaign_events` has real data (after the Kafka copy
   step), re-profile it and revisit its YAML's checks before relying on it.
