# Plan: Generic YAML-Driven Pipeline Runner

Scope: `workshop2/pipeline/run.ts`, a single generic runner executed by
`npm run load` (already wired in `package.json`: `"load": "node pipeline/run.ts"`).
No table-specific code — behavior is entirely driven by the YAML files in
`workshop2/pipeline/yaml/`.

## Runtime choice

Node 22.20 (confirmed via `node --version`) runs `.ts` files directly with no
flags and no `ts-node`/build step, via Node's built-in type-stripping. Verified
locally: a `.ts` file with type annotations runs as-is under plain `node`.
Constraint: `workshop2/package.json` has `"type": "commonjs"`, so the `.ts`
file must use CommonJS syntax (`require`/`module.exports`), not ESM
`import`/`export` — confirmed by testing that `import` inside a `.ts` file
under a commonjs package.json throws `Cannot use import statement outside a
module`. Also avoid non-erasable TS (enums, decorators, parameter-property
shorthand) since default type-stripping only erases types, it doesn't
transform them.

This means: no new dependency, no build step, no `tsconfig.json` needed to
execute. `npm run load` keeps working exactly as already declared.

## Dependencies (already installed, none added)

- `mssql` (^12.7.0) — SQL Server driver, already used elsewhere in the project.
- `yaml` (^2.9.0) — YAML parsing, already used by `dq_lib.js`.
- `workshop2/dq_lib.js` — reused as-is for `.env` parsing and connection-string
  building (`buildConfig()`), via `require('../dq_lib')`. Not duplicated.

## Discovery and skip rule

- Read every `*.yaml` file in `workshop2/pipeline/yaml/`.
- Parse each with `YAML.parse`.
- **Skip rule (generic, not filename-based):** skip any file where
  `table.source` or `table.target` is missing/empty. This is what makes
  `template.yaml` get skipped automatically (per `create_yaml_template.md`:
  "empty `source`/`target` so the runner skips it") without hardcoding its
  filename — any future placeholder/WIP YAML is skipped the same way.
- **Order:** remaining files are sorted alphabetically by filename. This is
  the "deterministic order" the task asks for. It is not dependency-aware —
  it happens to work for the current 5 tables because
  `crm_cust_info.yaml` (no FK dependencies) sorts before the others that
  reference it (`erp_cust_az12`, `erp_loc_a101`, `crm_sales_details` all have
  checks against `silver.crm_cust_info`). If a future table needs to run
  before something that sorts earlier, prefix the filename (e.g.
  `01_crm_cust_info.yaml`) — no runner change needed. Not building a
  dependency graph now since nothing today requires it (YAGNI).

## Per-table execution

For each surviving YAML, in order:

1. Log a header: `<file> :: <table.source> -> <table.target>`.
2. Run `transform_sql` (if present): split into batches, execute each in
   order via `pool.request().batch(...)`.
3. Run `load_sql` (if present): same batch-split-and-execute.
4. Run `verify_sql` (if present): execute, print the returned recordset
   (row count + values) as the "verification" result.
5. Run each entry in `checks[]` (if present): execute `check.sql` (expected
   to return one row/one column per the YAML convention), compare the
   stringified scalar to `check.expected`, record PASS/FAIL. Checks are part
   of "verify and report" — they're already defined per-table in the YAML in
   exactly this generic `{name, sql, expected}` shape, so running them is
   free (no per-table logic) and is what makes the DQ checks in the YAMLs
   actually mean something instead of sitting unused.

## Batch splitting (the `GO` convention)

`ddl_bronze.sql` / `loadbronze.sql` and every YAML's `transform_sql`/`load_sql`
use `GO` on its own line as a batch separator (SQL Server client convention;
not valid T-SQL, so the `mssql` driver can't execute a block containing it).
The runner splits on a standalone-`GO`-line regex (`/^\s*GO\s*$/gim`) and
executes each resulting batch as a separate `.batch()` call, skipping empty
batches. This is generic string handling, not per-table logic.

## Error handling

Fail-fast: if any batch/query throws, log the error with table/file context
and stop the whole run (non-zero exit). Rationale: later tables' checks
already assume earlier Silver tables loaded successfully (FK-style checks
against `silver.crm_cust_info`), so continuing past a failed table would
produce misleading downstream failures rather than the real cause.

## Reporting

After all tables run (or on fail-fast stop):
- Per-table verify result (row count/values from `verify_sql`).
- Per-check PASS/FAIL line: `[PASS|FAIL] <file> :: <check.name> (expected
  "<expected>", got "<actual>")`.
- Final summary: tables processed, checks passed/failed counts.
- Process exit code 1 if any check failed or any table errored; 0 otherwise
  (so `npm run load` fails visibly in CI/terminal on a real DQ problem).

## What's explicitly NOT built (YAGNI)

- No dependency graph / topological sort — alphabetical order + optional
  numeric filename prefix covers it.
- No retry/backoff logic — not asked for, connection issues should surface
  immediately.
- No CLI flags (`--table foo`, `--dry-run`, etc.) — the existing
  `run_dq_checks.js` already covers ad hoc/filtered runs; this runner's job
  is specifically "run everything in `yaml/`, in order, via `npm run load`."
- No parallel execution across tables — deterministic order was explicitly
  requested, and the tables have cross-table FK checks, so sequential is
  correct, not just simpler.

## File(s) added

- `workshop2/pipeline/run.ts` — the whole runner, single file. No table
  registry, no per-table `if` branches: everything table-specific comes from
  the YAML's own `table`, `transform_sql`, `load_sql`, `verify_sql`, and
  `checks` fields. Adding a new Bronze/Silver/Gold table = adding one YAML
  file to `workshop2/pipeline/yaml/`, following `template.yaml`'s shape.

## Sanity testing plan (before handoff, without running `npm run load`)

Since there's no live DB connection available in this session:
- Type-stripping smoke test on the real file: `node --check` isn't
  sufficient for TS syntax, so run `node pipeline/run.ts` up to the point it
  needs a real DB connection and confirm it fails at connection time (proves
  the file parses/loads/executes as valid CJS TypeScript, YAML discovery and
  skip-rule work, and the failure is a legitimate network/auth error, not a
  syntax or module error) — OR mock the `mssql` module's `ConnectionPool` to
  verify batch-splitting and check-comparison logic end-to-end without a
  real server.
- Confirm all 5 non-template YAMLs are discovered and `template.yaml` is
  skipped by logging the discovered file list.
- Confirm `npm run load` invokes the right file (`package.json` already
  points at `pipeline/run.ts`).

Actually running `npm run load` (and thus mutating the live Azure SQL
database) is left to the user, per instructions.
