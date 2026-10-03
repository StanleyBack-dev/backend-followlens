// Integration failures, classified by what the caller should do about them.

export abstract class InstagramError extends Error {
  abstract readonly kind: "session" | "rate-limit" | "unavailable";
}

/** Session expired, logged out, checkpoint/challenge — needs human action. */
export class InstagramSessionError extends InstagramError {
  readonly kind = "session" as const;
  constructor(readonly reason: string) {
    super(`Sessão do Instagram inválida: ${reason}`);
  }
}

/** HTTP 429 / "please wait a few minutes" — back off and resume later. */
export class InstagramRateLimitError extends InstagramError {
  readonly kind = "rate-limit" as const;
  constructor() {
    super("Instagram limitou as requisições (rate limit).");
  }
}

/** Network errors, 5xx, unexpected payloads — transient. */
export class InstagramUnavailableError extends InstagramError {
  readonly kind = "unavailable" as const;
  constructor(readonly detail: string) {
    super(`Instagram indisponível: ${detail}`);
  }
}
