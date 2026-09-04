import { ADMIN_USER, CURRENT_USER } from "@/data/users";
import { SESSIONS } from "@/data/sessions";
import { delay } from "@/lib/utils";
import type { Session, User } from "@/types";

export const authApi = {
  async login(identifier: string, _password: string): Promise<User> {
    void _password;
    await delay(600);
    if (!identifier.trim()) throw new Error("Enter your email or phone.");
    return identifier.toLowerCase().startsWith("admin")
      ? ADMIN_USER
      : CURRENT_USER;
  },
  async register(fullName: string): Promise<User> {
    await delay(700);
    return { ...CURRENT_USER, fullName: fullName || CURRENT_USER.fullName };
  },
  async me(): Promise<User> {
    await delay(150);
    return CURRENT_USER;
  },
  async sessions(): Promise<Session[]> {
    await delay(250);
    return SESSIONS;
  },
};
