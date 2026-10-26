
import "dotenv/config";
import { pool } from "../config/db.js";
import { decryptText } from "../utils/encryption.util.js";
import { sendOtpEmail } from "./email.service.js";

const MAX_DELIVERY_ATTEMPTS = 5;
const STALE_JOB_MINUTES = 5;

function retryDelaySeconds(attempts) {
  // Exponential backoff: 30s, 60s, 120s, 240s, capped at 15 minutes.
  return Math.min(30 * 2 ** Math.max(attempts - 1, 0), 900);
}

/**
 * Recover jobs left in processing after a worker crash.
 * Jobs that have exhausted their attempts are marked failed.
 */
export async function recoverStaleEmailJobs() {
  const result = await pool.query(
    `UPDATE email_outbox
     SET status = CASE
                    WHEN attempts >= $2 THEN 'failed'
                    ELSE 'pending'
                  END,
         next_attempt_at = NOW(),
         processing_started_at = NULL,
         last_error_code = 'STALE_JOB_RECOVERED'
     WHERE status = 'processing'
       AND processing_started_at <
           NOW() - ($1 * INTERVAL '1 minute')
     RETURNING id, status`,
    [STALE_JOB_MINUTES, MAX_DELIVERY_ATTEMPTS]
  );

  if (result.rowCount > 0) {
    console.log("Recovered stale email jobs.", {
      count: result.rowCount,
    });
  }

  return result.rowCount;
}

export async function processNextEmailJob() {
  const client = await pool.connect();
  let job;

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `WITH next_job AS (
         SELECT id
         FROM email_outbox
         WHERE status = 'pending'
           AND next_attempt_at <= NOW()
         ORDER BY id
         FOR UPDATE SKIP LOCKED
         LIMIT 1
       )
       UPDATE email_outbox AS job
       SET status = 'processing',
           attempts = job.attempts + 1,
           processing_started_at = NOW()
       FROM next_job
       WHERE job.id = next_job.id
       RETURNING
         job.id,
         job.recipient_email,
         job.encrypted_payload,
         job.attempts`,
    );

    job = result.rows[0];

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  if (!job) {
    return false;
  }

  try {
    const payload = JSON.parse(
      decryptText(job.encrypted_payload)
    );

    if (
      typeof payload.otp !== "string" ||
      !/^\d{6}$/.test(payload.otp)
    ) {
      throw new Error("Invalid email payload.");
    }

    await sendOtpEmail({
      to: job.recipient_email,
      otp: payload.otp,
    });

    await pool.query(
      `UPDATE email_outbox
       SET status = 'sent',
           sent_at = NOW(),
           processing_started_at = NULL,
           last_error_code = NULL
       WHERE id = $1
         AND status = 'processing'`,
      [job.id]
    );
  } catch (error) {
    const failedPermanently =
      job.attempts >= MAX_DELIVERY_ATTEMPTS;

    const delaySeconds = retryDelaySeconds(job.attempts);

    const safeCode =
      typeof error.code === "string" &&
      /^[A-Z0-9_]{1,40}$/.test(error.code)
        ? error.code
        : "DELIVERY_FAILED";

    await pool.query(
      `UPDATE email_outbox
       SET status = $2,
           next_attempt_at = NOW() + ($3 * INTERVAL '1 second'),
           processing_started_at = NULL,
           last_error_code = $4
       WHERE id = $1
         AND status = 'processing'`,
      [
        job.id,
        failedPermanently ? "failed" : "pending",
        delaySeconds,
        safeCode,
      ]
    );

    // Never log OTPs, payloads, or raw error objects.
    console.error("Email delivery failed.", {
      jobId: job.id,
      errorCode: safeCode,
      willRetry: !failedPermanently,
    });
  }

  return true;
}
