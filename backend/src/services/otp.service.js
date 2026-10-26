
import {
  randomInt,
  createHash,
  timingSafeEqual,
} from "node:crypto";

const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_SEND_LIMIT = 5;
const OTP_SEND_WINDOW_HOURS = 24;
const MAX_OTP_ATTEMPTS = 5;

function normalizeEmail(email) {
  if (typeof email !== "string" || !email.trim()) {
    throw new Error("A valid email address is required.");
  }

  return email.trim().toLowerCase();
}

function hashOtp(email, otp) {
  const pepper = process.env.OTP_PEPPER;

  if (!pepper || Buffer.byteLength(pepper, "utf8") < 32) {
    throw new Error("OTP_PEPPER is not configured securely.");
  }

  return createHash("sha256")
    .update(`${email}:${otp}:${pepper}`)
    .digest();
}

function hashesMatch(storedHex, submittedHash) {
  if (
    typeof storedHex !== "string" ||
    !/^[a-f0-9]{64}$/i.test(storedHex)
  ) {
    return false;
  }

  const storedHash = Buffer.from(storedHex, "hex");

  return (
    storedHash.length === submittedHash.length &&
    timingSafeEqual(storedHash, submittedHash)
  );
}

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// The caller must:
// 1. Start a PostgreSQL transaction.
// 2. Acquire the per-email advisory lock.
// 3. Pass the same transaction client to this function.
export async function createEmailOtp(email, client) {
  const normalizedEmail = normalizeEmail(email);

  if (!client) {
    throw new Error("A transaction client is required.");
  }

  // Ensure a persistent rate-limit record exists.
  await client.query(
    `INSERT INTO email_otp_rate_limits (
       email,
       purpose,
       last_sent_at,
       window_started_at,
       sends_in_window
     )
     VALUES ($1, 'signup', NULL, NOW(), 0)
     ON CONFLICT (email, purpose) DO NOTHING`,
    [normalizedEmail]
  );

  const rateResult = await client.query(
    `SELECT
       last_sent_at,
       window_started_at,
       sends_in_window
     FROM email_otp_rate_limits
     WHERE email = $1 AND purpose = 'signup'
     FOR UPDATE`,
    [normalizedEmail]
  );

  const rate = rateResult.rows[0];

  if (!rate) {
    throw new Error("Unable to read OTP rate-limit record.");
  }

  const now = Date.now();
  const windowStartedAt = new Date(rate.window_started_at).getTime();
  const lastSentAt = rate.last_sent_at
    ? new Date(rate.last_sent_at).getTime()
    : null;

  let sendsInWindow = Number(rate.sends_in_window);

  // Start a new 24-hour window when the previous window expires.
  const windowExpired =
    now - windowStartedAt >= OTP_SEND_WINDOW_HOURS * 60 * 60 * 1000;

  if (windowExpired) {
    sendsInWindow = 0;
  }

  if (
    lastSentAt !== null &&
    now - lastSentAt < OTP_RESEND_COOLDOWN_SECONDS * 1000
  ) {
    throw createHttpError(
      "Please wait before requesting another verification code.",
      429
    );
  }

  if (sendsInWindow >= OTP_SEND_LIMIT) {
    throw createHttpError(
      "The verification email limit has been reached. Please try again later.",
      429
    );
  }

  const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const otpHash = hashOtp(normalizedEmail, otp).toString("hex");

  // Replace any previous signup OTP.
  await client.query(
    `DELETE FROM email_otp_verifications
     WHERE email = $1 AND purpose = 'signup'`,
    [normalizedEmail]
  );

  await client.query(
    `INSERT INTO email_otp_verifications (
       email,
       purpose,
       otp_hash,
       expires_at,
       attempts,
       last_sent_at
     )
     VALUES (
       $1,
       'signup',
       $2,
       NOW() + ($3 * INTERVAL '1 minute'),
       0,
       NOW()
     )`,
    [normalizedEmail, otpHash, OTP_EXPIRY_MINUTES]
  );

  // Persist the cooldown and send count even after the OTP
  // is later consumed or expires.
  await client.query(
    `UPDATE email_otp_rate_limits
     SET last_sent_at = NOW(),
         window_started_at = CASE
           WHEN $2 THEN NOW()
           ELSE window_started_at
         END,
         sends_in_window = $3
     WHERE email = $1 AND purpose = 'signup'`,
    [
      normalizedEmail,
      windowExpired,
      sendsInWindow + 1,
    ]
  );

  return {
    otp,
    expiresInMinutes: OTP_EXPIRY_MINUTES,
  };
}

// Call inside the same transaction that updates the user account.
// The caller must acquire the same per-email advisory lock first.
export async function verifyEmailOtp(email, submittedOtp, client) {
  const normalizedEmail = normalizeEmail(email);

  if (!client) {
    throw new Error("A transaction client is required.");
  }

  if (
    typeof submittedOtp !== "string" ||
    !/^\d{6}$/.test(submittedOtp)
  ) {
    return false;
  }

  const result = await client.query(
    `SELECT id, otp_hash, expires_at, attempts
     FROM email_otp_verifications
     WHERE email = $1 AND purpose = 'signup'
     ORDER BY created_at DESC
     LIMIT 1
     FOR UPDATE`,
    [normalizedEmail]
  );

  const record = result.rows[0];

  if (!record) {
    return false;
  }

  if (
    Number(record.attempts) >= MAX_OTP_ATTEMPTS ||
    new Date(record.expires_at).getTime() <= Date.now()
  ) {
    await client.query(
      "DELETE FROM email_otp_verifications WHERE id = $1",
      [record.id]
    );

    return false;
  }

  const submittedHash = hashOtp(
    normalizedEmail,
    submittedOtp
  );

  if (!hashesMatch(record.otp_hash, submittedHash)) {
    await client.query(
      `UPDATE email_otp_verifications
       SET attempts = attempts + 1
       WHERE id = $1`,
      [record.id]
    );

    return false;
  }

  // The caller must commit this deletion together with the
  // users.is_email_verified update.
  await client.query(
    "DELETE FROM email_otp_verifications WHERE id = $1",
    [record.id]
  );

  return true;
}
