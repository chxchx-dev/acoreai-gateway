import { api, buildQuery } from './api';
import { getOrCreateDeviceId } from './deviceId';
import type {
  AutomationChecklistItem,
  AutomationExecutionLog,
  AutomationField,
  AutomationPayloadTemplate,
  AutomationProcess,
  AutomationProcessDetail,
  AutomationRule,
  AutomationStep,
  ConvertedDocument,
  DashboardData,
  KnowledgeAuditLog,
  KnowledgeChunk,
  KnowledgeSourceDetail,
  Paginated,
  SearchLog,
  TestQuestionResult,
  TranslationCacheEntry,
  TranslationCacheLanguageStats,
} from './types';
import type { StoredUser } from '../../lib/auth';

export interface LoginResponse {
  accessToken: string;
  user: StoredUser;
}

export const authApi = {
  login: (email: string, password: string, opts?: { force?: boolean }) =>
    api.post<LoginResponse>('/auth/login', {
      email,
      password,
      deviceId: getOrCreateDeviceId(),
      platform: 'web',
      force: opts?.force,
    }),
};

export interface CreateSourcePayload {
  title: string;
  description?: string;
  sourceType: 'text' | 'upload' | 'url';
  area?: string;
  language?: string;
  priority?: number;
  validFrom?: string;
  validUntil?: string;
  content?: string;
  allowDuplicate?: boolean;
  // Procedencia cuando el content viene de convertir un PDF/DOCX/URL ya editado.
  originalFilename?: string;
  mimeType?: string;
  sourceUrl?: string;
}

export const sourcesApi = {
  list: () => api.get<KnowledgeSourceDetail[]>('/knowledge/sources'),
  get: (id: string) => api.get<KnowledgeSourceDetail>(`/knowledge/sources/${id}`),
  create: (payload: CreateSourcePayload) => api.post<{ id: string; status: string; message: string }>('/knowledge/sources', payload),
  createFromUpload: (formData: FormData) =>
    api.upload<{ id: string; status: string; message: string }>('/knowledge/sources/upload', formData),
  update: (id: string, payload: Partial<CreateSourcePayload>) => api.patch<KnowledgeSourceDetail>(`/knowledge/sources/${id}`, payload),
  reprocess: (id: string) => api.post<{ id: string; status: string; message: string }>(`/knowledge/sources/${id}/reprocess`, {}),
  generateEmbeddings: (id: string) => api.post<{ id: string; status: string; message: string }>(`/knowledge/sources/${id}/generate-embeddings`, {}),
  review: (id: string, payload: { decision: 'approved' | 'rejected' | 'needs_changes'; comments?: string; checklist?: Record<string, boolean> }) =>
    api.post(`/knowledge/sources/${id}/review`, payload),
  publish: (id: string) => api.post<KnowledgeSourceDetail>(`/knowledge/sources/${id}/publish`, {}),
  archive: (id: string, reason?: string) => api.post<KnowledgeSourceDetail>(`/knowledge/sources/${id}/archive`, { reason }),
  remove: (id: string) => api.delete<void>(`/knowledge/sources/${id}`),
  compareVersions: (id: string, from: number, to: number) => api.get(`/knowledge/sources/${id}/versions/compare${buildQuery({ from, to })}`),
};

// Conversión de PDF/DOCX/URL a Markdown — no crean la fuente todavía, solo
// devuelven el texto para revisar/editar antes de guardar (ver sourcesApi.create).
export const sourceConversionApi = {
  fromFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<ConvertedDocument>('/knowledge/sources/convert/upload', formData);
  },
  fromUrl: (url: string) => api.post<ConvertedDocument>('/knowledge/sources/convert/url', { url }),
};

export const chunksApi = {
  update: (id: string, payload: Partial<Pick<KnowledgeChunk, 'content' | 'sectionTitle' | 'priority'>>) =>
    api.patch<KnowledgeChunk>(`/knowledge/chunks/${id}`, payload),
  approve: (id: string) => api.post<KnowledgeChunk>(`/knowledge/chunks/${id}/approve`, {}),
  reject: (id: string) => api.post<KnowledgeChunk>(`/knowledge/chunks/${id}/reject`, {}),
  remove: (id: string) => api.delete<void>(`/knowledge/chunks/${id}`),
};

