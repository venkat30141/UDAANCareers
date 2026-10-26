
import { encryptText } from "../utils/encryption.util.js";

export async function enqueueOtpEmail({ email, otp, client }) {
  if (!client) {
    throw new Error("A database transaction client is required.");
  }

  if (typeof email !== "string" || typeof otp !== "string") {
    throw new Error("Email and OTP are required.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !/^\d{6}$/.test(otp)) {
    throw new Error("Invalid OTP email job.");
  }

  // Encrypt the OTP before storing it in PostgreSQL.
  const encryptedPayload = encryptText(
    JSON.stringify({
      otp,
      expiresInMinutes: 10,
    })
  );

  const result = await client.query(
    `INSERT INTO email_outbox (
       recipient_email,
       purpose,
       encrypted_payload,
       status,
       attempts,
       next_attempt_at
     )
     VALUES ($1, 'signup', $2, 'pending', 0, NOW())
     RETURNING id`,
    [normalizedEmail, encryptedPayload]
  );

  return result.rows[0];
}
