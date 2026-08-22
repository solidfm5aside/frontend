export type CompetitionGroupKey = 'A' | 'B';
export type CompetitionDivision = 'men' | 'women';
export type CompetitionTieBreaker =
  | 'points'
  | 'goal_difference'
  | 'goals_for'
  | 'head_to_head'
  | 'committee_decision';
export type CompetitionDrawMode = 'manual';
export type CompetitionCommitteeDecisionMethod = 'coin_toss' | 'draw' | 'other';

export interface CompetitionTeamSummary {
  _id: string;
  name: string;
  logo?: string;
  city?: string;
  division?: CompetitionDivision;
  registrationStatus?: 'pending' | 'registered' | 'withdrawn';
}

export interface CompetitionRules {
  teamCount: number;
  groupCount: number;
  teamsPerGroup: number;
  roundRobinLegs: 1 | 2 | null;
  qualifiersPerGroup: number | null;
  tieBreakers: CompetitionTieBreaker[];
  drawMode: CompetitionDrawMode | null;
  avoidSameGroupFirstRound: boolean | null;
  thirdPlaceMatch: boolean | null;
  maxRosterPlayers: number;
}

export interface QualificationSnapshotEntry {
  tournamentEntryId: string;
  teamId: string;
  groupKey: CompetitionGroupKey;
  rank: number;
  points: number;
  goalDifference: number;
  goalsFor: number;
}

export interface CompetitionTournament {
  _id: string;
  name: string;
  season: string;
  startDate: string;
  endDate?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  currentStage: string;
  fixturesGenerated: boolean;
  formatVersion: 2;
  format: 'two_group_knockout';
  workflowState: string;
  workflowRevision: number;
  competitionRules: CompetitionRules;
  qualificationSnapshot: QualificationSnapshotEntry[];
  championTeamId?: string;
  runnerUpTeamId?: string;
  thirdPlaceTeamId?: string;
  competitionCompletedAt?: string;
}

export interface CompetitionEntry {
  _id: string;
  tournamentId: string;
  teamId: CompetitionTeamSummary;
  teamNameSnapshot: string;
  teamLogoSnapshot?: string;
  groupKey?: CompetitionGroupKey;
  groupSlot?: number;
  tableSlot?: number;
  status: 'active' | 'withdrawn';
}

export interface CompetitionReadiness {
  isReadyForFixturePreview: boolean;
  blockers: string[];
  missingDecisions: string[];
  entryCount: number;
  groupCounts: Record<CompetitionGroupKey, number>;
  venueCount: number;
}

export interface CompetitionAllowedActions {
  editRules: boolean;
  editEntries: boolean;
  assignGroups: boolean;
  previewFixtures: boolean;
  publishFixtures: boolean;
  finalizeQualification: boolean;
  resolveTie: boolean;
  createDraw: boolean;
  progressKnockout: boolean;
}

export interface CompetitionBracketMatch {
  _id: string;
  status: 'scheduled' | 'live' | 'completed';
  homeTeam: CompetitionTeamSummary;
  awayTeam: CompetitionTeamSummary;
  winner?: CompetitionTeamSummary | string | null;
  homeScore: number;
  awayScore: number;
  shootoutScore?: { home?: number; away?: number };
  date: string | null;
  venue: string | null;
  scheduleStatus?: 'confirmed' | 'pending';
}

export interface CompetitionBracketNode {
  key: string;
  stage: string;
  slot: number;
  kind: 'championship' | 'third_place';
  homeTeam: CompetitionTeamSummary | null;
  awayTeam: CompetitionTeamSummary | null;
  winnerTeam: CompetitionTeamSummary | null;
  loserTeam: CompetitionTeamSummary | null;
  resolvedAt?: string | null;
  match: CompetitionBracketMatch | null;
}

export interface CompetitionBracketState {
  bracketVersion: 2;
  status: 'not_created' | 'active' | 'champion_decided';
  bracketId: string | null;
  sourceDrawId: string | null;
  revision: number | null;
  championTeam: CompetitionTeamSummary | null;
  runnerUpTeam: CompetitionTeamSummary | null;
  thirdPlaceTeam: CompetitionTeamSummary | null;
  championDecidedAt?: string | null;
  thirdPlaceDecidedAt?: string | null;
  stages: Record<string, CompetitionBracketNode[]>;
}

