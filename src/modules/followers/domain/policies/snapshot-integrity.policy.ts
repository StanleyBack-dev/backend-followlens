export type SnapshotIntegrityRules = {
  /** Losing more than this share of active followers at once is suspicious. */
  maxLossRatio: number;
  /** Below this absolute number of losses the ratio check doesn't apply. */
  lossRatioFloor: number;
};

export type SnapshotIntegrityInput = {
  isBaseline: boolean;
  activeCount: number;
  lostCount: number;
};

export type SnapshotIntegrityVerdict =
  { accepted: true } | { accepted: false; reason: string };

export class SnapshotRejectedError extends Error {
  constructor(readonly reason: string) {
    super(`Snapshot rejeitado: ${reason}`);
  }
}

// Safety lock against false alarms: uploading the wrong file (e.g. a much
// older export, or "following" instead of "followers") would flag most people
// as "unfollowed" and email all of them. A rejected snapshot changes nothing.
export class SnapshotIntegrityPolicy {
  constructor(private readonly rules: SnapshotIntegrityRules) {}

  assess(input: SnapshotIntegrityInput): SnapshotIntegrityVerdict {
    if (input.isBaseline || input.activeCount === 0) {
      return { accepted: true };
    }

    const threshold = Math.max(
      this.rules.lossRatioFloor,
      input.activeCount * this.rules.maxLossRatio,
    );
    if (input.lostCount > threshold) {
      return {
        accepted: false,
        reason: `${input.lostCount} perdas de uma vez (limite ${Math.floor(threshold)}). Verifique se o arquivo enviado é o de seguidores mais recente.`,
      };
    }
    return { accepted: true };
  }
}
