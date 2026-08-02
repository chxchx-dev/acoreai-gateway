import { Injectable } from '@nestjs/common';
import { LanguageLessonService } from 'src/modules/languages/application/services/language-lesson.service';
import { LanguageLessonRepositoryPort } from 'src/application/ports/language-lesson-repository.port';

@Injectable()
export class LanguageLessonRepositoryAdapter implements LanguageLessonRepositoryPort {
  constructor(private readonly lessonService: LanguageLessonService) {}

  startLesson(...args: Parameters<LanguageLessonService['startLesson']>) {
    return this.lessonService.startLesson(...args);
  }

  completeLesson(...args: Parameters<LanguageLessonService['completeLesson']>) {
    return this.lessonService.completeLesson(...args);
  }
}
