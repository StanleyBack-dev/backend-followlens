import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "@/common/security/admin.guard";
import type { AdminUserRow } from "@/modules/admin/application/list-users.use-case";
import { GetAdminOverviewUseCase } from "@/modules/admin/application/get-admin-overview.use-case";
import { ListUsersUseCase } from "@/modules/admin/application/list-users.use-case";
import { UpdateUserAccessUseCase } from "@/modules/admin/application/update-user-access.use-case";
import {
  ListUsersQueryDto,
  UpdateUserAccessDto,
} from "@/modules/admin/presentation/rest/dtos/admin.dtos";
import type { UserCounts } from "@/modules/users/application/ports/user-repository.port";
import type { Paginated } from "@/shared/application/pagination";

// Admin-only. UserSessionGuard runs first (global), then AdminGuard here.
@UseGuards(AdminGuard)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly overview: GetAdminOverviewUseCase,
    private readonly updateAccess: UpdateUserAccessUseCase,
  ) {}

  @Get("overview")
  getOverview(): Promise<UserCounts> {
    return this.overview.execute();
  }

  @Get("users")
  users(@Query() query: ListUsersQueryDto): Promise<Paginated<AdminUserRow>> {
    return this.listUsers.execute(query);
  }

  @Patch("users/:id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: UpdateUserAccessDto,
  ): Promise<AdminUserRow> {
    return this.updateAccess.execute(id, body);
  }
}
