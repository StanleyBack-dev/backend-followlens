import { Inject, Injectable } from "@nestjs/common";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import {
  PROFILE_REPOSITORY,
  type ProfileRepositoryPort,
} from "@/modules/profiles/application/ports/profile-repository.port";
import {
  ProfileAccessService,
  type ProfileOwner,
  type UserProfiles,
} from "@/modules/profiles/application/profile-access.service";

// Create / rename / delete of the user's own Instagram profiles. Each
// operation answers with the refreshed list.
@Injectable()
export class ManageProfilesUseCase {
  constructor(
    @Inject(PROFILE_REPOSITORY)
    private readonly profiles: ProfileRepositoryPort,
    private readonly access: ProfileAccessService,
  ) {}

  async create(owner: ProfileOwner, name: string): Promise<UserProfiles> {
    const { profiles, limit } = await this.access.list(owner);
    if (profiles.length >= limit) {
      throw AppException.from(APP_ERRORS.profiles.limitReached, {
        limit,
        pro: owner.pro,
      });
    }
    await this.profiles.create(owner.id, name);
    return this.access.list(owner);
  }

  async rename(
    owner: ProfileOwner,
    profileId: string,
    name: string,
  ): Promise<UserProfiles> {
    if (!(await this.profiles.rename(owner.id, profileId, name))) {
      throw AppException.from(APP_ERRORS.profiles.notFound, undefined);
    }
    return this.access.list(owner);
  }

  async delete(owner: ProfileOwner, profileId: string): Promise<UserProfiles> {
    const { profiles } = await this.access.list(owner);
    const target = profiles.find((profile) => profile.id === profileId);
    if (!target) {
      throw AppException.from(APP_ERRORS.profiles.notFound, undefined);
    }
    if (target.isDefault) {
      throw AppException.from(
        APP_ERRORS.profiles.cannotDeleteDefault,
        undefined,
      );
    }
    await this.profiles.delete(owner.id, profileId);
    return this.access.list(owner);
  }
}
