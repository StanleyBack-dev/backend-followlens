export type SessionTokenPayload = {
  /** User id. */
  sub: string;
  email: string;
};

export type IssuedToken = {
  token: string;
  expiresAt: Date;
};

export interface TokenServicePort {
  issue(payload: SessionTokenPayload): IssuedToken;
  /** Returns null for any invalid, expired or tampered token. */
  verify(token: string): SessionTokenPayload | null;
}

export const TOKEN_SERVICE = Symbol("TOKEN_SERVICE");
