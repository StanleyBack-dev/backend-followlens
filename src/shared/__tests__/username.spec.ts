import { normalizeUsername } from "@/shared/domain/username";

describe("normalizeUsername", () => {
  it("lowercases and strips a leading @", () => {
    expect(normalizeUsername("@Fulano")).toBe("fulano");
  });

  it("extracts the handle from a profile URL", () => {
    expect(normalizeUsername("https://www.instagram.com/some.user/")).toBe(
      "some.user",
    );
  });

  it("keeps dots and underscores", () => {
    expect(normalizeUsername("a_b.c")).toBe("a_b.c");
  });

  it("rejects invalid handles", () => {
    expect(normalizeUsername("   ")).toBeNull();
    expect(normalizeUsername("has spaces")).toBeNull();
    expect(normalizeUsername("inválido!")).toBeNull();
  });
});
