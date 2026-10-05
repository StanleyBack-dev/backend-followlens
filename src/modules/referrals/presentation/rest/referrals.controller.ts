import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import { Matches } from "class-validator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Public } from "@/common/decorators/public.decorator";
import type { RequestUser } from "@/modules/auth/presentation/guards/user-session.guard";
import {
  type ReferralOverview,
  ReferralsService,
} from "@/modules/referrals/application/referrals.service";

export class ReferralClickDto {
  @Matches(/^[A-Z0-9]{6,12}$/)
  code!: string;
}

@Controller("referrals")
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  // The signed-in user's own code, friends, clicks and rewards.
  @Get()
  overview(@CurrentUser() user: RequestUser): Promise<ReferralOverview> {
    return this.referrals.overview(user.id);
  }

  // Sent by the BFF when a visitor opens a referral link; there is no session
  // yet, so only the internal key guards it.
  @Public()
  @Post("clicks")
  @HttpCode(HttpStatus.NO_CONTENT)
  async click(@Body() body: ReferralClickDto): Promise<void> {
    await this.referrals.recordClick(body.code);
  }
}
