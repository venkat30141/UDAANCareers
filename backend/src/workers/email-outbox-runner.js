
import "dotenv/config";
import { pool } from "../config/db.js";
import {
  processNextEmailJob,
  recoverStaleEmailJobs,
} from "../services/email-outbox.worker.js";

const POLL_INTERVAL_MS = 2000;
const RECOVERY_INTERVAL_MS = 60_000;

let stopping = false;
let lastRecoveryAt = 0;

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log("Email outbox runner started.");

  while (!stopping) {
    try {
      if (Date.now() - lastRecoveryAt >= RECOVERY_INTERVAL_MS) {
        await recoverStaleEmailJobs();
        lastRecoveryAt = Date.now();
      }

      const processed = await processNextEmailJob();

      if (!processed) {
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (error) {
      // Do not log secrets, email payloads, or raw error objects.
      console.error("Email outbox runner encountered an error.", {
        errorCode:
          typeof error.code === "string" &&
          /^[A-Z0-9_]{1,40}$/.test(error.code)
            ? error.code
            : "WORKER_ERROR",
      });

      await sleep(POLL_INTERVAL_MS);
    }
  }

  await pool.end();
  console.log("Email outbox runner stopped.");
}

function shutdown() {
  if (stopping) return;
  stopping = true;
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run().catch(async () => {
  console.error("Email outbox runner could not start.");
  await pool.end();
  process.exitCode = 1;
});
