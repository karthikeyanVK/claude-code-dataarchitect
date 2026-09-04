#!/usr/bin/env node
/**
 * Consume marketing-campaign events from the Kafka (Event Hubs) topic `campaign-events`
 * and copy them, unmodified, into bronze.mkt_campaign_events (the bronze layer is a raw,
 * append-only copy - trimming/deduping/decoding happens later in the silver transform,
 * exactly as it does for the CRM/ERP bronze tables).
 *
 * Offset handling: each message is committed only AFTER its row has been successfully
 * inserted into SQL Server. If the process crashes between insert and commit, the same
 * message is simply reprocessed on restart - safe, because event_id is unique per message
 * and silver-layer dedup (by event_id) already tolerates bronze-level duplicates.
 *
 * Usage:
 *   node consume_campaign_events.js                 run continuously (Ctrl+C to stop)
 *   node consume_campaign_events.js --once --idle 10  stop after 10s with no new messages
 *   node consume_campaign_events.js --group my-name   use a stable/named group (resumable,
 *                                                      only new messages replay on re-run)
 *
 * Consumer-group behaviour (important for workshops!):
 * Event Hubs keeps all 200+ events on the topic for the full retention window (7 days),
 * regardless of who has already read them - a consumer group only remembers "how far it
 * got", not the data itself. By default (no --group given) this script generates a BRAND
 * NEW random groupId every run, so:
 *   - every run replays ALL events on the topic from the very start (fromBeginning: true
 *     only matters the first time a given group is ever seen - a fresh group is always
 *     "new" to Event Hubs, so it always replays everything)
 *   - multiple people/workshop attendees running this at the same time each get their OWN
 *     independent full copy into their OWN bronze table - they do not compete for
 *     partitions or split messages between them, because each has a distinct group
 * Pass --group <name> only if you want a resumable, shared/stable position (e.g. a real
 * production consumer that should pick up where it left off after a restart).
 */

const crypto = require('crypto');
const sql = require('mssql');
const { buildConfig } = require('./dq_lib');
const { buildKafkaClient, kafkaConfig } = require('./kafka_lib');

function parseArgs(argv) {
  const args = { once: false, idleSeconds: 15, group: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--once') args.once = true;
    if (argv[i] === '--idle') args.idleSeconds = Number(argv[i += 1]);
    if (argv[i] === '--group') args.group = argv[i += 1];
  }
  return args;
}

const INSERT_SQL = `
INSERT INTO bronze.mkt_campaign_events (
    event_id, cmp_id, cmp_key, cmp_name, cmp_channel, cmp_type,
    cmp_discount_pct, sls_ord_num, applied_dt, event_ts
) VALUES (
    @event_id, @cmp_id, @cmp_key, @cmp_name, @cmp_channel, @cmp_type,
    @cmp_discount_pct, @sls_ord_num, @applied_dt, @event_ts
);`;

async function insertEvent(pool, event) {
  const request = pool.request();
  request.input('event_id', sql.NVarChar(64), event.event_id);
  request.input('cmp_id', sql.Int, event.cmp_id ?? null);
  request.input('cmp_key', sql.NVarChar(50), event.cmp_key ?? null);
  request.input('cmp_name', sql.NVarChar(100), event.cmp_name ?? null);
  request.input('cmp_channel', sql.NVarChar(50), event.cmp_channel ?? null);
  request.input('cmp_type', sql.NVarChar(50), event.cmp_type ?? null);
  request.input('cmp_discount_pct', sql.Int, event.cmp_discount_pct ?? null);
  request.input('sls_ord_num', sql.NVarChar(50), event.sls_ord_num ?? null);
  request.input('applied_dt', sql.Date, event.applied_dt ? new Date(event.applied_dt) : null);
  request.input('event_ts', sql.DateTime2, event.event_ts ? new Date(event.event_ts) : new Date());
  await request.query(INSERT_SQL);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { topic } = kafkaConfig();
  const kafka = buildKafkaClient('campaign-events-consumer');
  // Fresh random groupId by default: Event Hubs treats every new groupId as never having
  // read the topic before, so each run/participant gets a full independent replay of all
  // events instead of resuming from (or competing over) a shared committed offset.
  const groupId = args.group || `bronze-loader-${crypto.randomUUID()}`;
  const consumer = kafka.consumer({ groupId });
  const pool = await sql.connect(buildConfig());
  console.log(`connected to SQL Server; consuming topic '${topic}' (group '${groupId}') -> bronze.mkt_campaign_events`);

  let processed = 0;
  let failed = 0;
  let idleTimer = null;
  let resolveIdle = null;
  const idleExit = new Promise((resolve) => { resolveIdle = resolve; });

  const armIdleTimer = () => {
    if (!args.once) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => resolveIdle(), args.idleSeconds * 1000);
  };

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message, partition }) => {
      armIdleTimer();
      let event;
      try {
        event = JSON.parse(message.value.toString('utf8'));
      } catch (err) {
        failed += 1;
        console.error(`  [SKIP] partition ${partition} offset ${message.offset}: invalid JSON (${err.message})`);
        return; // still auto-committed by kafkajs after eachMessage resolves
      }

      try {
        await insertEvent(pool, event);
        processed += 1;
        console.log(`  [OK] ${event.event_id} order=${event.sls_ord_num} campaign=${event.cmp_key}`);
      } catch (err) {
        failed += 1;
        console.error(`  [ERROR] ${event.event_id || '(no id)'}: ${err.message}`);
        throw err; // do NOT swallow: kafkajs will not advance the committed offset past a thrown error
      }
    },
  });

  armIdleTimer();
  if (args.once) {
    await idleExit;
    console.log(`\nidle for ${args.idleSeconds}s - stopping (--once)`);
    await consumer.disconnect();
    await pool.close();
  } else {
    process.on('SIGINT', async () => {
      console.log('\nshutting down...');
      await consumer.disconnect();
      await pool.close();
      process.exit(0);
    });
    return; // keep running
  }

  console.log(`\n=== consumed: ${processed} inserted, ${failed} failed ===`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(`\nERROR: ${err.message}`);
  process.exit(2);
});
