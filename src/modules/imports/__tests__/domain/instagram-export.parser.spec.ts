import {
  ExportParseError,
  parseFollowersJson,
} from "@/modules/imports/domain/instagram-export.parser";

// Shape of Instagram's real followers_1.json entries.
const connection = (value: string, ts?: number) => ({
  string_list_data: [
    { href: `https://www.instagram.com/${value}`, value, timestamp: ts },
  ],
});

describe("parseFollowersJson", () => {
  it("parses the wrapped relationships_followers format", () => {
    const file = JSON.stringify({
      relationships_followers: [
        connection("ana", 1700000000),
        connection("bia"),
      ],
    });
    const result = parseFollowersJson(file);
    expect(result.map((f) => f.username)).toEqual(["ana", "bia"]);
    expect(result[0].followedAt).toEqual(new Date(1700000000 * 1000));
    expect(result[1].followedAt).toBeNull();
  });

  it("parses a bare array and normalizes usernames", () => {
    const result = parseFollowersJson(
      JSON.stringify([connection("@Ana"), connection("BIA")]),
    );
    expect(result.map((f) => f.username)).toEqual(["ana", "bia"]);
  });

  it("dedupes repeated usernames keeping the earliest date", () => {
    const result = parseFollowersJson(
      JSON.stringify([
        connection("ana", 1700000500),
        connection("ana", 1700000000),
      ]),
    );
    expect(result).toHaveLength(1);
    expect(result[0].followedAt).toEqual(new Date(1700000000 * 1000));
  });

  it("refuses a 'following' file so it can't wipe the list", () => {
    const file = JSON.stringify({
      relationships_following: [connection("ana")],
    });
    expect(() => parseFollowersJson(file)).toThrow(ExportParseError);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseFollowersJson("not json")).toThrow(ExportParseError);
  });

  it("skips entries without a usable username", () => {
    const result = parseFollowersJson(
      JSON.stringify([
        connection("ana"),
        { string_list_data: [{ value: "!!!" }] },
      ]),
    );
    expect(result.map((f) => f.username)).toEqual(["ana"]);
  });
});
