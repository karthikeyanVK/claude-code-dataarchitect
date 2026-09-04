const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'workshop2', 'pipeline', '.env') });

function kafkaConfig() {
  const brokers = (process.env.KAFKA_BOOTSTRAP_SERVERS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const topic = process.env.KAFKA_TOPIC;
  const username = process.env.KAFKA_SASL_USERNAME;

  let password = process.env.KAFKA_SASL_PASSWORD;
  if (!password && process.env.KAFKA_SASL_PASSWORD_FILE) {
    const secretPath = path.join(__dirname, process.env.KAFKA_SASL_PASSWORD_FILE);
    if (!fs.existsSync(secretPath)) throw new Error(`Kafka secret file not found: ${secretPath}`);
    password = fs.readFileSync(secretPath, 'utf8').trim();
  }

  if (!brokers.length) throw new Error('KAFKA_BOOTSTRAP_SERVERS missing in .env');
  if (!topic) throw new Error('KAFKA_TOPIC missing in .env');
  if (!username) throw new Error('KAFKA_SASL_USERNAME missing in .env');
  if (!password) throw new Error('KAFKA_SASL_PASSWORD (or KAFKA_SASL_PASSWORD_FILE) missing in .env');

  return { brokers, topic, username, password };
}

module.exports = { kafkaConfig };
