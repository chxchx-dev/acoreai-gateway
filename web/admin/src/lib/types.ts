export interface ConvertedDocument {
  markdown: string;
  suggestedTitle: string | null;
  warnings: string[];
  originalFilename?: string;
  mimeType?: string;
  sourceUrl?: string;
}

export type SourceStatus =
  | 'draft'
  | 'pending_extraction'
  | 'extracted'
  | 'chunked'
  | 'pending_review'
  | 'needs_changes'
  | 'approved'
  | 'embedding_pending'
  | 'embedding_failed'
  | 'ready_to_publish'
  | 'published'
  | 'rejected'
  | 'archived'
  | 'expired';

export type ChunkStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'archived'
  | 'expired';

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface KnowledgeSource {
  id: string;
  title: string;
  description: string | null;
  sourceType: string;
  area: string | null;
  language: string;
  priority: number;
  status: SourceStatus;
  fileUrl: string | null;
  originalFilename: string | null;
  mimeType: string | null;
  checksum: string | null;
  currentVersion: number;
  validFrom: string | null;
  validUntil: string | null;
  uploadedBy: string | null;
  reviewedBy: string | null;
  publishedBy: string | null;
  reviewedAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeSourceVersion {
  id: string;
  sourceId: string;
  version: number;
  title: string;
  extractedText: string | null;
  textHash: string | null;
  changeSummary: string | null;
  status: SourceStatus;
  createdBy: string | null;
  createdAt: string;
}

export interface KnowledgeChunk {
  id: string;
  sourceId: string;
  versionId: string | null;
  chunkIndex: number;
  content: string;
  sectionTitle: string | null;
  status: ChunkStatus;
  pageStart: number | null;
  pageEnd: number | null;
  tokensCount: number | null;
  priority: number;
  validFrom: string | null;
  validUntil: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeReview {
  id: string;
  sourceId: string;
  versionId: string | null;
  reviewerId: string;
  decision: 'approved' | 'rejected' | 'needs_changes';
  comments: string | null;
  checklist: Record<string, boolean>;
  createdAt: string;
}

export interface KnowledgeProcessingJob {
  id: string;
  sourceId: string | null;
  versionId: string | null;
  jobType: string;
  status: JobStatus;
  attempts: number;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface KnowledgeSourceDetail extends KnowledgeSource {
  versions: KnowledgeSourceVersion[];
  reviews: KnowledgeReview[];
  processingJobs: KnowledgeProcessingJob[];
  chunks: KnowledgeChunk[];
  warnings: string[];
}

export interface KnowledgeAuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue: unknown;
  newValue: unknown;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface TranslationCacheEntry {
  textHash: string;
  language: string;
  sourceText: string;
  translation: string;
  model: string;
  hits: number;
  createdAt: string;
  updatedAt: string;
}

export interface TranslationCacheLanguageStats {
  language: string;
  entries: number;
  totalHits: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardData {
  cards: {
    publishedCount: number;
    pendingReviewCount: number;
    expiredCount: number;
    publishedChunksCount: number;
    embeddingFailedCount: number;
    unansweredQuestionsCount: number;
  };
  recent: {
    sources: Pick<KnowledgeSource, 'id' | 'title' | 'status' | 'createdAt'>[];
    reviews: { id: string; sourceId: string; sourceTitle: string; decision: string; createdAt: string }[];
    publications: { id: string; title: string; publishedAt: string }[];
  };
  alerts: {
    expiringSoon: { id: string; title: string; validUntil: string }[];
    failedJobs: {
      id: string;
      jobType: string;
      sourceId: string | null;
      sourceTitle: string | null;
      errorMessage: string | null;
      createdAt: string;
    }[];
    sourcesWithoutValidUntil: { id: string; title: string }[];
    duplicateSources: { id: string; title: string; checksum: string; status: string }[];
  };
}

export interface SearchLog {
  id: string;
  userId: string | null;
  query: string;
  filters: { area?: string | null; language?: string | null };
  topK: number | null;
  resultCount: number | null;
  latencyMs: number | null;
  createdAt: string;
}

export type AutomationProcessStatus = 'draft' | 'published' | 'archived';
export type AutomationChecklistMoment = 'antes' | 'despues';
export type AutomationLogStatus = 'pending' | 'success' | 'error';

export interface AutomationProcess {
  id: string;
  slug: string;
  name: string;
  platform: string;
  role: string | null;
  objective: string | null;
  status: AutomationProcessStatus;
  requiredInputs: string[];
  optionalInputs: string[];
  restrictions: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationStep {
  id: string;
  processId: string;
  order: number;
  key: string;
  label: string;
  createdAt: string;
}

export interface AutomationField {
  id: string;
  processId: string;
  key: string;
  tipo: 'select' | 'text' | 'textarea' | 'date' | 'time' | 'number' | 'file';
  requerido: boolean;
  maxCaracteres: number | null;
  opciones: unknown;
  order: number;
  createdAt: string;
}

export interface AutomationRule {
  id: string;
  processId: string;
  categoria: string;
  reglas: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationPayloadTemplate {
  id: string;
  processId: string;
  name: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationChecklistItem {
  id: string;
  processId: string;
  momento: AutomationChecklistMoment;
  label: string;
  order: number;
  createdAt: string;
}

export interface AutomationExecutionLog {
  id: string;
  processId: string;
  status: AutomationLogStatus;
  inputPayload: Record<string, unknown>;
  outputSummary: Record<string, unknown> | null;
  errorMessage: string | null;
  executedBy: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface AutomationProcessDetail extends AutomationProcess {
  steps: AutomationStep[];
  fields: AutomationField[];
  rules: AutomationRule[];
  templates: AutomationPayloadTemplate[];
  checklist: AutomationChecklistItem[];
  logs: AutomationExecutionLog[];
}

export interface TestQuestionResult {
  answer: string;
  sources: { title: string; page: number | null; section: string | null; score: number }[];
  chunksRetrieved: { chunkId: string; content: string; sectionTitle: string | null; score: number }[];
  warnings: string[];
}
