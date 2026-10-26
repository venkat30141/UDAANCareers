
import "dotenv/config";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  requireTLS: Number(process.env.SMTP_PORT) === 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail({ to, otp }) {
  if (!process.env.SMTP_FROM) {
    throw new Error("SMTP_FROM is not configured.");
  }

  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Verify your UDAAN Careers email",
    text: [
      "Welcome to UDAAN Careers.",
      "",
      `Your email verification code is: ${otp}`,
      "",
      "This code expires in 10 minutes.",
      "If you did not request this code, you can ignore this email.",
    ].join("\n"),
  });
}
