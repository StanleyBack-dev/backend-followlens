import type { IntegrationState } from "@/modules/sync/domain/policies/integration-circuit-breaker";

export interface IntegrationStateRepositoryPort {
  get(): Promise<IntegrationState>;
  save(state: IntegrationState): Promise<void>;
}

export const INTEGRATION_STATE_REPOSITORY = Symbol(
  "INTEGRATION_STATE_REPOSITORY",
);
