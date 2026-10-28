
import bcrypt from "bcrypt";
import { pool } from "../src/config/db.js";

async function createAdmin() {
  const fullName = process.env.ADMIN_FULL_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!fullName || !email || !password) {
    throw new Error(
      "Set ADMIN_FULL_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD before running this script."
    );
  }

  if (password.length < 12) {
    throw new Error("Admin password must be at least 12 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `INSERT INTO users (
       full_name,
       email,
       password_hash,
       role,
       is_email_verified,
       is_active
     )
     VALUES ($1, $2, $3, 'admin', TRUE, TRUE)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, full_name, email, role`,
    [fullName, email, passwordHash]
  );

  if (result.rows.length === 0) {
    console.log(
      "An account with this email already exists. No changes were made."
    );
    return;
  }

  console.log("Admin account created:", result.rows[0]);
}

try {
  await createAdmin();
} catch (error) {
  console.error("Admin provisioning failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
