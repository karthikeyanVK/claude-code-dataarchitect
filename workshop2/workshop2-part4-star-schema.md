# Workshop 2 Part 4 - Design Star Schema

*Build the Gold-layer dimensional model from Silver data.*

**[Part 1](./workshop2-part1-bronze-erp-crm.md) · [Part 2](./workshop2-part2-kafka-streaming.md) · [Part 3](./workshop2-part3-silver-layer.md) · Part 4**

---

1. Run the below prompt

   ```
  You are a Data Architect/Data Analyst building the Gold Layer of a data platform using the Medallion Architecture.

    Requirements

      - The Silver layer is already populated and is the source for the Gold layer.
      - Read the database connection string from `.env`.
      - Build a reporting-ready dimensional model from Silver data.
      - Use star schema design with properly defined fact and dimension tables.
      - Create the fact table `gold_fact_sales`.
      - Create the dimension tables `gold_dim_customer` and `gold_dim_product`.
      - Create the dimension table `gold_dim_campaign` using `silver.mkt_campaign_events` as the source.
      - Join and transform the required data from Silver tables to populate the Gold tables correctly.
      - For `gold_dim_campaign`, use campaign-related fields such as `cmp_id`, `cmp_key`, `cmp_name`, `cmp_channel`, `cmp_type`, and `cmp_discount_pct`.
      - Use `sls_ord_num`, `applied_dt`, and `event_ts` from `silver.mkt_campaign_events` appropriately to establish the relationship between campaign events and sales without creating duplicate sales fact records.
      - Define appropriate primary keys, foreign keys, surrogate keys, measures, and descriptive attributes.
      - Ensure referential integrity between the fact and dimension tables.
      - Handle null and missing values appropriately and avoid duplicate dimension and fact records.
      - Optimize the schema for BI reporting, analytics, filtering, aggregation, and performance.

    Naming Convention

      - All Gold table and file names must be lowercase.
      - Use `_` to clearly separate words and identify the layer or type.
      - Examples: `gold_fact_sales`, `gold_dim_customer`, `gold_dim_product`, `gold_dim_campaign`.
      - SQL and YAML filenames must follow the same naming convention.

    Deliverables

      Create a detailed implementation plan for the Gold-layer SQL and YAML definitions and the required execution code to load the Gold tables from Silver data using the `.env` connection string.

      The planned schema should be clean, scalable, reporting-friendly, and follow dimensional and star-schema best practices.

      The Gold star schema should include:

      - `gold_fact_sales`
      - `gold_dim_customer`
      - `gold_dim_product`
      - `gold_dim_campaign`

      The campaign dimension should be sourced from `silver.mkt_campaign_events` and should include the relevant campaign attributes and campaign-to-sales relationship fields.

      Ensure the campaign-to-sales relationship is correctly handled and that campaign events do not cause duplicate records in `gold_fact_sales`.

      Save the plan to `create_star_schema.md`.

      Do not implement the plan and do not ask me for permission to implement it. I will implement it myself.
    ```

3. Enter `Implement create_star_schema.md` and press enter to run in the claude code and let it run.
4. Once the implementation is over then navigate to `workshop2/pipeline` folder and run

    ```bash
    npm run load
    ```
---

**Next: [Part 5 - Design & create report](./workshop2-part5-report.md)**
