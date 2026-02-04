import type { UserProfile } from "./user.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}
