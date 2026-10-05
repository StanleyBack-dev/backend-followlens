import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class GoogleLoginDto {
  @IsString()
  @MinLength(10)
  @MaxLength(4096)
  idToken!: string;

  /** Code of whoever invited this person; only used when the account is new. */
  @IsOptional()
  @Matches(/^[A-Z0-9]{6,12}$/)
  referralCode?: string;
}

export type SessionUserResponse = {
  id: string;
  email: string;
  name: string;
  pictureUrl: string | null;
  plan: string;
  role: string;
  isAdmin: boolean;
  isMaster: boolean;
  /** Pro features unlocked (paid, granted by an admin, or an admin). */
  isPro: boolean;
  termsAccepted: boolean;
  legalVersion: string;
  /** ISO date when the account will be deleted, or null when not scheduled. */
  deletionScheduledFor: string | null;
};

export type GoogleLoginResponse = {
  accessToken: string;
  expiresAt: string;
  user: SessionUserResponse;
};
