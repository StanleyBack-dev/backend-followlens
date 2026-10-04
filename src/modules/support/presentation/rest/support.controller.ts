import { Body, Controller, Get, Post } from "@nestjs/common";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { RequestUser } from "@/modules/auth/presentation/guards/user-session.guard";
import {
  SendSupportMessageUseCase,
  type SentSupportMessage,
  type SupportMessageStatus,
} from "@/modules/support/application/use-cases/send-support-message.use-case";
import { SendSupportMessageDto } from "@/modules/support/presentation/rest/dtos/support.dtos";

// The user's side of support: send a message and know when another is allowed.
@Controller("support")
export class SupportController {
  constructor(private readonly sendMessage: SendSupportMessageUseCase) {}

  @Get("status")
  status(@CurrentUser() user: RequestUser): Promise<SupportMessageStatus> {
    return this.sendMessage.status(user.id);
  }

  @Post("messages")
  send(
    @CurrentUser() user: RequestUser,
    @Body() body: SendSupportMessageDto,
  ): Promise<SentSupportMessage> {
    return this.sendMessage.execute(user.id, body);
  }
}
