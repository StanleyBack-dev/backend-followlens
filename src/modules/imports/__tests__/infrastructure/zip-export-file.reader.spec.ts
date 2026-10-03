import { strToU8, zipSync } from "fflate";
import type { ImportSettings } from "@/modules/imports/application/imports.config";
import { ExportParseError } from "@/modules/imports/domain/instagram-export.parser";
import { ZipExportFileReader } from "@/modules/imports/infrastructure/file/zip-export-file.reader";

const connection = (value: string) => ({
  string_list_data: [
    { href: `https://www.instagram.com/${value}`, value, timestamp: 0 },
  ],
});

function followersJson(usernames: string[]): string {
  return JSON.stringify({
    relationships_followers: usernames.map(connection),
  });
}

function zipOf(entries: Record<string, string>): Buffer {
  const files: Record<string, Uint8Array> = {};
  for (const [name, content] of Object.entries(entries)) {
    files[name] = strToU8(content);
  }
  return Buffer.from(zipSync(files));
}

function reader(overrides: Partial<ImportSettings> = {}): ZipExportFileReader {
  return new ZipExportFileReader({
    dailyLimit: 10,
    maxFileBytes: 4 * 1024 * 1024,
    maxUnzippedBytes: 64 * 1024 * 1024,
    maxZipEntries: 64,
    ...overrides,
  });
}

describe("ZipExportFileReader", () => {
  it("extracts the followers file from a real .zip", () => {
    const zip = zipOf({
      "connections/followers_and_following/followers_1.json": followersJson([
        "ana",
        "bia",
      ]),
      "connections/followers_and_following/following.json": "{}",
    });

    const result = reader().read({ filename: "export.zip", buffer: zip });

    expect(result.map((f) => f.username)).toEqual(["ana", "bia"]);
  });

  it("reads a bare .json upload without unzipping", () => {
    const buffer = Buffer.from(followersJson(["ana"]), "utf8");

    const result = reader().read({ filename: "followers_1.json", buffer });

    expect(result.map((f) => f.username)).toEqual(["ana"]);
  });

  it("rejects a zip whose contents exceed the uncompressed budget", () => {
    const zip = zipOf({
      "followers_1.json": followersJson(["ana", "bia", "carol"]),
    });

    expect(() =>
      // Cap well below the entry's real uncompressed size.
      reader({ maxUnzippedBytes: 16 }).read({
        filename: "export.zip",
        buffer: zip,
      }),
    ).toThrow(ExportParseError);
  });

  it("rejects a zip with more entries than allowed", () => {
    const zip = zipOf({
      "followers_1.json": followersJson(["ana"]),
      "followers_2.json": followersJson(["bia"]),
    });

    expect(() =>
      reader({ maxZipEntries: 1 }).read({
        filename: "export.zip",
        buffer: zip,
      }),
    ).toThrow(ExportParseError);
  });

  it("errors when the zip has no followers json", () => {
    const zip = zipOf({ "readme.txt": "nothing here" });

    expect(() =>
      reader().read({ filename: "export.zip", buffer: zip }),
    ).toThrow(ExportParseError);
  });
});
