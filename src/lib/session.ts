import type { TeamId } from "./types";

const KEY = "rank-rush:team-names";

/** Matches the maxLength on the setup inputs, so a tampered value cannot exceed it. */
const MAX_LENGTH = 28;

export type TeamNames = Record<TeamId, string>;

/**
 * sessionStorage rather than localStorage on purpose: names belong to the tab
 * the group is playing in. Two groups on one machine keep their own names, and
 * closing the tab ends the session rather than greeting the next players with
 * someone else's team.
 *
 * Every access is wrapped: reading storage *throws* rather than returning null
 * when a browser has it disabled or a private window has filled its quota, and
 * a party game should degrade to forgetful, never to a blank page.
 */
function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Stored names for this tab, or null if there are none to restore. */
export function readTeamNames(): TeamNames | null {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { A, B } = parsed as Partial<TeamNames>;
    if (typeof A !== "string" || typeof B !== "string") return null;
    return { A: A.slice(0, MAX_LENGTH), B: B.slice(0, MAX_LENGTH) };
  } catch {
    // Unparseable or unreadable: fall back to the defaults rather than throwing
    // during render.
    return null;
  }
}

export function writeTeamNames(names: TeamNames): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(names));
  } catch {
    // Quota or a disabled store. Nothing to do; the game plays fine unsaved.
  }
}
