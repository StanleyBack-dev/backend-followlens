import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminPolicyService } from "@/modules/users/application/admin-policy.service";
import { USER_REPOSITORY } from "@/modules/users/application/ports/user-repository.port";
import { UserOrmEntity } from "@/modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity";
import { UserTypeormRepository } from "@/modules/users/infrastructure/persistence/typeorm/repositories/user-typeorm.repository";

@Module({
  imports: [TypeOrmModule.forFeature([UserOrmEntity])],
  providers: [
    { provide: USER_REPOSITORY, useClass: UserTypeormRepository },
    AdminPolicyService,
  ],
  exports: [USER_REPOSITORY, AdminPolicyService],
})
export class UsersModule {}
