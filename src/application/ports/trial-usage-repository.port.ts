export const TRIAL_USAGE_REPOSITORY_PORT = Symbol('TRIAL_USAGE_REPOSITORY_PORT');

export interface TrialUsageRepositoryPort {
  checkAndIncrement(fingerprint: string): Promise<{ count: number; allowed: boolean }>;
  getCount(fingerprint: string): Promise<number>;
}
