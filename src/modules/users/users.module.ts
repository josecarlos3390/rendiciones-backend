import { Module }          from '@nestjs/common';
import { UsersService }    from './users.service';
import { UsersController } from './users.controller';
import { UsersHanaRepository } from './repositories/users.hana.repository';
import { USERS_REPOSITORY }    from './repositories/users.repository.interface';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersHanaRepository,
    {
      provide:    USERS_REPOSITORY,
      useExisting: UsersHanaRepository,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}