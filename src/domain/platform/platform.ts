export enum Platform {
  ACOREAI = 'acoreai',
}

const SOURCE_PLATFORM: Record<string, Platform> = {
  'acoreai-web':   Platform.ACOREAI,
  'acoreai-app':   Platform.ACOREAI,
  'acoreai-mobile': Platform.ACOREAI,
  'acoreai-voice': Platform.ACOREAI,
  'acoreai-system': Platform.ACOREAI,
};

export function resolvePlatform(source?: string): Platform {
  if (!source) return Platform.ACOREAI;
  const s = source.trim().toLowerCase();
  if (SOURCE_PLATFORM[s]) return SOURCE_PLATFORM[s];
  return Platform.ACOREAI;
}
