import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, LessThanOrEqual, type Repository } from "typeorm";
import type {
  AdminUserView,
  ListUsersFilters,
  UpsertGoogleUserInput,
  UserCounts,
  UserRepositoryPort,
  UserView,
} from "@/modules/users/application/ports/user-repository.port";
import { UserPlan } from "@/modules/users/domain/enums/user-plan.enum";
import { UserRole } from "@/modules/users/domain/enums/user-role.enum";
import { UserOrmEntity } from "@/modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity";
import { paginate, type Paginated } from "@/shared/application/pagination";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class UserTypeormRepository implements UserRepositoryPort {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repository: Repository<UserOrmEntity>,
  ) {}

  async findById(id: string): Promise<UserView | null> {
    // A stale token from an older auth scheme can carry a non-uuid subject;
    // Postgres would throw on it, so reject it as "no user" (→ 401 → re-login).
    if (!UUID.test(id)) return null;
    const row = await this.repository.findOneBy({ id });
    return row ? toView(row) : null;
  }

  async findByEmail(email: string): Promise<UserView | null> {
    const row = await this.repository.findOneBy({
      email: email.trim().toLowerCase(),
    });
    return row ? toView(row) : null;
  }

  async findByIds(ids: string[]): Promise<UserView[]> {
    const valid = ids.filter((id) => UUID.test(id));
    if (valid.length === 0) return [];
    return (await this.repository.findBy({ id: In(valid) })).map(toView);
  }

  async upsertFromGoogle(
    input: UpsertGoogleUserInput,
    now: Date,
  ): Promise<{ user: UserView; created: boolean }> {
    const existing =
      (await this.repository.findOneBy({ googleId: input.googleId })) ??
      (await this.repository.findOneBy({ email: input.email }));

    if (existing) {
      existing.googleId = input.googleId;
      existing.email = input.email;
      // The name is user-editable after sign-up, so Google must not overwrite it.
      existing.pictureUrl = input.pictureUrl;
      existing.lastLoginAt = now;
      // Only ever auto-promote (the master email); never auto-demote an admin
      // that was granted through the admin page.
      if (input.forcedRole === UserRole.ADMIN) existing.role = UserRole.ADMIN;
      return {
        user: toView(await this.repository.save(existing)),
        created: false,
      };
    }

    const created = this.repository.create({
      googleId: input.googleId,
      email: input.email,
      name: input.name,
      pictureUrl: input.pictureUrl,
      plan: UserPlan.FREE,
      role: input.forcedRole ?? UserRole.USER,
      termsVersion: null,
      termsAcceptedAt: null,
      lastLoginAt: now,
    });
    return { user: toView(await this.repository.save(created)), created: true };
  }

  async acceptTerms(userId: string, version: string, at: Date): Promise<void> {
    await this.repository.update(
      { id: userId },
      { termsVersion: version, termsAcceptedAt: at },
    );
  }

  async updateName(userId: string, name: string): Promise<void> {
    await this.repository.update({ id: userId }, { name });
  }

  async scheduleDeletion(
    userId: string,
    requestedAt: Date,
    scheduledFor: Date,
  ): Promise<void> {
    await this.repository.update(
      { id: userId },
      { deletionRequestedAt: requestedAt, deletionScheduledFor: scheduledFor },
    );
  }

  async cancelDeletion(userId: string): Promise<void> {
    await this.repository.update(
      { id: userId },
      { deletionRequestedAt: null, deletionScheduledFor: null },
    );
  }

  async purgeDueForDeletion(now: Date): Promise<number> {
    // Followers, events and imports go with the row (ON DELETE CASCADE).
    const result = await this.repository.delete({
      deletionScheduledFor: LessThanOrEqual(now),
    });
    return result.affected ?? 0;
  }

  async list(filters: ListUsersFilters): Promise<Paginated<AdminUserView>> {
    const query = this.repository.createQueryBuilder("u");
    if (filters.search) {
      query.andWhere("(u.email ILIKE :s OR u.name ILIKE :s)", {
        s: `%${filters.search.replace(/[%_\\]/g, "\\$&")}%`,
      });
    }
    if (filters.role) {
      query.andWhere("u.role = :role", { role: filters.role });
    }
    const [rows, total] = await query
      .orderBy("u.created_at", "DESC")
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();
    return paginate(rows.map(toAdminView), total, filters);
  }

  async counts(activeSince: Date): Promise<UserCounts> {
    const total = await this.repository.count();
    const admins = await this.repository.countBy({ role: UserRole.ADMIN });
    const activeLast30Days = await this.repository
      .createQueryBuilder("u")
      .where("u.last_login_at >= :since", { since: activeSince })
      .getCount();
    const pro = await this.repository.countBy({ plan: UserPlan.PRO });
    return { total, admins, pro, activeLast30Days };
  }

  async updateAccess(
    userId: string,
    changes: { role?: UserRole; plan?: UserPlan },
  ): Promise<AdminUserView | null> {
    if (!UUID.test(userId)) return null;
    const row = await this.repository.findOneBy({ id: userId });
    if (!row) return null;
    if (changes.role) row.role = changes.role;
    if (changes.plan) row.plan = changes.plan;
    return toAdminView(await this.repository.save(row));
  }
}

function toView(row: UserOrmEntity): UserView {
  return {
    id: row.id,
    googleId: row.googleId,
    email: row.email,
    name: row.name,
    pictureUrl: row.pictureUrl,
    plan: row.plan,
    role: row.role,
    termsVersion: row.termsVersion,
    termsAcceptedAt: row.termsAcceptedAt,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    deletionRequestedAt: row.deletionRequestedAt,
    deletionScheduledFor: row.deletionScheduledFor,
  };
}

function toAdminView(row: UserOrmEntity): AdminUserView {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    pictureUrl: row.pictureUrl,
    plan: row.plan,
    role: row.role,
    termsAccepted: row.termsVersion !== null,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
  };
}
