import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import type {
  ProfileRepositoryPort,
  ProfileView,
} from "@/modules/profiles/application/ports/profile-repository.port";
import { ProfileOrmEntity } from "@/modules/profiles/infrastructure/persistence/typeorm/entities/profile.orm-entity";

@Injectable()
export class ProfileTypeormRepository implements ProfileRepositoryPort {
  constructor(
    @InjectRepository(ProfileOrmEntity)
    private readonly repository: Repository<ProfileOrmEntity>,
  ) {}

  async listByUser(userId: string): Promise<ProfileView[]> {
    const rows = await this.repository.find({
      where: { userId },
      order: { isDefault: "DESC", createdAt: "ASC", id: "ASC" },
    });
    return rows.map(toView);
  }

  async ensureDefault(userId: string, name: string): Promise<void> {
    // Two first requests of a new user may race: the partial unique index
    // lets only one default in, and the loser simply does nothing.
    await this.repository
      .createQueryBuilder()
      .insert()
      .into(ProfileOrmEntity)
      .values({ userId, name, isDefault: true })
      .orIgnore()
      .execute();
  }

  async create(userId: string, name: string): Promise<ProfileView> {
    return toView(
      await this.repository.save(
        this.repository.create({ userId, name, isDefault: false }),
      ),
    );
  }

  async rename(
    userId: string,
    profileId: string,
    name: string,
  ): Promise<ProfileView | null> {
    const row = await this.repository.findOneBy({ id: profileId, userId });
    if (!row) return null;
    row.name = name;
    return toView(await this.repository.save(row));
  }

  async delete(userId: string, profileId: string): Promise<void> {
    await this.repository.delete({ id: profileId, userId, isDefault: false });
  }
}

function toView(row: ProfileOrmEntity): ProfileView {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
  };
}
