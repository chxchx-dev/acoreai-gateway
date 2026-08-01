export const MAX_EXAM_ATTEMPTS = 2;
export const EXAM_PASS_SCORE = 80;
export const EXAM_XP_REWARD = 20;
export const LESSON_XP_REWARD = 10;
export const HIDDEN_LEVEL_XP_REWARD = 15;

export function getReviewLessonsForExam(examType: 'PRE_TEST' | 'MIDTERM' | 'FINAL_EXAM'): { start: number; end: number } {
  switch (examType) {
    case 'PRE_TEST':   return { start: 1,  end: 10 };
    case 'MIDTERM':    return { start: 11, end: 20 };
    case 'FINAL_EXAM': return { start: 21, end: 30 };
  }
}
