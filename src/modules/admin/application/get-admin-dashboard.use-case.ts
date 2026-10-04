import { Injectable } from "@nestjs/common";
import { GetAdminOverviewUseCase } from "@/modules/admin/application/get-admin-overview.use-case";
import {
  AdminSubscriptionsQuery,
  type SubscriptionsOverview,
} from "@/modules/billing/application/admin-subscriptions.query";
import { ManageSupportTicketsUseCase } from "@/modules/support/application/use-cases/manage-support-tickets.use-case";
import type { UserCounts } from "@/modules/users/application/ports/user-repository.port";

export type AdminDashboard = {
  users: UserCounts;
  subscriptions: SubscriptionsOverview;
  support: { openTickets: number };
};

// The admin home: one call gathering the numbers of each context.
@Injectable()
export class GetAdminDashboardUseCase {
  constructor(
    private readonly userCounts: GetAdminOverviewUseCase,
    private readonly subscriptions: AdminSubscriptionsQuery,
    private readonly support: ManageSupportTicketsUseCase,
  ) {}

  async execute(): Promise<AdminDashboard> {
    const [users, subscriptions, openTickets] = await Promise.all([
      this.userCounts.execute(),
      this.subscriptions.overview(),
      this.support.countOpen(),
    ]);
    return { users, subscriptions, support: { openTickets } };
  }
}
