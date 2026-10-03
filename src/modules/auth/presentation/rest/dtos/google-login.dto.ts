import { IsString, MaxLength, MinLength } from "class-validator";

export class GoogleLoginDto {
  @IsString()
  @MinLength(10)
  @MaxLength(4096)
  idToken!: string;
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
  termsAccepted: boolean;
  legalVersion: string;
};

export type GoogleLoginResponse = {
  accessToken: string;
  expiresAt: string;
  user: SessionUserResponse;
};
