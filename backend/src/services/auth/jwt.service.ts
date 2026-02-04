import crypto from "node:crypto";
import { AuthTokenPayload } from "../../types/user.types.js";
import { TOKEN_ISSUER } from "../../utils/constants.js";

const base64Url = (value: string | Buffer): string =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const sign = (payload: string, secret: string): string => {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
};

export const createToken = (payload: Omit<AuthTokenPayload, "iat" | "exp" | "iss">, secret: string, ttlSeconds = 3600): string => {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body: AuthTokenPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
    iss: TOKEN_ISSUER
  };
  const encodedPayload = base64Url(JSON.stringify(body));
  const signature = sign(`${header}.${encodedPayload}`, secret);
  return `${header}.${encodedPayload}.${signature}`;
};

export const verifyToken = (token: string, secret: string): AuthTokenPayload | null => {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;
  const expected = sign(`${header}.${payload}`, secret);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }
  const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as AuthTokenPayload;
  if (decoded.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return decoded;
};
