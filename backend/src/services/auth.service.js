
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import { sendOtpEmail } from "./email.service.js";
import {
  createEmailOtp,
  verifyEmailOtp,
} from "./otp.service.js";

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

// ============================================================
// REGISTER USER AND SEND EMAIL VERIFICATION OTP
// ============================================================


export async function registerUser({
  fullName,
  email,
  password,
  role = "job_seeker",
}) {
  // Only allow public registration for these two roles.
  if (!["job_seeker", "employer"].includes(role)) {
    throw createHttpError("Invalid registration role.", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);

  const client = await pool.connect();
  let user;
  let otp;

  try {
    await client.query("BEGIN");

    // Serialize registration and OTP operations for this email.
    await client.query(
      `SELECT pg_advisory_xact_lock(
         hashtextextended($1, 0)
       )`,
      [normalizedEmail + ":signup"]
    );

    const existingUser = await client.query(
      `SELECT id, is_email_verified
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      throw createHttpError(
        "An account with this email already exists.",
        409
      );
    }

    // Insert the requested, validated registration role.
    const userResult = await client.query(
      `INSERT INTO users (
         full_name,
         email,
         password_hash,
         role,
         is_email_verified
       )
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING
         id,
         full_name,
         email,
         role,
         is_email_verified,
         created_at`,
      [fullName, normalizedEmail, passwordHash, role]
    );

    user = userResult.rows[0];

    // Keep the existing OTP workflow unchanged.
    const otpResult = await createEmailOtp(
      normalizedEmail,
      client
    );

    otp = otpResult.otp;

    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The transaction may already have been rolled back.
    }

    if (error.code === "23505") {
      throw createHttpError(
        "An account with this email already exists.",
        409
      );
    }

    throw error;
  } finally {
    client.release();
  }

  // Do not return the OTP in the API response.
  try {
    await sendOtpEmail({
      to: normalizedEmail,
      otp,
    });
  } catch (error) {
    // Remove the undelivered OTP. Keep the account unverified.
    const cleanupClient = await pool.connect();

    try {
      await cleanupClient.query(
        `DELETE FROM email_otp_verifications
         WHERE email = $1
           AND purpose = 'signup'`,
        [normalizedEmail]
      );
    } catch (cleanupError) {
      console.error(
        "Failed to clean up undelivered OTP:",
        cleanupError.message
      );
    } finally {
      cleanupClient.release();
    }

    console.error(
      "Verification email delivery failed:",
      error.code || "UNKNOWN"
    );

    throw createHttpError(
      "Unable to send the verification email. Please try again later.",
      503
    );
  }

  return {
    ...user,
    message: "Account created. Check your email for the verification code.",
  };
}


// ============================================================
// VERIFY EMAIL OTP
// ============================================================

export async function verifyUserEmail({ email, otp }) {
  const normalizedEmail = email.trim().toLowerCase();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `SELECT pg_advisory_xact_lock(
         hashtextextended($1, 0)
       )`,
      [normalizedEmail + ":signup"]
    );

    const userResult = await client.query(
      `SELECT id, is_email_verified
       FROM users
       WHERE email = $1
       FOR UPDATE`,
      [normalizedEmail]
    );

    const user = userResult.rows[0];

    if (!user) {
      throw createHttpError(
        "Invalid or expired verification code.",
        400
      );
    }

    if (user.is_email_verified) {
      throw createHttpError(
        "This email address is already verified.",
        409
      );
    }

    const isValid = await verifyEmailOtp(
      normalizedEmail,
      otp,
      client
    );

    if (!isValid) {
      // Commit the failed-attempt counter or expired-OTP deletion.
      await client.query("COMMIT");

      throw createHttpError(
        "Invalid or expired verification code.",
        400
      );
    }

    await client.query(
      `UPDATE users
       SET is_email_verified = TRUE,
           updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    await client.query("COMMIT");

    return {
      email: normalizedEmail,
      isEmailVerified: true,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The transaction may already have been committed.
    }

    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// LOGIN USER
// ============================================================

export async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await pool.query(
    `SELECT
       id,
       full_name,
       email,
       password_hash,
       role,
       is_email_verified,
       is_active
     FROM users
     WHERE email = $1`,
    [normalizedEmail]
  );

  const user = result.rows[0];

  if (!user) {
    throw createHttpError("Invalid email or password.", 401);
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatches) {
    throw createHttpError("Invalid email or password.", 401);
  }

  if (!user.is_active) {
    throw createHttpError("This account is inactive.", 403);
  }

  if (!user.is_email_verified) {
    throw createHttpError(
      "Please verify your email before logging in.",
      403
    );
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  const token = jwt.sign(
    {
      sub: String(user.id),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      issuer: "udaan-careers-api",
      audience: "udaan-careers-client",
    }
  );

  await pool.query(
    `UPDATE users
     SET login_count = login_count + 1,
         last_login_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [user.id]
  );

  const {
    password_hash,
    ...safeUser
  } = user;

  return {
    user: safeUser,
    token,
  };
}
