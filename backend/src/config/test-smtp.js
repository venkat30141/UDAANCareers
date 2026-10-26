
import "dotenv/config";
import nodemailer from "nodemailer";

const requiredVariables = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
];

const missingVariables = requiredVariables.filter(
  (name) => !process.env[name]?.trim()
);

if (missingVariables.length > 0) {
  console.error(
    "Missing required environment variables:",
    missingVariables.join(", ")
  );
  process.exitCode = 1;
} else {
  const port = Number(process.env.SMTP_PORT);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error("SMTP_PORT must be a valid port number.");
    process.exitCode = 1;
  } else {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      logger: false,
      debug: false,
    });

    try {
      await transporter.verify();
      console.log(
        "SMTP verification successful. Connection and authentication passed."
      );
    } catch (error) {
      // Print only a non-sensitive error code, never credentials or raw errors.
      const safeCode =
        typeof error.code === "string" &&
        /^[A-Z0-9_]{1,40}$/.test(error.code)
          ? error.code
          : "UNKNOWN";

      console.error("SMTP verification failed. Error code:", safeCode);
      console.error(
        "Check your local SMTP settings and Gmail App Password."
      );
      process.exitCode = 1;
    } finally {
      transporter.close();
    }
  }
}
