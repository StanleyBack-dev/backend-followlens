import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  INSTAGRAM_GATEWAY,
  type InstagramGatewayPort,
} from "@/modules/instagram/application/ports/instagram-gateway.port";
import {
  INTEGRATION_STATE_REPOSITORY,
  type IntegrationStateRepositoryPort,
} from "@/modules/sync/application/ports/integration-state-repository.port";
import { IntegrationCircuitBreaker } from "@/modules/sync/domain/policies/integration-circuit-breaker";
import { CLOCK, type ClockPort } from "@/shared/application/ports/clock.port";

export type IntegrationStatus = {
  configured: boolean;
  blocked: boolean;
  reason: string | null;
  blockedAt: Date | null;
};

@Injectable()
export class IntegrationGuardService {
  private readonly logger = new Logger(IntegrationGuardService.name);
  private readonly breaker = new IntegrationCircuitBreaker();

  constructor(
    @Inject(INSTAGRAM_GATEWAY) private readonly gateway: InstagramGatewayPort,
    @Inject(INTEGRATION_STATE_REPOSITORY)
    private readonly states: IntegrationStateRepositoryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async status(): Promise<IntegrationStatus> {
    if (!this.gateway.isConfigured()) {
      return {
        configured: false,
        blocked: false,
        reason: null,
        blockedAt: null,
      };
    }
    const state = await this.states.get();
    const blocked = this.breaker.isOpen(
      state,
      this.gateway.sessionFingerprint(),
    );
    return {
      configured: true,
      blocked,
      reason: blocked ? state.reason : null,
      blockedAt: blocked ? state.blockedAt : null,
    };
  }

  async trip(reason: string): Promise<void> {
    await this.states.save(
      this.breaker.trip(
        reason,
        this.gateway.sessionFingerprint(),
        this.clock.now(),
      ),
    );
    this.logger.warn(`Circuit breaker do Instagram aberto: ${reason}`);
  }
}