export interface CompetitionOverview {
  tournament: CompetitionTournament;
  entries: CompetitionEntry[];
  readiness: CompetitionReadiness;
  progress: {
    workflowState: string;
    workflowRevision: number;
    groupMatches: Record<string, number>;
    ranking?: CompetitionRankingSnapshot | null;
    latestDraw?: CompetitionDraw | null;
    bracket: CompetitionBracketState;
  };
  allowedActions: CompetitionAllowedActions;
}

export interface CompetitionFixture {
  matchId?: string;
  fixtureKey: string;
  officialNumber: number;
  groupKey: CompetitionGroupKey;
  leg: 1 | 2;
  round?: number;
  roundSlot?: number;
  homeEntryId: string;
  awayEntryId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  kickoffAt: string | null;
  venue: string | null;
  scheduleStatus: 'confirmed' | 'pending';
}

export interface CompetitionFixturePlan {
  tournamentId: string;
  tournamentRevision: number;
  totalMatches: number;
  confirmedCount: number;
  pendingCount: number;
  fixtures: CompetitionFixture[];
  planHash: string;
  status?: 'published' | 'not_published';
  timeZone?: string;
  sourceReference?: string;
}

export interface CompetitionOfficialFixtureInput {
  officialNumber: number;
  groupKey: CompetitionGroupKey;
  homeEntryId: string;
  awayEntryId: string;
  kickoffAt: string | null;
  venue: string | null;
}

export interface CompetitionDrawPairing {
  slot: number;
  homeEntryId: string;
  awayEntryId: string;
  homeTeamId: CompetitionTeamSummary | string;
  awayTeamId: CompetitionTeamSummary | string;
  kickoffAt?: string | null;
  venue?: string | null;
}

export interface CompetitionDraw {
  _id: string;
  stage: string;
  version: number;
  status: 'draft' | 'published' | 'superseded';
  mode: CompetitionDrawMode;
  pairings: CompetitionDrawPairing[];
  createdAt?: string;
  publishedAt?: string;
}

export interface GroupStandingRow {
  tournamentEntryId: string;
  groupKey: CompetitionGroupKey;
  groupSlot: number;
  rank: number;
  teamId: CompetitionTeamSummary;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export type GroupedStandings = Record<CompetitionGroupKey, GroupStandingRow[]>;

export interface CompetitionHeadToHeadStanding {
  teamId: string;
  played: number;
  points: number;
  goalDifference: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface CompetitionTieCluster {
  groupKey: CompetitionGroupKey;
  basisHash: string;
  startRank: number;
  endRank: number;
  teamIds: string[];
  affectsQualificationOrSeeding: boolean;
  headToHead: CompetitionHeadToHeadStanding[];
  resolved: boolean;
  orderedTeamIds?: string[];
  method?: CompetitionCommitteeDecisionMethod;
  note?: string;
  decidedAt?: string;
}

export interface CompetitionTieResolutionAuditEntry {
  decisionId: string;
  decisionRevision: number;
  status: 'active' | 'superseded';
  groupKey: CompetitionGroupKey;
  basisHash: string;
  tiedTeamIds: string[];
  orderedTeamIds: string[];
  method: CompetitionCommitteeDecisionMethod;
  note?: string;
  decidedBy?: string;
  decidedAt: string;
  supersededAt?: string;
  supersededByDecisionId?: string;
}

export interface CompetitionRankingSnapshot {
  groups: GroupedStandings;
  ties: CompetitionTieCluster[];
  unresolvedTies: CompetitionTieCluster[];
  staleResolutionBasisHashes: string[];
  groupStageComplete: boolean;
  canFinalizeQualification: boolean;
}

export interface CompetitionRankingState extends CompetitionRankingSnapshot {
  tournamentId: string;
  workflowRevision: number;
  rankingOrder: CompetitionTieBreaker[];
  headToHeadPolicy: string;
  resolutionHistory: CompetitionTieResolutionAuditEntry[];
}
