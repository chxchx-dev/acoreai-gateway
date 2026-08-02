import { Module } from '@nestjs/common';
import { LLM_PORT } from 'src/application/ports/llm.port';
import { AuthModule } from 'src/modules/auth/auth.module';
import { OllamaAdapter } from 'src/infrastructure/llm/ollama.adapter';
import { OllamaController } from 'src/interfaces/http/controllers/ollama.controller';
import { OllamaModule } from 'src/modules/ollama/ollama.module';
import { AiOrchestratorService } from './ai-orchestrator.service';

@Module({
  imports: [AuthModule, OllamaModule],
  controllers: [OllamaController],
  providers: [
    AiOrchestratorService,
    OllamaAdapter,
    {
      provide: LLM_PORT,
      useExisting: OllamaAdapter,
    },
  ],
  exports: [AiOrchestratorService, LLM_PORT],
})
export class AiOrchestratorModule {}
