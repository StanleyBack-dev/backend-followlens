import { Module } from "@nestjs/common";
import { UsersModule } from "@/modules/users/users.module";
import { AcceptLegalUseCase } from "@/modules/legal/application/use-cases/accept-legal.use-case";
import { LegalController } from "@/modules/legal/presentation/rest/legal.controller";

@Module({
  imports: [UsersModule],
  controllers: [LegalController],
  providers: [AcceptLegalUseCase],
})
export class LegalModule {}
