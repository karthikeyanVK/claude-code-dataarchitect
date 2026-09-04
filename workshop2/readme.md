# Claude Data Architect - Medallion Architecture Build with AI (Claude)

*Load Bronze from ERP/CRM and Kafka, then build Silver and Gold (star schema) with Claude Code.*

---

| Part | What you do |
|---|---|
| [Part 1 - Setup Bronze Layer: ERP and CRM Datasource](./workshop2-part1-bronze-erp-crm.md) | Run `ddl_bronze.sql` and `loadbronze.sql` via the SQL Server extension |
| [Part 2 - Setup Bronze Layer: Kafka Streaming](./workshop2-part2-kafka-streaming.md) | Consume the `campaign-events` Kafka topic into Bronze |
| [Part 3 - Create Silver Layer](./workshop2-part3-silver-layer.md) | Profile Bronze data, generate Silver YAML + a generic runner |
| [Part 4 - Design Star Schema](./workshop2-part4-star-schema.md) | Build the Gold-layer fact/dimension tables from Silver |

Work through them in order. Each part ends with a link to the next.

**Start here: [Part 1 - Setup Bronze Layer: ERP and CRM Datasource](./workshop2-part1-bronze-erp-crm.md)**
