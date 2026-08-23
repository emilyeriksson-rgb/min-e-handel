import pg from "pg";

const { Pool } = pg;

const databaseUrl = new URL(process.env.DATABASE_URL);

// Vi anger SSL-inställningen själva nedanför.
databaseUrl.searchParams.delete("sslmode");

const pool = new Pool({
  connectionString: databaseUrl.toString(),
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;