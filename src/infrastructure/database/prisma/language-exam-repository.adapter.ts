import { Injectable } from '@nestjs/common';
import { LanguageExamService } from 'src/modules/languages/application/services/language-exam.service';
import { LanguageExamRepositoryPort } from 'src/application/ports/language-exam-repository.port';

@Injectable()
export class LanguageExamRepositoryAdapter implements LanguageExamRepositoryPort {
  constructor(private readonly examService: LanguageExamService) {}

  submitAttempt(...args: Parameters<LanguageExamService['submitAttempt']>) {
    return this.examService.submitAttempt(...args);
  }

  getExam(...args: Parameters<LanguageExamService['getExam']>) {
    return this.examService.getExam(...args);
  }
}
