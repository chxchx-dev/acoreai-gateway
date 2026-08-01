import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { MongoModule } from 'src/infrastructure/database/mongodb/mongodb.module';
import { PrismaModule } from 'src/infrastructure/database/prisma/prisma.module';
import { AiProfileController } from 'src/interfaces/http/controllers/ai-profile.controller';
import { AiProfileService } from './ai-profile.service';

@Module({
  imports: [MongoModule, PrismaModule, AuthModule],
  controllers: [AiProfileController],
  providers: [AiProfileService],
  exports: [AiProfileService],
})
export class AiProfileModule {}
