import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { BillingCycle } from "@/modules/billing/domain/enums/billing-cycle.enum";
import { CancellationReason } from "@/modules/billing/domain/enums/cancellation-reason.enum";
import { PaymentMethod } from "@/modules/billing/domain/enums/payment-method.enum";

const digitsOnly = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.replace(/\D/g, "") : value;

export class SubscribeToProDto {
  // Accepts a formatted CPF/CNPJ; the gateway validates the check digits.
  @Transform(digitsOnly)
  @Matches(/^(\d{11}|\d{14})$/, { message: "CPF ou CNPJ inválido" })
  cpfCnpj!: string;

  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}

export class CancelSubscriptionDto {
  @IsArray()
  @ArrayMinSize(1, { message: "Informe ao menos um motivo" })
  @ArrayMaxSize(6)
  @IsEnum(CancellationReason, { each: true })
  reasons!: CancellationReason[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  otherReason?: string;
}
