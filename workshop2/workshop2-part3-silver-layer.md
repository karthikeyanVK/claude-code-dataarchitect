# Workshop 2 · Part 3 - Create Silver Layer

*Profile the Bronze data and let Claude Code build the Silver-layer YAML + runner.*

**[Part 1](./workshop2-part1-bronze-erp-crm.md) · [Part 2](./workshop2-part2-kafka-streaming.md) · Part 3 · [Part 4](./workshop2-part4-star-schema.md)**

---

1. Run the below prompt to start building silver data.

   ```
    You are a Data Architect/Data Analyst building the Silver Layer using the Medallion Architecture.

    * Bronze data is already loaded.
    * First, inspect and profile the actual Bronze data for the customer, sales, and marketing campaign datasets.
    * Read the database connection string from .env.
    * Use template.yaml as the authoritative YAML structure.
    * Do not invent columns, business rules, transformations, or data-quality issues. Derive them from the actual Bronze data.
    * Create one YAML file for every Bronze table and populate it based on the actual table structure and data.

    YAML Template

    Create template.yaml with this structure in workshop2/pipeline/yaml:

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

    YAML Requirements

    For each Bronze table, create a separate YAML file containing:

    * Source and target table details.
    * Complete transform_sql.
    * Complete load_sql.
    * Complete verify_sql.
    * Data-quality checks.
    * Silver table_details, including columns, types, source columns, and transformations.

    Data Quality

    Always evaluate:

    1. Duplicate Key
    2. Marriage Details
    3. Gender

    Then inspect the actual Bronze data and identify four additional complex quality checks related to data wrt to sales, product and campaign.

    Only create those additional checks when the corresponding data pattern/problem actually exists. Analyze the data first; do not manufacture checks simply to reach four.

    Naming Convention

    1. All Silver table/file names must be lowercase.
    2. Use _ to clearly separate words and identify the layer/type.
    3. Example: silver.crm_sales_details
    4. SQL/YAML filenames must follow the same naming convention.
    - Create a plan and save it to create_yaml_template.md, dont ask for implementing it i will run on my own  /plan
   ```
2. Enter `/clear` in the Claude Code CLI.
3. Enter `implement create_yaml_template.md`
4. Run the below prompt to create a Node.js pipeline.

  ```
  Create a generic TypeScript/Node.js runner in workshop2/pipeline that:

  - Reads the connection string from `.env`.
  - Automatically discovers every YAML file in the `yaml` directory.
  - Reads the `transform_sql`, `load_sql`, and `verify_sql` fields.
  - Executes each YAML file in a deterministic order.
  - Runs the verification SQL and reports the results.
  - Does not contain hardcoded table-specific logic.
  - Same template will be used by gold layer also, just FYI
  - Adding a new Bronze, Silver, or Gold table should require only adding its YAML file.
  - It should work with `npm run load`.
  - Create a plan and save it to `create_pipeline.md`.
  - Do not ask for permission to implement the plan. I will run the implementation myself.
  - Perform sanity testing, but do not run `npm run load` yourself.
  ```
5. Enter `/clear` in the Claude Code CLI.
6. Enter `implement create_pipeline.md`.
7. Once the implementation is over then navigate to `pipeline` folder and run

    ```bash
    npm run load
    ```

---

**Next: [Part 4 - Design Star Schema](./workshop2-part4-star-schema.md)**
