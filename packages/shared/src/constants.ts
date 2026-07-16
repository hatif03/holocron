/** Local auth user — seeded in Postgres for single-user mode. */
export const LOCAL_USER_ID = "00000000-0000-0000-0000-000000000001";

/** Supermemory containerTag for a research work. */
export function workTag(workId: string): string {
  return `work_${workId}`;
}

/** Supermemory containerTag for a user profile. */
export function userTag(userId: string = LOCAL_USER_ID): string {
  return `user_${userId}`;
}

/** Hybrid search similarity threshold — permissive for local demo recall. */
export const SUPERMEMORY_SEARCH_THRESHOLD = 0.3;

/** Holocron-specific LLM filter for Supermemory memory extraction. */
export const SUPERMEMORY_FILTER_PROMPT =
  "This is Holocron, a research paper generation app. " +
  "containerTag is work_{workId} or user_{userId}. " +
  "We store research context, literature references, agent planner/writer/reviewer " +
  "outputs, and user preferences for academic writing.";
