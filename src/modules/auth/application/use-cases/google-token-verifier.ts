import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import { APP_ERRORS } from "@/common/exceptions/app-errors.catalog";
import { AppException } from "@/common/exceptions/app-exception";

export type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
  pictureUrl: string | null;
};

// Verifies the Google ID token server-side (signature + audience + email
// verified), following the same flow as the reference project.
@Injectable()
export class GoogleTokenVerifier {
  private client?: OAuth2Client;

  constructor(private readonly config: ConfigService) {}

  async verify(idToken: string): Promise<GoogleProfile> {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    if (!clientId) {
      throw AppException.from(APP_ERRORS.auth.googleNotConfigured, undefined);
    }

    try {
      const ticket = await this.getClient(clientId).verifyIdToken({
        idToken,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) {
        throw AppException.from(APP_ERRORS.auth.googleTokenInvalid, undefined);
      }
      if (!payload.email_verified) {
        throw AppException.from(
          APP_ERRORS.auth.googleEmailNotVerified,
          undefined,
        );
      }
      return {
        googleId: payload.sub,
        email: payload.email.trim().toLowerCase(),
        name: payload.name?.trim() || payload.email,
        pictureUrl: payload.picture ?? null,
      };
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw AppException.from(APP_ERRORS.auth.googleTokenInvalid, undefined);
    }
  }

  private getClient(clientId: string): OAuth2Client {
    if (!this.client) this.client = new OAuth2Client(clientId);
    return this.client;
  }
}