export const auditApi = {
  list: (filters: { userId?: string; action?: string; entityId?: string; from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get<Paginated<KnowledgeAuditLog>>(`/knowledge/audit${buildQuery(filters)}`),
};

export const dashboardApi = {
  get: () => api.get<DashboardData>('/knowledge/dashboard'),
};

export const unansweredApi = {
  list: (page = 1, pageSize = 50) => api.get<Paginated<SearchLog>>(`/knowledge/unanswered-questions${buildQuery({ page, pageSize })}`),
};

export const testQuestionApi = {
  ask: (sourceId: string, question: string, model?: string) =>
    api.post<TestQuestionResult>('/knowledge/test-question', { sourceId, question, model }),
  feedback: (sourceId: string, question: string, feedback: 'correct' | 'insufficient') =>
    api.post('/knowledge/test-question/feedback', { sourceId, question, feedback }),
};

export interface CreateAutomationProcessPayload {
  slug: string;
  name: string;
  platform?: string;
  role?: string;
  objective?: string;
  requiredInputs?: string[];
  optionalInputs?: string[];
  restrictions?: string[];
}

export const automationProcessesApi = {
  list: () => api.get<AutomationProcess[]>('/automation/processes'),
  get: (id: string) => api.get<AutomationProcessDetail>(`/automation/processes/${id}`),
  create: (payload: CreateAutomationProcessPayload) => api.post<AutomationProcess>('/automation/processes', payload),
  update: (id: string, payload: Partial<CreateAutomationProcessPayload>) =>
    api.patch<AutomationProcess>(`/automation/processes/${id}`, payload),
  publish: (id: string) => api.post<AutomationProcess>(`/automation/processes/${id}/publish`, {}),
  archive: (id: string) => api.post<AutomationProcess>(`/automation/processes/${id}/archive`, {}),
  remove: (id: string) => api.delete<void>(`/automation/processes/${id}`),

  addStep: (processId: string, payload: { key: string; label: string; order?: number }) =>
    api.post<AutomationStep>(`/automation/processes/${processId}/steps`, payload),
  updateStep: (stepId: string, payload: { key: string; label: string; order?: number }) =>
    api.patch<AutomationStep>(`/automation/processes/steps/${stepId}`, payload),
  removeStep: (stepId: string) => api.delete<void>(`/automation/processes/steps/${stepId}`),

  addField: (processId: string, payload: Partial<AutomationField> & { key: string; tipo: string }) =>
    api.post<AutomationField>(`/automation/processes/${processId}/fields`, payload),
  updateField: (fieldId: string, payload: Partial<AutomationField> & { key: string; tipo: string }) =>
    api.patch<AutomationField>(`/automation/processes/fields/${fieldId}`, payload),
  removeField: (fieldId: string) => api.delete<void>(`/automation/processes/fields/${fieldId}`),

  upsertRule: (processId: string, payload: { categoria: string; reglas: Record<string, unknown> }) =>
    api.post<AutomationRule>(`/automation/processes/${processId}/rules`, payload),
  removeRule: (ruleId: string) => api.delete<void>(`/automation/processes/rules/${ruleId}`),

  upsertTemplate: (processId: string, payload: { name: string; payload: Record<string, unknown> }) =>
    api.post<AutomationPayloadTemplate>(`/automation/processes/${processId}/templates`, payload),
  removeTemplate: (templateId: string) => api.delete<void>(`/automation/processes/templates/${templateId}`),

  addChecklistItem: (processId: string, payload: { momento: 'antes' | 'despues'; label: string; order?: number }) =>
    api.post<AutomationChecklistItem>(`/automation/processes/${processId}/checklist`, payload),
  removeChecklistItem: (itemId: string) => api.delete<void>(`/automation/processes/checklist/${itemId}`),
};

export const automationLogsApi = {
  list: (processId: string) => api.get<AutomationExecutionLog[]>(`/automation/processes/${processId}/logs`),
  create: (
    processId: string,
    payload: { status?: 'pending' | 'success' | 'error'; inputPayload: Record<string, unknown>; outputSummary?: Record<string, unknown>; errorMessage?: string },
  ) => api.post<AutomationExecutionLog>(`/automation/processes/${processId}/logs`, payload),
  remove: (logId: string) => api.delete<void>(`/automation/logs/${logId}`),
};

export interface HistoryExportFilters {
  source?: string;
  status?: string;
  from?: string;
  to?: string;
}

export const translationCacheApi = {
  languages: () => api.get<string[]>('/translate/cache/languages'),
  stats: () => api.get<TranslationCacheLanguageStats[]>('/translate/cache/stats'),
  list: (filters: { language: string; search?: string; page?: number; pageSize?: number }) =>
    api.get<Paginated<TranslationCacheEntry>>(`/translate/cache${buildQuery(filters)}`),
  remove: (language: string, textHash: string) =>
    api.delete<void>(`/translate/cache/${encodeURIComponent(language)}/${encodeURIComponent(textHash)}`),
};

export const historyApi = {
  // Historial de prompts/respuestas (MongoDB, separado de la base de conocimiento).
  download: (format: 'csv' | 'xlsx', filters: HistoryExportFilters = {}) =>
    api.download(`/logs/export${buildQuery({ format, ...filters })}`, `historial.${format}`),
};
