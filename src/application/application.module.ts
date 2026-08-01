import { Module } from '@nestjs/common';
import { ModelPolicyService } from './services/model-policy.service';
import { PromptBuilderService } from './services/prompt-builder.service';

@Module({
  providers: [ModelPolicyService, PromptBuilderService],
  exports: [ModelPolicyService, PromptBuilderService],
})
export class ApplicationModule {}
