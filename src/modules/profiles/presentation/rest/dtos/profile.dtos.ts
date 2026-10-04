import { Transform } from "class-transformer";
import { IsString, MaxLength, MinLength } from "class-validator";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

// A free label chosen by the user (usually the @username it tracks).
export class ProfileNameDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;
}
