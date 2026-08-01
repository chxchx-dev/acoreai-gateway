export type ConvType = 'investigacion' | 'practicar';

export type ConvTag = {
  type: ConvType;
  level?: string;
};

export type SavedTranslation = {
  id: string;
  title: string;
  text: string;
  translations: Record<string, string>;
  langs: string[];
  createdAt: string;
};

const CONV_TAGS_KEY   = 'alania-web:conv-tags';
const TRANSL_SAVE_KEY = 'alania-web:saved-translations';

// ── Conversation tags ─────────────────────────────────────────────────────────

export function getAllConvTags(): Record<string, ConvTag> {
  try {
    return JSON.parse(window.localStorage.getItem(CONV_TAGS_KEY) ?? '{}') as Record<string, ConvTag>;
  } catch { return {}; }
}

export function getConvTag(id: string): ConvTag | null {
  return getAllConvTags()[id] ?? null;
}

export function setConvTag(id: string, tag: ConvTag): void {
  const all = getAllConvTags();
  all[id] = tag;
  window.localStorage.setItem(CONV_TAGS_KEY, JSON.stringify(all));
}

export function removeConvTag(id: string): void {
  const all = getAllConvTags();
  delete all[id];
  window.localStorage.setItem(CONV_TAGS_KEY, JSON.stringify(all));
}

// ── Saved translations ────────────────────────────────────────────────────────

export function getSavedTranslations(): SavedTranslation[] {
  try {
    return JSON.parse(window.localStorage.getItem(TRANSL_SAVE_KEY) ?? '[]') as SavedTranslation[];
  } catch { return []; }
}

export function saveTranslation(data: Omit<SavedTranslation, 'id' | 'createdAt'>): SavedTranslation {
  const entry: SavedTranslation = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const list = [entry, ...getSavedTranslations()].slice(0, 100);
  window.localStorage.setItem(TRANSL_SAVE_KEY, JSON.stringify(list));
  return entry;
}

export function deleteSavedTranslation(id: string): void {
  const list = getSavedTranslations().filter(t => t.id !== id);
  window.localStorage.setItem(TRANSL_SAVE_KEY, JSON.stringify(list));
}
