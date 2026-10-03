import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { PaginationQueryDto } from "@/common/dtos/pagination-query.dto";
import { FollowerEventType } from "@/modules/followers/domain/enums/follower-event-type.enum";
import { FollowerStatus } from "@/modules/followers/domain/enums/follower-status.enum";

// Instagram usernames: letters, digits, dot and underscore.
const USERNAME = /^[A-Za-z0-9._]{1,64}$/;
const USERNAME_MESSAGE = "username inválido";

export class ListFollowersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(FollowerStatus)
  status?: FollowerStatus;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;

  @IsOptional()
  @Matches(USERNAME, { message: USERNAME_MESSAGE })
  username?: string;
}

export class ListFollowerEventsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(FollowerEventType)
  type?: FollowerEventType;

  @IsOptional()
  @Matches(USERNAME, { message: USERNAME_MESSAGE })
  username?: string;
}

export class FollowerFilterOptionsQueryDto {
  @IsOptional()
  @IsEnum(FollowerStatus)
  status?: FollowerStatus;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;
}

export class EventFilterOptionsQueryDto {
  @IsOptional()
  @IsEnum(FollowerEventType)
  type?: FollowerEventType;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;
}
