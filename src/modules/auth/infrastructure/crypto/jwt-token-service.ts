import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt from "jsonwebtoken";
import type {
  IssuedToken,
  SessionTokenPayload,
  TokenServicePort,
} from "@/modules/auth/application/ports/token-service.port";

const ISSUER = "followlens-api";
const AUDIENCE = "followlens-bff";

@Injectable()
export class JwtTokenService implements TokenServicePort {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>("JWT_SECRET");
    this.expiresIn = config.get<string>("JWT_EXPIRES_IN") ?? "7d";
  }

  issue(payload: SessionTokenPayload): IssuedToken {
    const token = jwt.sign({ email: payload.email }, this.secret, {
      algorithm: "HS256",
      subject: payload.sub,
      issuer: ISSUER,
      audience: AUDIENCE,
      expiresIn: this.expiresIn as jwt.SignOptions["expiresIn"],
    });
    const { exp } = jwt.decode(token) as { exp: number };
    return { token, expiresAt: new Date(exp * 1000) };
  }

  verify(token: string): SessionTokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ["HS256"],
        issuer: ISSUER,
        audience: AUDIENCE,
      });
      if (
        typeof decoded !== "object" ||
        typeof decoded.sub !== "string" ||
        typeof decoded.email !== "string"
      ) {
        return null;
      }
      return { sub: decoded.sub, email: decoded.email };
    } catch {
      return null;
    }
  }
}
