export interface MemoryHit {
  text: string;
  score?: number;
  customId?: string;
  metadata?: Record<string, string | number | boolean>;
  type?: string;
}

export interface MemoryProfile {
  static: string[];
  dynamic: string[];
}
