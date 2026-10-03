import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserRole } from "@/modules/users/domain/enums/user-role.enum";

// Who is an admin by configuration. The master is OWNER_EMAIL (protected from
// demotion); ADMIN_EMALS is an optional comma-separated list of extra bootstrap
// admins. Other admins are promoted through the admin page.
@Injectable()
export class AdminPolicyService {
  constructor(private readonly config: ConfigService) {}

  masterEmail(): string | null {
    const email = (this.config.get<string>("OWNER_EMAIL") ?? "").trim().toLowerCase();
    return email || null;
  }

  isMaster(email: string): boolean {
    const master = this.masterEmail();
    return master !== null && email.trim().toLowerCase() === master;
  }

  private bootstrapAdmins(): Set<string> {
    const extra = (this.config.get<string>("ADMIN_EMAILS") ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const master = this.masterEmail();
    return new Set([...(master ? [master] : []), ...extra]);
  }

  /** Role to force on login, or undefined to keep the stored role. */
  forcedRoleFor(email: string): UserRole | undefined {
    return this.bootstrapAdmins().has(email.trim().toLowerCase())
      ? UserRole.ADMIN
      : undefined;
  }
}
