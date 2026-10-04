import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { RequestUser } from "@/modules/auth/presentation/guards/user-session.guard";
import {
  ProfileAccessService,
  type UserProfiles,
} from "@/modules/profiles/application/profile-access.service";
import { ManageProfilesUseCase } from "@/modules/profiles/application/use-cases/manage-profiles.use-case";
import {
  PROFILE_HEADER,
  profileOwnerOf,
} from "@/modules/profiles/presentation/rest/active-profile";
import { ProfileNameDto } from "@/modules/profiles/presentation/rest/dtos/profile.dtos";

export type UserProfilesResponse = UserProfiles & {
  /** The profile the current selection resolves to. */
  activeId: string;
};

// Self-service: every route acts on the signed-in user's own profiles.
@Controller("profiles")
export class ProfilesController {
  constructor(
    private readonly access: ProfileAccessService,
    private readonly manage: ManageProfilesUseCase,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: RequestUser,
    @Headers(PROFILE_HEADER) selectedId?: string,
  ): Promise<UserProfilesResponse> {
    const owner = profileOwnerOf(user);
    const [profiles, active] = await Promise.all([
      this.access.list(owner),
      this.access.resolve(owner, selectedId),
    ]);
    return { ...profiles, activeId: active.id };
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() body: ProfileNameDto,
  ): Promise<UserProfiles> {
    return this.manage.create(profileOwnerOf(user), body.name);
  }

  @Patch(":id")
  rename(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ProfileNameDto,
  ): Promise<UserProfiles> {
    return this.manage.rename(profileOwnerOf(user), id, body.name);
  }

  @Delete(":id")
  remove(
    @CurrentUser() user: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<UserProfiles> {
    return this.manage.delete(profileOwnerOf(user), id);
  }
}
