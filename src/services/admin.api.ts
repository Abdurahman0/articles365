import { ACCESS_GRANTS, METRICS } from "@/data/access";
import { BOOKS } from "@/data/catalog";
import { ADMIN_SESSIONS } from "@/data/sessions";
import { ADMIN_USERS, getUserById } from "@/data/users";
import { delay } from "@/lib/utils";

export const adminApi = {
  async metrics() {
    await delay(200);
    return METRICS;
  },
  async users() {
    await delay(300);
    return ADMIN_USERS;
  },
  async user(id: string) {
    await delay(200);
    return getUserById(id);
  },
  async books() {
    await delay(300);
    return BOOKS;
  },
  async accessGrants() {
    await delay(250);
    return ACCESS_GRANTS;
  },
  async sessions() {
    await delay(250);
    return ADMIN_SESSIONS;
  },
};
