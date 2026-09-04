/**
 * Shared Kafka (Azure Event Hubs, Kafka-enabled endpoint) connection helper.
 *
 * Reads all settings, including the SASL password (Event Hubs SAS connection string), from
 * the repo-root .env. .env is gitignored (see .gitignore) so the secret never reaches source
 * control despite living in a single file.
 */

const { Kafka, logLevel } = require('kafkajs');
const { loadEnv } = require('./dq_lib');

function kafkaConfig() {
  const env = { ...loadEnv(), ...process.env };
  const brokers = (env.KAFKA_BOOTSTRAP_SERVERS || '').split(',').map((b) => b.trim()).filter(Boolean);
  const topic = env.KAFKA_TOPIC;
  const username = env.KAFKA_SASL_USERNAME || '$ConnectionString';
  const password = env.KAFKA_SASL_PASSWORD;

  if (!brokers.length) throw new Error('KAFKA_BOOTSTRAP_SERVERS not set in .env');
  if (!topic) throw new Error('KAFKA_TOPIC not set in .env');
  if (!password) throw new Error('KAFKA_SASL_PASSWORD not set in .env');

  return { brokers, topic, username, password };
}

function buildKafkaClient(clientId) {
  const { brokers, username, password } = kafkaConfig();
  return new Kafka({
    clientId,
    brokers,
    ssl: true,
    sasl: { mechanism: 'plain', username, password },
    logLevel: logLevel.ERROR,
  });
}

module.exports = { kafkaConfig, buildKafkaClient };
