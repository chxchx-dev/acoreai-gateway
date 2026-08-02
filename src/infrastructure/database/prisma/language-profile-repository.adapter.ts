import { Injectable } from '@nestjs/common';
import { LanguageProfileService } from 'src/modules/languages/application/services/language-profile.service';
import { LanguageProfileRepositoryPort } from 'src/application/ports/language-profile-repository.port';

@Injectable()
export class LanguageProfileRepositoryAdapter implements LanguageProfileRepositoryPort {
  constructor(private readonly profileService: LanguageProfileService) {}

  getOrCreate(...args: Parameters<LanguageProfileService['getOrCreate']>) {
    return this.profileService.getOrCreate(...args);
  }

  getDashboard(...args: Parameters<LanguageProfileService['getDashboard']>) {
    return this.profileService.getDashboard(...args);
  }

  selectTitle(...args: Parameters<LanguageProfileService['selectTitle']>) {
    return this.profileService.selectTitle(...args);
  }

  getAvailableTitles(...args: Parameters<LanguageProfileService['getAvailableTitles']>) {
    return this.profileService.getAvailableTitles(...args);
  }
}
