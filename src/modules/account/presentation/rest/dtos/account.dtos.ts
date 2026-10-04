import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class UpdateAccountProfileDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;
}

export class RequestAccountDeletionDto {
  @Transform(trim)
  @IsEmail()
  @MaxLength(160)
  confirmEmail!: string;
}
