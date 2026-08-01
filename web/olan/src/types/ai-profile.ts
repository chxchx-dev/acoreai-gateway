export type PreferredMode = 'explore' | 'languages' | 'both';
export type EnglishLevel = 'beginner' | 'intermediate' | 'advanced' | 'unknown';
export type CorrectionStyle = 'soft' | 'balanced' | 'strict';
export type PracticeStyle =
  | 'free_conversation'
  | 'guided_situations'
  | 'qa'
  | 'roleplay'
  | 'interview'
  | 'academic_presentation';

export interface UserAiProfile {
  userId: string;
  preferredMode: PreferredMode;
  mainGoal: string;
  englishLevel: EnglishLevel;
  interestTopics: string[];
  correctionStyle: CorrectionStyle;
  practiceStyle: PracticeStyle;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompleteAiOnboardingRequest {
  preferredMode: PreferredMode;
  mainGoal: string;
  englishLevel: EnglishLevel;
  interestTopics: string[];
  correctionStyle: CorrectionStyle;
  practiceStyle: PracticeStyle;
}
