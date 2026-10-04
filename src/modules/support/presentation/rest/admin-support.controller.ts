import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { AdminGuard } from "@/common/security/admin.guard";
import type { RequestUser } from "@/modules/auth/presentation/guards/user-session.guard";
import type { SupportTicketDetails } from "@/modules/support/application/support-ticket-details";
import { ManageSupportTicketsUseCase } from "@/modules/support/application/use-cases/manage-support-tickets.use-case";
import {
  ListSupportTicketsQueryDto,
  ReplyToSupportTicketDto,
} from "@/modules/support/presentation/rest/dtos/support.dtos";
import type { Paginated } from "@/shared/application/pagination";

// Admin-only. UserSessionGuard runs first (global), then AdminGuard here.
@UseGuards(AdminGuard)
@Controller("admin/support/tickets")
export class AdminSupportController {
  constructor(private readonly tickets: ManageSupportTicketsUseCase) {}

  @Get()
  list(
    @Query() query: ListSupportTicketsQueryDto,
  ): Promise<Paginated<SupportTicketDetails>> {
    return this.tickets.list(query);
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string): Promise<SupportTicketDetails> {
    return this.tickets.get(id);
  }

  @Post(":id/reply")
  @HttpCode(HttpStatus.OK)
  reply(
    @CurrentUser() admin: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: ReplyToSupportTicketDto,
  ): Promise<SupportTicketDetails> {
    return this.tickets.reply(admin.id, id, body.reply);
  }

  @Post(":id/finalize")
  @HttpCode(HttpStatus.OK)
  finalize(
    @CurrentUser() admin: RequestUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<SupportTicketDetails> {
    return this.tickets.finalize(admin.id, id);
  }
}
