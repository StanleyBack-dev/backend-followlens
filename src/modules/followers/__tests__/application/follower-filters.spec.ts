import { AppException } from "@/common/exceptions/app-exception";
import type { FollowerRepositoryPort } from "@/modules/followers/application/ports/follower-repository.port";
import { ListFollowerEventsUseCase } from "@/modules/followers/application/use-cases/list-follower-events.use-case";
import {
  ListFollowerFilterOptionsUseCase,
  MAX_FILTER_OPTIONS,
  normalizeOptionSearch,
} from "@/modules/followers/application/use-cases/list-follower-filter-options.use-case";
import { ListFollowersUseCase } from "@/modules/followers/application/use-cases/list-followers.use-case";

const U = "user-1";
const page = { page: 1, limit: 20 };
const empty = { items: [], total: 0, page: 1, limit: 20, totalPages: 1 };

function repo(overrides: Partial<FollowerRepositoryPort> = {}) {
  return {
    existsByUsername: jest.fn(
      async (_userId: string, u: string) => u === "ana",
    ),
    list: jest.fn(async () => empty),
    listEvents: jest.fn(async () => empty),
    listFilterOptions: jest.fn(async () => []),
    listEventFilterOptions: jest.fn(async () => []),
    ...overrides,
  } as unknown as FollowerRepositoryPort & Record<string, jest.Mock>;
}

describe("follower filters", () => {
  it("filters followers by a known username", async () => {
    const followers = repo();
    await new ListFollowersUseCase(followers).execute(U, {
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
      new ListFollowersUseCase(followers).execute(U, {
        ...page,
        username: "zed",
      }),
    ).rejects.toBeInstanceOf(AppException);
    expect(followers.list).not.toHaveBeenCalled();
  });

  it("rejects an unknown username in the events filter", async () => {
    const followers = repo();
    await expect(
      new ListFollowerEventsUseCase(followers).execute(U, {
        ...page,
        username: "zed",
      }),
    ).rejects.toMatchObject({
      response: { code: "FOLLOWERS_UNKNOWN_FILTER_USER" },
    });
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
