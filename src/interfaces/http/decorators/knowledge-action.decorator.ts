import { SetMetadata } from '@nestjs/common';
import { KnowledgeAction } from 'src/domain/knowledge/knowledge-permissions';

export const KNOWLEDGE_ACTION_KEY = 'knowledgeAction';

export const RequireKnowledgeAction = (action: KnowledgeAction) => SetMetadata(KNOWLEDGE_ACTION_KEY, action);
