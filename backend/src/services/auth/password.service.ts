import { hashPassword, verifyPassword, HashResult } from "../../utils/encryption.js";

export interface PasswordRecord extends HashResult {
  version: string;
}

export const createPasswordRecord = (password: string): PasswordRecord => {
  const { hash, salt, iterations } = hashPassword(password);
  return {
    hash,
    salt,
    iterations,
    version: "pbkdf2-sha512"
  };
};

export const validatePassword = (password: string, record: PasswordRecord): boolean => {
  return verifyPassword(password, record);
};
