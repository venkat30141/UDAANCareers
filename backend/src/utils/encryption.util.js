
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

function getEncryptionKey() {
  const keyHex = process.env.EMAIL_ENCRYPTION_KEY;

  if (!keyHex || !/^[a-f0-9]{64}$/i.test(keyHex)) {
    throw new Error(
      "EMAIL_ENCRYPTION_KEY must be a 32-byte hexadecimal key."
    );
  }

  return Buffer.from(keyHex, "hex");
}

export function encryptText(plainText) {
  const key = getEncryptionKey();
  const iv = randomBytes(12);

  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Versioned format: v1:IV:AUTH_TAG:CIPHERTEXT
  return [
    "v1",
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decryptText(encryptedPayload) {
  const parts = encryptedPayload.split(":");

  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted payload format.");
  }

  const [, ivHex, tagHex, ciphertextHex] = parts;

  if (
    !/^[a-f0-9]{24}$/i.test(ivHex) ||
    !/^[a-f0-9]{32}$/i.test(tagHex) ||
    !/^(?:[a-f0-9]{2})*$/i.test(ciphertextHex)
  ) {
    throw new Error("Invalid encrypted payload encoding.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
