import { config as loadEnv } from 'dotenv';

// Reusa la configuración entregada al proceso, pero apunta Postgres/Mongo a
// la instancia expuesta por docker-compose.dev.yml en el host y a bases de
// datos separadas, para no tocar datos de desarrollo/prod.
loadEnv({ quiet: true });

process.env.NODE_ENV = 'test';
const runningInDocker = process.env.E2E_DOCKER === 'true';
const testDatabasePort = runningInDocker
  ? '5438'
  : (process.env.TEST_DATABASE_PORT ?? '5438');
const testMongoPort = runningInDocker
  ? '27017'
  : (process.env.TEST_MONGODB_PORT ?? '27018');

if (process.env.DATABASE_URL) {
  const dbUrl = new URL(process.env.DATABASE_URL);
  dbUrl.hostname = runningInDocker ? 'postgres' : 'localhost';
  dbUrl.port = testDatabasePort;
  dbUrl.pathname = '/acoreai_ai_test';
  process.env.DATABASE_URL = dbUrl.toString();
}

if (process.env.MONGODB_URI) {
  const mongoUrl = new URL(process.env.MONGODB_URI);
  mongoUrl.hostname = runningInDocker ? 'mongodb' : 'localhost';
  mongoUrl.port = testMongoPort;
  mongoUrl.pathname = '/acoreai_ai_gateway_test';
  process.env.MONGODB_URI = mongoUrl.toString();
}
process.env.MONGODB_DB = 'acoreai_ai_gateway_test';
