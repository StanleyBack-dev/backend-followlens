export type IntegrationState = {
  blocked: boolean;
  reason: string | null;
  blockedAt: Date | null;
  /** Fingerprint of the session that was rejected. */
  sessionFingerprint: string | null;
};

export const HEALTHY_INTEGRATION: IntegrationState = {
  blocked: false,
  reason: null,
  blockedAt: null,
  sessionFingerprint: null,
};

// Once Instagram rejects the session (logout, checkpoint, challenge), every
// further automated request makes things worse for the account. The breaker
// stops all syncs until the owner configures a *different* session — the
// fingerprint check makes that reset automatic after a redeploy.
export class IntegrationCircuitBreaker {
  isOpen(state: IntegrationState, currentFingerprint: string): boolean {
    return state.blocked && state.sessionFingerprint === currentFingerprint;
  }

  trip(reason: string, fingerprint: string, now: Date): IntegrationState {
    return {
      blocked: true,
      reason,
      blockedAt: now,
      sessionFingerprint: fingerprint,
    };
  }
}
