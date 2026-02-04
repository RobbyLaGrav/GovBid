import type { Request, Response } from "express";
import { validationError } from "../utils/errors.js";
import { createPasswordRecord, validatePassword } from "../services/auth/password.service.js";
import { createToken } from "../services/auth/jwt.service.js";
import { UserCredentials, UserProfile } from "../types/user.types.js";

const mockUsers: (UserProfile & { password: ReturnType<typeof createPasswordRecord> })[] = [];

const findUser = (email: string) => mockUsers.find((user) => user.email === email);

export const register = (req: Request, res: Response) => {
  const payload = req.body as UserCredentials & { name?: string };
  if (!payload.email || !payload.password) {
    throw validationError("Email and password are required");
  }
  if (findUser(payload.email)) {
    throw validationError("User already exists");
  }

  const record = createPasswordRecord(payload.password);
  const now = new Date().toISOString();
  const user: UserProfile & { password: typeof record } = {
    id: `user_${mockUsers.length + 1}`,
    email: payload.email,
    name: payload.name ?? payload.email.split("@")[0],
    role: "manager",
    createdAt: now,
    updatedAt: now,
    isActive: true,
    password: record
  };
  mockUsers.push(user);

  res.status(201).json({ data: { id: user.id, email: user.email, name: user.name } });
};

export const login = (req: Request, res: Response) => {
  const payload = req.body as UserCredentials;
  if (!payload.email || !payload.password) {
    throw validationError("Email and password are required");
  }

  const user = findUser(payload.email);
  if (!user || !validatePassword(payload.password, user.password)) {
    throw validationError("Invalid credentials");
  }

  const secret = process.env.JWT_SECRET ?? "dev-secret";
  const token = createToken(
    { sub: user.id, email: user.email, role: user.role },
    secret
  );

  res.status(200).json({
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }
  });
};
