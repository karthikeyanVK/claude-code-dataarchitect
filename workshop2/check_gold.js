const sql = require('mssql');
const { buildConfig } = require('./pipeline/dq_lib');
(async () => {
  const config = buildConfig();
  const pool = await sql.connect(config);
  const queries = {
    fact: "SELECT COUNT(*) c FROM gold.gold_fact_sales",
    cust: "SELECT COUNT(*) c FROM gold.gold_dim_customer",
    prod: "SELECT COUNT(*) c FROM gold.gold_dim_product",
    camp: "SELECT COUNT(*) c FROM gold.gold_dim_campaign",
    campNonUnknown: "SELECT COUNT(*) c FROM gold.gold_dim_campaign WHERE campaign_key <> -1",
    factWithCamp: "SELECT COUNT(*) c FROM gold.gold_fact_sales WHERE campaign_key <> -1",
    dateRange: "SELECT MIN(order_date) mn, MAX(order_date) mx FROM gold.gold_fact_sales",
  };
  for (const [name, q] of Object.entries(queries)) {
    try {
      const r = await pool.request().query(q);
      console.log(name, JSON.stringify(r.recordset[0]));
    } catch (e) {
      console.log(name, 'ERROR', e.message);
    }
  }
  await pool.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
