import { Injectable } from '@nestjs/common';
import {
  applyChatPolicy,
  ChatPolicyContext,
  ChatPolicyInput,
} from 'src/domain/ai/policies/chat-policy';

@Injectable()
export class ModelPolicyService {
  applyChatPolicy<T extends ChatPolicyInput>(
    dto: T,
    context: ChatPolicyContext,
  ): T {
    return applyChatPolicy(dto, context) as T;
  }
}
