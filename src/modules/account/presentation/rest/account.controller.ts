import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from "@nestjs/common";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { AccountProfile } from "@/modules/account/application/account-profile";
import { CancelAccountDeletionUseCase } from "@/modules/account/application/use-cases/cancel-account-deletion.use-case";
import { GetAccountProfileUseCase } from "@/modules/account/application/use-cases/get-account-profile.use-case";
import {
  RequestAccountDeletionUseCase,
  type RequestAccountDeletionResult,
} from "@/modules/account/application/use-cases/request-account-deletion.use-case";
import { UpdateAccountProfileUseCase } from "@/modules/account/application/use-cases/update-account-profile.use-case";
import {
  RequestAccountDeletionDto,
  UpdateAccountProfileDto,
} from "@/modules/account/presentation/rest/dtos/account.dtos";
import type { RequestUser } from "@/modules/auth/presentation/guards/user-session.guard";

// Self-service: every route acts on the signed-in user only.
@Controller("account")
export class AccountController {
  constructor(
    private readonly getProfile: GetAccountProfileUseCase,
    private readonly updateProfile: UpdateAccountProfileUseCase,
    private readonly requestDeletion: RequestAccountDeletionUseCase,
    private readonly cancelDeletion: CancelAccountDeletionUseCase,
  ) {}

  @Get()
  profile(@CurrentUser() user: RequestUser): Promise<AccountProfile> {
    return this.getProfile.execute(user.id);
  }

  @Patch()
  update(
    @CurrentUser() user: RequestUser,
    @Body() body: UpdateAccountProfileDto,
  ): Promise<AccountProfile> {
    return this.updateProfile.execute(user.id, body);
  }

  @Post("deletion")
  @HttpCode(HttpStatus.OK)
  scheduleDeletion(
    @CurrentUser() user: RequestUser,
    @Body() body: RequestAccountDeletionDto,
  ): Promise<RequestAccountDeletionResult> {
    return this.requestDeletion.execute(user.id, body);
  }

  @Delete("deletion")
  undoDeletion(@CurrentUser() user: RequestUser): Promise<AccountProfile> {
    return this.cancelDeletion.execute(user.id);
  }
}
