// Sanctions NAME screening (person / company / vessel / aircraft against the sanctions lists). Sanctions only: no PEP, no adverse media, no ID document checks.

export type NameSubjectType = "PERSON" | "ENTITY" | "VESSEL" | "AIRCRAFT";
export type NameIdentifierType =
  | "PASSPORT"
  | "NATIONAL_ID"
  | "TAX_ID"
  | "REGISTRATION_NUMBER"
  | "LEI"
  | "IMO"
  | "OTHER";
/** CLEAR is the only clean outcome. Treat any value you do not know as REVIEW. */
export type NameOutcome = "CLEAR" | "REVIEW" | "CONFIRMED_MATCH";
export type NameMatchStrength = "CONSERVATIVE" | "BALANCED" | "STRICT";
export type NameReasonOutcome = "MATCH" | "PARTIAL" | "CONTRADICTS" | "ABSENT";

export interface NameIdentifier {
  type: NameIdentifierType | string;
  value: string;
  /** ISO 3166-1 alpha-2 of the issuing country. */
  country?: string | null;
}

export interface NameScreenRequest {
  name: string;
  /** Omitted = any type. */
  type?: NameSubjectType | null;
  /** Other names of the same subject; each is screened too. */
  aliases?: string[];
  /** YYYY-MM-DD, YYYY-MM or YYYY. */
  dateOfBirth?: string | null;
  /** ISO 3166-1 alpha-2 codes. */
  nationalities?: string[];
  /** Country of establishment (companies). */
  country?: string | null;
  identifiers?: NameIdentifier[];
  /** Also add the subject to the monitored list (plan-limited). */
  monitor?: boolean;
}

export interface NameListedEntity {
  source: string;
  subjectId: string;
  name: string;
  type: NameSubjectType | "UNKNOWN";
  programs: string[];
  listedDate: string | null;
}

export interface NameMatchReason {
  /** dob | country | type | id:<TYPE> */
  field: string;
  outcome: NameReasonOutcome;
  points: number;
  detail?: string | null;
}

export interface NameMatchDecision {
  value: "TRUE_MATCH" | "FALSE_POSITIVE";
  reason: string;
  decidedBy: string;
  decidedAt: string;
  /** true when applied from memory: same subject, same listed entry, unchanged list version. */
  autoApplied: boolean;
}

export interface NameHit {
  hitId: string;
  listedEntity: NameListedEntity;
  score: number;
  nameScore: number;
  matchedName: string | null;
  matchedAliasQuality: "PRIMARY" | "STRONG" | "WEAK";
  matchedFields: string[];
  conflictFields: string[];
  reasons: NameMatchReason[];
  explanation: string;
  engineDecision: "REVIEW" | "CONFIRMED";
  /** Content hash of the listed entry this hit was scored against. */
  listVersion: string;
  decision: NameMatchDecision | null;
}

export interface NameCoverage {
  source: string;
  state: "ANALYZED" | "NOT_ANALYZED";
  reason?: string | null;
}

export interface NameScreenResponse {
  screeningId: string;
  subjectRef: string | null;
  outcome: NameOutcome;
  /** ALLOW_LIST / BLOCK_LIST when a tenant list decided before fuzzy matching. */
  listMatch: "ALLOW_LIST" | "BLOCK_LIST" | null;
  policyVersion: string;
  strength: NameMatchStrength;
  threshold: number;
  listsVersion: Record<string, string>;
  coverage: NameCoverage[];
  hits: NameHit[];
  caseRef: string | null;
  createdAt: string;
  /** true when this is the stored result of an earlier request with the same idempotency key. */
  replayed: boolean;
}

export interface NameDecisionRequest {
  hitId: string;
  value: "TRUE_MATCH" | "FALSE_POSITIVE";
  /** Required; kept in the audit trail. */
  reason: string;
}

export interface NameScreenOptions {
  /** Same key within 24 h returns the stored result and is not counted again. */
  idempotencyKey?: string;
}

export interface NameScreeningHistoryItem {
  screeningId: string;
  createdAt: string;
  origin: string;
  actor: string | null;
  name: string | null;
  outcome: NameOutcome;
  topScore: number | null;
  hitCount: number;
  caseRef: string | null;
}

/** True only for a completed screening whose outcome is CLEAR. Anything else needs a person to look. */
export function isNameClear(r: Pick<NameScreenResponse, "outcome">): boolean {
  return r.outcome === "CLEAR";
}
