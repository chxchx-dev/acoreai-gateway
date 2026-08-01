export enum Platform {
  OLAN = 'olan',
  ALANIA = 'alania',
}

const SOURCE_PLATFORM: Record<string, Platform> = {
  'olan-app':     Platform.OLAN,
  'olan-web':     Platform.OLAN,
  'olan-mobile':  Platform.OLAN,
  'alania-web':   Platform.ALANIA,
  'alania-app':   Platform.ALANIA,
};

export function resolvePlatform(source?: string): Platform {
  if (!source) return Platform.ALANIA;
  const s = source.trim().toLowerCase();
  if (SOURCE_PLATFORM[s]) return SOURCE_PLATFORM[s];
  if (s.startsWith('olan-')) return Platform.OLAN;
  return Platform.ALANIA;
}
