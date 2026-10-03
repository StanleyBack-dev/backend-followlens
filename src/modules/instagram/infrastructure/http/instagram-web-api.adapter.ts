import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "crypto";
import type {
  FollowersPage,
  InstagramGatewayPort,
  InstagramProfile,
} from "@/modules/instagram/application/ports/instagram-gateway.port";
import {
  InstagramRateLimitError,
  InstagramSessionError,
  InstagramUnavailableError,
} from "@/modules/instagram/domain/errors/instagram.errors";
import { normalizeUsername } from "@/shared/domain/username";

const BASE_URL = "https://www.instagram.com";
const REQUEST_TIMEOUT_MS = 20_000;

type RawUser = { username?: string };
type RawFollowersResponse = {
  users?: RawUser[];
  next_max_id?: string | number | null;
  status?: string;
  message?: string;
};
type RawWebProfileResponse = {
  data?: {
    user?: {
      id?: string;
      username?: string;
      edge_followed_by?: { count?: number };
    };
  };
  status?: string;
  message?: string;
};

const SESSION_MARKERS = [
  "login_required",
  "checkpoint_required",
  "challenge_required",
  "consent_required",
  "user_has_logged_out",
];

// Adapter for the private web API the instagram.com frontend uses (the same
// calls visible in DevTools > Network). Mimics the logged-in browser using
// the owner's session cookies. Cookies are read from env only, never logged.
@Injectable()
export class InstagramWebApiAdapter implements InstagramGatewayPort {
  private readonly logger = new Logger(InstagramWebApiAdapter.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.sessionId() && this.csrfToken() && this.dsUserId());
  }

  sessionFingerprint(): string {
    return createHash("sha256")
      .update(this.sessionId())
      .digest("hex")
      .slice(0, 16);
  }

  ownUserId(): string {
    return this.dsUserId();
  }

  // Same call the profile page makes in the browser. (The mobile-style
  // /users/{id}/info/ endpoint answers 429 to web sessions.)
  async getOwnProfile(): Promise<InstagramProfile> {
    const username = this.config.get<string>("INSTAGRAM_USERNAME")?.trim();
    if (!username) {
      throw new InstagramUnavailableError("INSTAGRAM_USERNAME não definido");
    }
    const body = await this.request<RawWebProfileResponse>(
      `/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
    );
    const user = body.data?.user;
    const followerCount = user?.edge_followed_by?.count;
    if (!user?.id || typeof followerCount !== "number") {
      throw new InstagramUnavailableError("resposta de perfil inesperada");
    }
    return {
      userId: String(user.id),
      username: user.username ?? username,
      followerCount,
    };
  }

  async fetchFollowersPage(params: {
    userId: string;
    cursor: string | null;
    pageSize: number;
  }): Promise<FollowersPage> {
    const query = new URLSearchParams({
      count: String(params.pageSize),
      search_surface: "follow_list_page",
    });
    if (params.cursor) query.set("max_id", params.cursor);

    const body = await this.request<RawFollowersResponse>(
      `/api/v1/friendships/${params.userId}/followers/?${query.toString()}`,
    );
    if (!Array.isArray(body.users)) {
      throw new InstagramUnavailableError("lista de seguidores ausente");
    }

    const nextCursor =
      body.next_max_id === undefined || body.next_max_id === null
        ? null
        : String(body.next_max_id);

    return {
      followers: body.users
        .map((user) => normalizeUsername(user.username ?? ""))
        .filter((username): username is string => username !== null)
        .map((username) => ({ username, followedAt: null })),
      nextCursor,
    };
  }

  private async request<T extends { status?: string; message?: string }>(
    path: string,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: this.headers(),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.name : "unknown";
      throw new InstagramUnavailableError(`falha de rede (${reason})`);
    }

    if (response.status >= 300 && response.status < 400) {
      throw new InstagramSessionError("redirecionado para o login");
    }

    const text = await response.text();
    if (!response.ok) this.throwForFailure(response.status, text);

    let body: T;
    try {
      body = JSON.parse(text);
    } catch {
      this.logger.warn(
        `Resposta não-JSON do Instagram em ${path.split("?")[0]}`,
      );
      throw new InstagramSessionError("resposta não-JSON (possível logout)");
    }
    if (body.status === "fail")
      this.throwForFailure(response.status, String(body.message ?? ""));
    return body;
  }

  // Only error payloads are scanned for markers — never a follower list, where
  // a display name could contain the same words.
  private throwForFailure(status: number, message: string): never {
    const lowered = message.toLowerCase();
    if (status === 429 || lowered.includes("please wait a few minutes")) {
      throw new InstagramRateLimitError();
    }
    const marker = SESSION_MARKERS.find((m) => lowered.includes(m));
    if (marker || status === 401 || status === 403) {
      throw new InstagramSessionError(marker ?? `HTTP ${status}`);
    }
    throw new InstagramUnavailableError(`HTTP ${status}`);
  }

  private headers(): Record<string, string> {
    return {
      accept: "*/*",
      "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      cookie: [
        `sessionid=${this.sessionId()}`,
        `csrftoken=${this.csrfToken()}`,
        `ds_user_id=${this.dsUserId()}`,
      ].join("; "),
      referer: `${BASE_URL}/`,
      "user-agent": this.config.get<string>("INSTAGRAM_USER_AGENT") ?? "",
      "x-csrftoken": this.csrfToken(),
      "x-ig-app-id":
        this.config.get<string>("INSTAGRAM_APP_ID") ?? "936619743392459",
      "x-requested-with": "XMLHttpRequest",
    };
  }

  private sessionId(): string {
    // Cookie values copied from DevTools are often URL-encoded ("%3A").
    return decodeURIComponent(
      this.config.get<string>("INSTAGRAM_SESSION_ID") ?? "",
    );
  }

  private csrfToken(): string {
    return this.config.get<string>("INSTAGRAM_CSRF_TOKEN") ?? "";
  }

  private dsUserId(): string {
    return this.config.get<string>("INSTAGRAM_DS_USER_ID") ?? "";
  }
}
