# Workshop 2 · Part 2 - Setup Bronze Layer: Kafka Streaming

*Consume the `campaign-events` Kafka topic into the Bronze layer.*

**[Part 1](./workshop2-part1-bronze-erp-crm.md) · Part 2 · [Part 3](./workshop2-part3-silver-layer.md) · [Part 4](./workshop2-part4-star-schema.md)**

---

1. In VS Code, open the PowerShell terminal and navigate to the `workshop2` folder
2. Run:

   ```bash
   npm install
   node kafka-stream-copy/consume_campaign_events.js
   ```

3. Check the table is filled using the SQL Server extension:

   ```sql
   SELECT * FROM [bronze].[mkt_campaign_events]
   ```

   to confirm you have correctly configured the database.

---

**Next: [Part 3 - Create Silver Layer](./workshop2-part3-silver-layer.md)**
