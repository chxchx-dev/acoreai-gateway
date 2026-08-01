import type { UserAiProfile, CompleteAiOnboardingRequest } from '../types/ai-profile';
import { fetchAiProfile, saveAiProfile, updateAiProfile, type AiProfileData } from './gateway';

const STORAGE_KEY = 'alania-web:ai-profile';

// ── Synchronous localStorage (used for fast initial state) ────────────────────

export function loadProfile(userId: string): UserAiProfile | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserAiProfile;
    if (parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserAiProfile): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

// ── API + cache ───────────────────────────────────────────────────────────────

function fromApiData(data: AiProfileData): UserAiProfile {
  return {
    userId: data.userId,
    preferredMode: data.preferredMode as UserAiProfile['preferredMode'],
    mainGoal: data.mainGoal,
    englishLevel: data.englishLevel as UserAiProfile['englishLevel'],
    interestTopics: data.interestTopics,
    correctionStyle: data.correctionStyle as UserAiProfile['correctionStyle'],
    practiceStyle: data.practiceStyle as UserAiProfile['practiceStyle'],
    onboardingCompleted: data.onboardingCompleted,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function fetchAndCacheProfile(
  userId: string,
  token: string,
): Promise<UserAiProfile | null> {
  try {
    const data = await fetchAiProfile(token);
    if (!data) return null;
    const profile = fromApiData(data);
    saveProfile(profile);
    return profile;
  } catch {
    return loadProfile(userId);
  }
}

export async function completeOnboardingWithApi(
  userId: string,
  data: CompleteAiOnboardingRequest,
  token: string,
): Promise<UserAiProfile> {
  const now = new Date().toISOString();

  const localProfile: UserAiProfile = {
    userId,
    ...data,
    onboardingCompleted: true,
    createdAt: now,
    updatedAt: now,
  };
  saveProfile(localProfile);

  try {
    const apiData = await saveAiProfile(data, token);
    const apiProfile = fromApiData(apiData);
    saveProfile(apiProfile);
    return apiProfile;
  } catch {
    return localProfile;
  }
}

export async function updateProfileWithApi(
  userId: string,
  data: CompleteAiOnboardingRequest,
  token: string,
): Promise<UserAiProfile> {
  const now = new Date().toISOString();
  const existing = loadProfile(userId);

  const localProfile: UserAiProfile = {
    ...existing,
    userId,
    ...data,
    onboardingCompleted: true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  saveProfile(localProfile);

  try {
    const apiData = await updateAiProfile(data, token);
    const apiProfile = fromApiData(apiData);
    saveProfile(apiProfile);
    return apiProfile;
  } catch {
    return localProfile;
  }
}
