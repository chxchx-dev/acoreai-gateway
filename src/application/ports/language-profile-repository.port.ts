import type { LanguageProfileService } from 'src/modules/languages/application/services/language-profile.service';

export const LANGUAGE_PROFILE_REPOSITORY_PORT = Symbol('LANGUAGE_PROFILE_REPOSITORY_PORT');

/**
 * Import de solo-tipo (se borra en compilación, cero acoplamiento en runtime).
 * Los métodos devuelven resultados de Prisma con includes anidados; en vez
 * de reescribir esas formas a mano, el puerto las deriva del propio
 * servicio — la clase concreta sigue siendo la fuente de verdad del shape.
 */
export type LanguageProfileRepositoryPort = Pick<
  LanguageProfileService,
  'getOrCreate' | 'getDashboard' | 'selectTitle' | 'getAvailableTitles'
>;
