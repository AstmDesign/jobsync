export interface MatchResult {
  id: string;
  userId?: string;
  jobId?: string | null;
  jobTitle: string;
  company?: string | null;
  matchScore?: number | null;
  // JSON-stringified JobMatchData — parse with JSON.parse before rendering.
  matchData: string;
  createdAt: Date;
}
