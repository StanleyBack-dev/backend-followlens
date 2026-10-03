import type { FollowerEventType } from "@/modules/followers/domain/enums/follower-event-type.enum";
import type { FollowerStatus } from "@/modules/followers/domain/enums/follower-status.enum";
import type {
  FollowerSnapshotEntry,
  KnownFollower,
} from "@/modules/followers/domain/types/follower.types";
import type { PageRequest, Paginated } from "@/shared/application/pagination";

export type NewFollowerEvent = {
  username: string;
  type: FollowerEventType;
  importId: string;
};

export type SnapshotChangeSet = {
  observedAt: Date;
  /** Everyone in the snapshot: upserted as ACTIVE. */
  current: FollowerSnapshotEntry[];
  /** Usernames of previously active followers missing from the snapshot. */
  lostUsernames: string[];
  events: NewFollowerEvent[];
};

export type FollowerView = {
  username: string;
  status: FollowerStatus;
  followedAt: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lostAt: Date | null;
};

export type FollowerEventView = {
  id: string;
  username: string;
  type: FollowerEventType;
  importId: string;
  occurredAt: Date;
  notifiedAt: Date | null;
};

export type ListFollowersFilters = PageRequest & {
  status?: FollowerStatus;
  search?: string;
  username?: string;
};

export type ListFollowerEventsFilters = PageRequest & {
  type?: FollowerEventType;
  username?: string;
};

/** One entry of the "filter by follower" combobox. */
export type FollowerFilterOption = {
  username: string;
};

export type FollowerCounts = {
  active: number;
  lost: number;
};

// Every method is scoped to a single owner user id.
export interface FollowerRepositoryPort {
  findAllKnown(userId: string): Promise<KnownFollower[]>;
  /** Persists the whole change set atomically (single transaction). */
  applyChangeSet(userId: string, changes: SnapshotChangeSet): Promise<void>;
  countByStatus(userId: string): Promise<FollowerCounts>;
  countEventsSince(
    userId: string,
    type: FollowerEventType,
    since: Date,
  ): Promise<number>;
  list(
    userId: string,
    filters: ListFollowersFilters,
  ): Promise<Paginated<FollowerView>>;
  listEvents(
    userId: string,
    filters: ListFollowerEventsFilters,
  ): Promise<Paginated<FollowerEventView>>;
  listFilterOptions(
    userId: string,
    criteria: { status?: FollowerStatus; search?: string; limit: number },
  ): Promise<FollowerFilterOption[]>;
  listEventFilterOptions(
    userId: string,
    criteria: { type?: FollowerEventType; search?: string; limit: number },
  ): Promise<FollowerFilterOption[]>;
  existsByUsername(userId: string, username: string): Promise<boolean>;
  findUnnotifiedEvents(
    userId: string,
    type: FollowerEventType,
  ): Promise<FollowerEventView[]>;
  markEventsNotified(userId: string, ids: string[], at: Date): Promise<void>;
}

export const FOLLOWER_REPOSITORY = Symbol("FOLLOWER_REPOSITORY");
