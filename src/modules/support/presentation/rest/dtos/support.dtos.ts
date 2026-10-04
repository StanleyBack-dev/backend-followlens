import { Transform } from "class-transformer";
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { PaginationQueryDto } from "@/common/dtos/pagination-query.dto";
import {
  SupportCategory,
  SupportTicketStatus,
} from "@/modules/support/domain/support.enums";

const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class SendSupportMessageDto {
  @IsEnum(SupportCategory)
  category!: SupportCategory;

  @Transform(trim)
  @IsString()
  @MinLength(1, { message: "Escreva uma mensagem antes de enviar." })
  @MaxLength(2000)
  message!: string;
}

export class ReplyToSupportTicketDto {
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: "Escreva uma resposta antes de enviar." })
  @MaxLength(2000)
  reply!: string;
}

export class ListSupportTicketsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @IsOptional()
  @IsEnum(SupportCategory)
  category?: SupportCategory;
}
