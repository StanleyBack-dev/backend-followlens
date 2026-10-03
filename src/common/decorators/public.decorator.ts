import { SetMetadata } from "@nestjs/common";

// Skips the owner session check. The internal API key still applies (except
// on the health check — see InternalApiKeyGuard).
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
