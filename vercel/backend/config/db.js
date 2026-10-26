import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
const connectionTimeoutMillis = 5000;
const query_timeout = 10000;

const pool = databaseUrl
  ? new Pool({
      connectionTimeoutMillis,
      query_timeout,
      connectionString: databaseUrl.replace(
        /[?&]sslmode=[^&]*/g,
        ""
      ),
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : new Pool({
      connectionTimeoutMillis,
      query_timeout,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });


export default pool;