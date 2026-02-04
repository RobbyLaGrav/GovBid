import crypto from "node:crypto";

export interface HashResult {
  hash: string;
  salt: string;
  iterations: number;
}

const DEFAULT_ITERATIONS = 120000;
const KEY_LENGTH = 64;

export const hashPassword = (password: string, salt?: string, iterations = DEFAULT_ITERATIONS): HashResult => {
  const actualSalt = salt ?? crypto.randomBytes(16).toString("hex");
  const derived = crypto.pbkdf2Sync(password, actualSalt, iterations, KEY_LENGTH, "sha512");
  return {
    hash: derived.toString("hex"),
    salt: actualSalt,
    iterations
  };
};

export const verifyPassword = (password: string, result: HashResult): boolean => {
  const derived = crypto.pbkdf2Sync(password, result.salt, result.iterations, KEY_LENGTH, "sha512");
  return crypto.timingSafeEqual(Buffer.from(result.hash, "hex"), derived);
};

export const encrypt = (value: string, secret: string): string => {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash("sha256").update(secret).digest();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
};

export const decrypt = (payload: string, secret: string): string => {
  const [ivHex, tagHex, dataHex] = payload.split(".");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid payload");
  }
  const key = crypto.createHash("sha256").update(secret).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
};
