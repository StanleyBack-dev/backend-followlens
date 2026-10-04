import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { PaginationQueryDto } from "@/common/dtos/pagination-query.dto";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";
import type { ImportView } from "@/modules/imports/application/ports/import-repository.port";
import {
  GetImportStatusUseCase,
  type ImportStatusView,
} from "@/modules/imports/application/use-cases/get-import-status.use-case";
import {
  ImportFollowersExportUseCase,
  type ImportResult,
} from "@/modules/imports/application/use-cases/import-followers-export.use-case";
import { ListImportsUseCase } from "@/modules/imports/application/use-cases/list-imports.use-case";
import type { RequestUser } from "@/modules/auth/presentation/guards/user-session.guard";
import { ProfileAccessService } from "@/modules/profiles/application/profile-access.service";
import {
  PROFILE_HEADER,
  profileOwnerOf,
} from "@/modules/profiles/presentation/rest/active-profile";
import { hasProAccess } from "@/modules/users/domain/plan-access";
import type { Paginated } from "@/shared/application/pagination";

// The upload arrives as raw bytes (configured in configure-app). The BFF sends
// the original name in `x-filename`.
@Controller("imports")
export class ImportsController {
  constructor(
    private readonly importExport: ImportFollowersExportUseCase,
    private readonly getStatus: GetImportStatusUseCase,
    private readonly listImports: ListImportsUseCase,
    private readonly profiles: ProfileAccessService,
  ) {}

  @Get("status")
  async status(
    @CurrentUser() user: RequestUser,
    @Headers(PROFILE_HEADER) profileId?: string,
  ): Promise<ImportStatusView> {
    return this.getStatus.execute({
      id: await this.profileOf(user, profileId),
      pro: hasProAccess(user),
    });
  }

  @Post("upload")
  @HttpCode(HttpStatus.OK)
  async upload(
    @CurrentUser() user: RequestUser,
    @Req() request: Request,
    @Headers("x-filename") filename?: string,
    @Headers(PROFILE_HEADER) profileId?: string,
  ): Promise<ImportResult> {
    const body = request.body as unknown;
    if (!Buffer.isBuffer(body) || body.byteLength === 0) {
      throw AppException.from(APP_ERRORS.imports.invalidFile, undefined);
    }
    return this.importExport.execute(
      {
        profileId: await this.profileOf(user, profileId),
        email: user.email,
        pro: hasProAccess(user),
      },
      { filename: sanitizeFilename(filename), buffer: body },
    );
  }

  @Get()
  async list(
    @CurrentUser() user: RequestUser,
    @Query() query: PaginationQueryDto,
    @Headers(PROFILE_HEADER) profileId?: string,
  ): Promise<Paginated<ImportView>> {
    return this.listImports.execute(
      await this.profileOf(user, profileId),
      query,
    );
  }

  /** Id of the profile this request acts on (the selected one, or the default). */
  private async profileOf(
    user: RequestUser,
    selectedId: string | undefined,
  ): Promise<string> {
    return (await this.profiles.resolve(profileOwnerOf(user), selectedId)).id;
  }
}

function sanitizeFilename(filename: string | undefined): string {
  const name = (filename ?? "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 160);
  return name || "export";
}
