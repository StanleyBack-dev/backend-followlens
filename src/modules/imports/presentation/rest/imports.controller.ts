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
import type { Paginated } from "@/shared/application/pagination";

// The upload arrives as raw bytes (configured in configure-app). The BFF sends
// the original name in `x-filename`.
@Controller("imports")
export class ImportsController {
  constructor(
    private readonly importExport: ImportFollowersExportUseCase,
    private readonly getStatus: GetImportStatusUseCase,
    private readonly listImports: ListImportsUseCase,
  ) {}

  @Get("status")
  status(@CurrentUser() user: RequestUser): Promise<ImportStatusView> {
    return this.getStatus.execute(user.id);
  }

  @Post("upload")
  @HttpCode(HttpStatus.OK)
  upload(
    @CurrentUser() user: RequestUser,
    @Req() request: Request,
    @Headers("x-filename") filename?: string,
  ): Promise<ImportResult> {
    const body = request.body as unknown;
    if (!Buffer.isBuffer(body) || body.byteLength === 0) {
      throw AppException.from(APP_ERRORS.imports.invalidFile, undefined);
    }
    return this.importExport.execute(
      { id: user.id, email: user.email },
      { filename: sanitizeFilename(filename), buffer: body },
    );
  }

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<ImportView>> {
    return this.listImports.execute(user.id, query);
  }
}

function sanitizeFilename(filename: string | undefined): string {
  const name = (filename ?? "").replace(/[^A-Za-z0-9._-]/g, "").slice(0, 160);
  return name || "export";
}
