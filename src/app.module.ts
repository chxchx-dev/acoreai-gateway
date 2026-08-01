import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { appConfig, mongodbConfig, ollamaConfig, ragConfig } from './config/app.config';
import { envValidationSchema } from './config/env.validation';
import { TimeoutInterceptor } from 'src/interfaces/http/interceptors/timeout.interceptor';
import { AiOrchestratorModule } from 'src/modules/ai-orchestrator/ai-orchestrator.module';
import { HealthModule } from 'src/modules/health/health.module';
import { PrismaModule } from 'src/infrastructure/database/prisma/prisma.module';
import { MailModule } from 'src/infrastructure/mail/mail.module';
import { LogsModule } from 'src/modules/logs/logs.module';
import { ChatModule } from 'src/modules/chat/chat.module';
import { ConversationsModule } from 'src/modules/conversations/conversations.module';
import { DocumentsModule } from 'src/modules/documents/documents.module';
import { TtsModule } from 'src/modules/tts/tts.module';
import { TranslateModule } from 'src/modules/translate/translate.module';
import { SttModule } from 'src/modules/stt/stt.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { TrialModule } from 'src/modules/trial/trial.module';
import { ObservabilityModule } from './infrastructure/observability/observability.module';
import { AiProfileModule } from 'src/modules/ai-profile/ai-profile.module';
import { LanguagesModule } from 'src/modules/languages/languages.module';
import { KnowledgeModule } from 'src/modules/knowledge/knowledge.module';
import { AutomationModule } from 'src/modules/automation/automation.module';
import { MetricsInterceptor } from './infrastructure/observability/metrics.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      load: [appConfig, ollamaConfig, ragConfig, mongodbConfig],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 30,
      },
    ]),
    ScheduleModule.forRoot(),
    HealthModule,
    PrismaModule,
    MailModule,
    LogsModule,
    AiOrchestratorModule,
    ConversationsModule,
    ChatModule,
    DocumentsModule,
    TtsModule,
    TranslateModule,
    SttModule,
    AuthModule,
    TrialModule,
    ObservabilityModule,
    AiProfileModule,
    LanguagesModule,
    KnowledgeModule,
    AutomationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {}
