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
  /** Only events from this instant on. */
  since?: Date;
};

/** One entry of the "filter by follower" combobox. */
export type FollowerFilterOption = {
  username: string;
};

export type FollowerCounts = {
  active: number;
  lost: number;
};

// Every method is scoped to a single profile id.
export interface FollowerRepositoryPort {
  findAllKnown(profileId: string): Promise<KnownFollower[]>;
  /** Persists the whole change set atomically (single transaction). */
  applyChangeSet(profileId: string, changes: SnapshotChangeSet): Promise<void>;
  countByStatus(profileId: string): Promise<FollowerCounts>;
  countEventsSince(
    profileId: string,
    type: FollowerEventType,
    since: Date,
  ): Promise<number>;
  list(
    profileId: string,
    filters: ListFollowersFilters,
  ): Promise<Paginated<FollowerView>>;
  listEvents(
    profileId: string,
    filters: ListFollowerEventsFilters,
  ): Promise<Paginated<FollowerEventView>>;
  /** Events of a type in [from, to). */
  countEventsBetween(
    profileId: string,
    type: FollowerEventType,
    from: Date,
    to: Date,
  ): Promise<number>;
  /** Total events of the user, optionally of a single type. */
  countEvents(profileId: string, type?: FollowerEventType): Promise<number>;
  listFilterOptions(
    profileId: string,
    criteria: { status?: FollowerStatus; search?: string; limit: number },
  ): Promise<FollowerFilterOption[]>;
  listEventFilterOptions(
    profileId: string,
    criteria: { type?: FollowerEventType; search?: string; limit: number },
  ): Promise<FollowerFilterOption[]>;
  existsByUsername(profileId: string, username: string): Promise<boolean>;
  findUnnotifiedEvents(
    profileId: string,
    type: FollowerEventType,
  ): Promise<FollowerEventView[]>;
  markEventsNotified(profileId: string, ids: string[], at: Date): Promise<void>;
}

export const FOLLOWER_REPOSITORY = Symbol("FOLLOWER_REPOSITORY");
