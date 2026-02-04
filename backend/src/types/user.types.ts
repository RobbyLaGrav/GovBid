import { RoleName } from "../utils/constants.js";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: RoleName;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: RoleName;
  exp: number;
  iat: number;
  iss: string;
}
