export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}

export function getSavedScores(): SavedScore[] {
  try {
    const stored = localStorage.getItem("av_scores");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveScore(entry: Omit<SavedScore, "at">): void {
  try {
    const all = getSavedScores();
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem("av_scores", JSON.stringify(all));
  } catch {
    // localStorage unavailable — no-op
  }
}
