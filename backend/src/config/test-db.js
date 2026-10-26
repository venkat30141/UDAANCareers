
import { pool, testDatabaseConnection } from "./db.js";

try {
  const result = await testDatabaseConnection();
  console.log("Database test passed:", result);
} catch (error) {
  console.error("Database connection failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
