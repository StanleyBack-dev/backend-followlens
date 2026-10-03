import { FollowerStatus } from "@/modules/followers/domain/enums/follower-status.enum";
import { computeFollowerDiff } from "@/modules/followers/domain/services/follower-diff";
import type {
  FollowerSnapshotEntry,
  KnownFollower,
} from "@/modules/followers/domain/types/follower.types";

const entry = (username: string): FollowerSnapshotEntry => ({
  username,
  followedAt: null,
});

const known = (username: string, status: FollowerStatus): KnownFollower => ({
  username,
  status,
});

describe("computeFollowerDiff", () => {
  it("detects who stopped following", () => {
    const diff = computeFollowerDiff(
      [
        known("ana", FollowerStatus.ACTIVE),
        known("bia", FollowerStatus.ACTIVE),
      ],
      [entry("ana")],
    );
    expect(diff.lost.map((f) => f.username)).toEqual(["bia"]);
    expect(diff.gained).toHaveLength(0);
  });

  it("separates brand-new followers from returning ones", () => {
    const diff = computeFollowerDiff(
      [known("ana", FollowerStatus.ACTIVE), known("bia", FollowerStatus.LOST)],
      [entry("ana"), entry("bia"), entry("caio")],
    );
    expect(diff.gained.map((f) => f.username)).toEqual(["caio"]);
    expect(diff.returned.map((f) => f.username)).toEqual(["bia"]);
    expect(diff.lost).toHaveLength(0);
  });

  it("ignores followers already marked as lost", () => {
    const diff = computeFollowerDiff([known("zed", FollowerStatus.LOST)], []);
    expect(diff.lost).toHaveLength(0);
  });

  it("dedupes entries repeated in the file", () => {
    const diff = computeFollowerDiff(
      [],
      [entry("ana"), entry("ana"), entry("bia")],
    );
    expect(diff.current).toHaveLength(2);
  });
});
