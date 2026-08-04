import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Reusa las credenciales reales de .env (ya está en .gitignore) pero apunta
// Postgres/Mongo a la instancia expuesta por docker-compose.dev.yml en el
// host y a bases de datos separadas, para no tocar datos de desarrollo/prod.
loadEnv({ path: resolve(__dirname, '../.env') });

process.env.NODE_ENV = 'test';
const runningInDocker = process.env.E2E_DOCKER === 'true';

if (process.env.DATABASE_URL) {
  const dbUrl = new URL(process.env.DATABASE_URL);
  dbUrl.hostname = runningInDocker ? 'postgres' : 'localhost';
  dbUrl.port = '5438';
  dbUrl.pathname = '/acoreai_ai_test';
  process.env.DATABASE_URL = dbUrl.toString();
}

if (process.env.MONGODB_URI) {
  const mongoUrl = new URL(process.env.MONGODB_URI);
  mongoUrl.hostname = runningInDocker ? 'mongodb' : 'localhost';
  mongoUrl.port = runningInDocker ? '27017' : '27018';
  mongoUrl.pathname = '/acoreai_ai_gateway_test';
  process.env.MONGODB_URI = mongoUrl.toString();
}
process.env.MONGODB_DB = 'acoreai_ai_gateway_test';
