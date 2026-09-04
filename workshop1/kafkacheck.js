#!/usr/bin/env node
/**
 * Standalone Kafka (Event Hubs) connectivity check. Confirms broker reachability, SASL auth,
 * topic existence, and consumer-group join, printing kafkajs' internal log stream so a failure
 * point (DNS, TLS, SASL, topic-not-found, group-coordinator) is visible instead of a bare stack.
 *
 * Usage:
 *   node kafkacheck.js                  fresh random group (matches consumer default)
 *   node kafkacheck.js --group my-name  check a specific/stable group
 *   node kafkacheck.js --timeout 20000  override the 15s overall timeout (ms)
 */

const crypto = require('crypto');
const { Kafka, logLevel } = require('kafkajs');
const { kafkaConfig } = require('./kafka_lib');

function parseArgs(argv) {
  const args = { group: null, timeoutMs: 15000 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--group') args.group = argv[i += 1];
    if (argv[i] === '--timeout') args.timeoutMs = Number(argv[i += 1]);
  }
  return args;
}

const LEVEL_NAME = { 1: 'ERROR', 2: 'WARN', 4: 'INFO', 5: 'DEBUG' };

function logCreator() {
  return ({ namespace, level, log }) => {
    const { message, ...rest } = log;
    delete rest.timestamp;
    const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
    console.log(`  [kafkajs:${namespace}] ${LEVEL_NAME[level] || level} ${message}${extra}`);
  };
}

function diagnose(err) {
  const msg = err.message || '';
  if (/ENOTFOUND|EAI_AGAIN/.test(msg)) {
    return 'DNS lookup for the broker host failed. Check KAFKA_BOOTSTRAP_SERVERS in .env and network/VPN access.';
  }
  if (/ECONNREFUSED/.test(msg)) {
    return 'Broker refused the connection. Check the port (9093 for Event Hubs Kafka) and any firewall/NSG rules.';
  }
  if (/ETIMEDOUT|Connection timeout/.test(msg)) {
    return 'Connection timed out reaching the broker. Likely a network/firewall block on port 9093, or wrong region host.';
  }
  if (/SASL|Authentication/i.test(msg)) {
    return 'SASL authentication failed. The SAS connection string in .kafka_secret is wrong/expired, or KAFKA_SASL_USERNAME is not literally "$ConnectionString". Re-fetch with az eventhubs eventhub authorization-rule keys list.';
  }
  if (/self signed certificate|certificate/i.test(msg)) {
    return 'TLS certificate validation failed. Verify ssl: true is set and no proxy is intercepting the connection.';
  }
  if (/This server does not host this topic-partition|UNKNOWN_TOPIC/i.test(msg)) {
    return 'Topic not found on the namespace. Check KAFKA_TOPIC in .env matches the Event Hub name exactly.';
  }
  if (/Kafka secret file not found/.test(msg)) {
    return 'Missing .kafka_secret. Re-fetch it per the "Re-fetching the connection string" steps in CLAUDE.md.';
  }
  return 'Unrecognized failure - see the kafkajs log lines above for the exact stage (connect/handshake/sasl/subscribe) it died at.';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { brokers, topic, username, password } = kafkaConfig();
  const groupId = args.group || `kafkacheck-${crypto.randomUUID()}`;

  console.log('=== Kafka connectivity check ===');
  console.log(`  brokers : ${brokers.join(', ')}`);
  console.log(`  topic   : ${topic}`);
  console.log(`  username: ${username}`);
  console.log(`  group   : ${groupId}${args.group ? '' : ' (fresh/random - pass --group to test a stable one)'}`);
  console.log('');

  const kafka = new Kafka({
    clientId: 'kafkacheck',
    brokers,
    ssl: true,
    sasl: { mechanism: 'plain', username, password },
    logLevel: logLevel.INFO,
    logCreator,
    connectionTimeout: args.timeoutMs,
  });

  const admin = kafka.admin();
  const consumer = kafka.consumer({ groupId, sessionTimeout: Math.max(args.timeoutMs, 10000) });

  const overallTimeout = setTimeout(() => {
    console.error(`\nFAILED: check did not complete within ${args.timeoutMs}ms (hung connect/join - likely network/firewall).`);
    process.exit(1);
  }, args.timeoutMs + 5000);
  overallTimeout.unref();

  try {
    console.log('-- admin: connecting --');
    await admin.connect();
    console.log('  OK: broker connection + SASL auth succeeded');

    console.log('-- admin: fetching topic metadata --');
    const metadata = await admin.fetchTopicMetadata({ topics: [topic] });
    const topicMeta = metadata.topics.find((t) => t.name === topic);
    if (!topicMeta) throw new Error(`UNKNOWN_TOPIC: '${topic}' not present on namespace`);
    console.log(`  OK: topic '${topic}' has ${topicMeta.partitions.length} partition(s)`);

    console.log('-- consumer: connecting + joining group --');
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    let joined = false;
    await consumer.run({
      eachMessage: async () => {}, // no-op; we only need group-join confirmation
    });

    // consumer.run() resolves once the group join / initial fetch loop is set up.
    joined = true;

    const groupDescription = await admin.describeGroups([groupId]);
    const groupInfo = groupDescription.groups[0];
    console.log(`  OK: joined group '${groupId}', state=${groupInfo.state}, members=${groupInfo.members.length}`);

    await consumer.disconnect();
    await admin.disconnect();
    clearTimeout(overallTimeout);

    console.log('\n=== SUCCESS ===');
    console.log(`  server    : ${brokers.join(', ')}`);
    console.log(`  topic     : ${topic} (${topicMeta.partitions.length} partition(s))`);
    console.log(`  group     : ${groupId} (state=${groupInfo.state}, members=${groupInfo.members.length})`);
    console.log('  Kafka connection, auth, topic, and group-join all verified.');
    process.exit(0);
  } catch (err) {
    clearTimeout(overallTimeout);
    console.error('\n=== FAILED ===');
    console.error(`  server    : ${brokers.join(', ')}`);
    console.error(`  topic     : ${topic}`);
    console.error(`  error     : ${err.message}`);
    console.error(`  reason    : ${diagnose(err)}`);
    try { await consumer.disconnect(); } catch (_) { /* already broken */ }
    try { await admin.disconnect(); } catch (_) { /* already broken */ }
    process.exit(1);
  }
}

main();
