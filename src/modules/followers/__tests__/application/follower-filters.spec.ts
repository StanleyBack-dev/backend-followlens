import { AppException } from "@/common/exceptions/app-exception";
import type { FollowerRepositoryPort } from "@/modules/followers/application/ports/follower-repository.port";
import { ListFollowerEventsUseCase } from "@/modules/followers/application/use-cases/list-follower-events.use-case";
import {
  ListFollowerFilterOptionsUseCase,
  MAX_FILTER_OPTIONS,
  normalizeOptionSearch,
} from "@/modules/followers/application/use-cases/list-follower-filter-options.use-case";
import { ListFollowersUseCase } from "@/modules/followers/application/use-cases/list-followers.use-case";
import { FollowerEventType } from "@/modules/followers/domain/enums/follower-event-type.enum";
import type { ClockPort } from "@/shared/application/ports/clock.port";

const U = "user-1";
const PRO = { id: U, pro: true };
const FREE = { id: U, pro: false };
const NOW = new Date("2026-10-03T12:00:00.000Z");
const limits = {
  freeImportIntervalDays: 7,
  freeHistoryDays: 30,
  freeProfiles: 1,
  proProfiles: 3,
};
const clock = { now: () => NOW } as unknown as ClockPort;
const page = { page: 1, limit: 20 };
const empty = { items: [], total: 0, page: 1, limit: 20, totalPages: 1 };

function repo(overrides: Partial<FollowerRepositoryPort> = {}) {
  return {
    existsByUsername: jest.fn(
      async (_userId: string, u: string) => u === "ana",
    ),
    list: jest.fn(async () => empty),
    listEvents: jest.fn(async () => empty),
    countEvents: jest.fn(async () => 0),
    listFilterOptions: jest.fn(async () => []),
    listEventFilterOptions: jest.fn(async () => []),
    ...overrides,
  } as unknown as FollowerRepositoryPort & Record<string, jest.Mock>;
}

describe("follower filters", () => {
  it("filters followers by a known username", async () => {
    const followers = repo();
    await new ListFollowersUseCase(followers).execute(PRO, {
      ...page,
      username: "ana",
    });
    expect(followers.list).toHaveBeenCalledWith(
      U,
      expect.objectContaining({ username: "ana" }),
    );
  });

  it("rejects an unknown username in the followers filter", async () => {
    const followers = repo();
    await expect(
      new ListFollowersUseCase(followers).execute(PRO, {
        ...page,
        username: "zed",
      }),
    ).rejects.toBeInstanceOf(AppException);
    expect(followers.list).not.toHaveBeenCalled();
  });

  it("rejects an unknown username in the events filter", async () => {
    const followers = repo();
    await expect(
      new ListFollowerEventsUseCase(followers, limits, clock).execute(PRO, {
        ...page,
        username: "zed",
      }),
    ).rejects.toMatchObject({
      response: { code: "FOLLOWERS_UNKNOWN_FILTER_USER" },
    });
  });

  it("blocks search and follower filters on the Free plan", async () => {
    const followers = repo();
    await expect(
      new ListFollowersUseCase(followers).execute(FREE, {
        ...page,
        search: "ana",
      }),
    ).rejects.toMatchObject({ response: { code: "BILLING_PRO_REQUIRED" } });
    await expect(
      new ListFollowerEventsUseCase(followers, limits, clock).execute(FREE, {
        ...page,
        username: "ana",
      }),
    ).rejects.toMatchObject({ response: { code: "BILLING_PRO_REQUIRED" } });
  });

  it("shows a Free user only recent unfollows and counts the rest as locked", async () => {
    const followers = repo({
      listEvents: jest.fn(async () => ({ ...empty, total: 3 })),
      countEvents: jest.fn(async () => 10),
    });

    const result = await new ListFollowerEventsUseCase(
      followers,
      limits,
      clock,
    ).execute(FREE, { ...page, type: FollowerEventType.LOST });

    expect(followers.listEvents).toHaveBeenCalledWith(U, {
      ...page,
      type: FollowerEventType.LOST,
      since: new Date("2026-09-03T12:00:00.000Z"),
    });
    expect(result.locked).toBe(7);
  });

  it("hides the names of new followers from a Free user", async () => {
    const followers = repo({ countEvents: jest.fn(async () => 4) });

    const result = await new ListFollowerEventsUseCase(
      followers,
      limits,
      clock,
    ).execute(FREE, { ...page, type: FollowerEventType.GAINED });

    expect(followers.listEvents).not.toHaveBeenCalled();
    expect(result).toMatchObject({ items: [], total: 0, locked: 4 });
  });

  it("caps the options and flags truncation", async () => {
    const many = Array.from({ length: MAX_FILTER_OPTIONS + 1 }, (_, i) => ({
      username: `u${i}`,
    }));
    const followers = repo({ listFilterOptions: jest.fn(async () => many) });
    const result = await new ListFollowerFilterOptionsUseCase(
      followers,
    ).forFollowers(U);
    expect(result.options).toHaveLength(MAX_FILTER_OPTIONS);
    expect(result.truncated).toBe(true);
  });

  it("normalizes the typed search, ignoring a leading @", async () => {
    const followers = repo();
    await new ListFollowerFilterOptionsUseCase(followers).forEvents(U, {
      search: "  @Ana ",
    });
    expect(followers.listEventFilterOptions).toHaveBeenCalledWith(
      U,
      expect.objectContaining({ search: "Ana" }),
    );
    expect(normalizeOptionSearch("   ")).toBeUndefined();
  });
});
