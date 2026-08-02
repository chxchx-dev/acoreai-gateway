export function getRequiredXpForLevel(currentLevel: number): number {
  if (currentLevel < 10) return 100;
  if (currentLevel < 20) return 150;
  if (currentLevel < 50) return 200;
  if (currentLevel < 100) return 250;
  return 300;
}

export function computeLevelUp(currentLevel: number, currentXp: number, gained: number): {
  newLevel: number;
  newCurrentXp: number;
  levelsGained: number;
} {
  let level = currentLevel;
  let xp = currentXp + gained;
  let levelsGained = 0;

  while (xp >= getRequiredXpForLevel(level)) {
    xp -= getRequiredXpForLevel(level);
    level++;
    levelsGained++;
  }

  return { newLevel: level, newCurrentXp: xp, levelsGained };
}
