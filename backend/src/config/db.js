
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "udaan_careers",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
});

export async function testDatabaseConnection() {
  const result = await pool.query(
    "SELECT current_database() AS database, NOW() AS server_time"
  );

  console.log(
    "PostgreSQL connected successfully to:",
    result.rows[0].database
  );

  return result.rows[0];
}

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});
