// Ergonomic flat re-exports of the shared domain model. The types themselves
// live in @sagi/shared (the contract for engine + web); this file only aliases
// the `Domain` namespace so feature code can `import { Profile } from "../lib/types"`.
// No types are defined here — single source of truth stays in the shared package.
import type { Domain } from "@sagi/shared";

export type ID = Domain.ID;
export type ISODate = Domain.ISODate;
export type TimeseriesPoint = Domain.TimeseriesPoint;

export type User = Domain.User;
export type UserStatus = Domain.UserStatus;
export type Profile = Domain.Profile;

export type TokenReason = Domain.TokenReason;
export type TokenEntry = Domain.TokenEntry;
export type TokenSummary = Domain.TokenSummary;

export type LeaderboardEntry = Domain.LeaderboardEntry;

export type BountyStatus = Domain.BountyStatus;
export type SponsorType = Domain.SponsorType;
export type Bounty = Domain.Bounty;

export type Milestone = Domain.Milestone;
export type MetricSeries = Domain.MetricSeries;
export type ProgressOverview = Domain.ProgressOverview;

export type NodeStatus = Domain.NodeStatus;
export type NetworkNode = Domain.NetworkNode;
export type NetworkStats = Domain.NetworkStats;
export type NetworkSnapshot = Domain.NetworkSnapshot;

export type SessionStatus = Domain.SessionStatus;
export type Session = Domain.Session;
export type NewSessionInput = Domain.NewSessionInput;
