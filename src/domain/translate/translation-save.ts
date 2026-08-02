export interface TranslationSaveInput {
  userId: string;
  title: string;
  text: string;
  translations: Record<string, string>;
  langs: string[];
}

export interface TranslationSaveRecord {
  id: string;
  userId: string;
  title: string;
  text: string;
  translations: Record<string, string>;
  langs: string[];
  createdAt: string;
}
