import { Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Public } from "@/common/decorators/public.decorator";
import { AcceptLegalUseCase } from "@/modules/legal/application/use-cases/accept-legal.use-case";
import { CURRENT_LEGAL_VERSION } from "@/modules/legal/domain/legal-version.constant";
import type { RequestUser } from "@/modules/auth/presentation/guards/user-session.guard";

@Controller("legal")
export class LegalController {
  constructor(private readonly acceptLegal: AcceptLegalUseCase) {}

  // Open: the public pages need the current version to show.
  @Public()
  @Get("version")
  version(): { version: string } {
    return { version: CURRENT_LEGAL_VERSION };
  }

  @Post("accept")
  @HttpCode(HttpStatus.OK)
  accept(@CurrentUser() user: RequestUser) {
    return this.acceptLegal.execute(user.id);
  }
}
