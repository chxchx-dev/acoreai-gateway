import { Controller, Get, UseGuards } from '@nestjs/common';
import { AiOrchestratorService } from 'src/modules/ai-orchestrator/ai-orchestrator.service';
import { ApiKeyOrJwtGuard } from '../guards/api-key-or-jwt.guard';
import { OllamaAvailableModelsResponse, OllamaHealthResult } from 'src/modules/ollama/types/ollama.types';

@UseGuards(ApiKeyOrJwtGuard)
@Controller('ollama')
export class OllamaController {
  constructor(private readonly aiOrchestrator: AiOrchestratorService) {}

  @Get('health')
  checkHealth(): Promise<OllamaHealthResult> {
    return this.aiOrchestrator.checkInferenceHealth();
  }

  @Get('models')
  listModels(): Promise<OllamaAvailableModelsResponse> {
    return this.aiOrchestrator.listModels();
  }
}
