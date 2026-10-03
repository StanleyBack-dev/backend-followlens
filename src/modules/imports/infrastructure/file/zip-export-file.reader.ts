import { Inject, Injectable } from "@nestjs/common";
import { unzipSync, strFromU8, type UnzipFileInfo } from "fflate";
import {
  IMPORT_SETTINGS,
  type ImportSettings,
} from "@/modules/imports/application/imports.config";
import type {
  ExportFileReaderPort,
  UploadedFile,
} from "@/modules/imports/application/ports/export-file-reader.port";
import {
  ExportParseError,
  type ParsedFollower,
  parseFollowersJson,
} from "@/modules/imports/domain/instagram-export.parser";

// Inside the export zip, the followers list is a JSON file whose name contains
// "followers" (e.g. connections/followers_and_following/followers_1.json).
const FOLLOWERS_ENTRY = /followers.*\.json$/i;
const ANY_JSON = /\.json$/i;

// Signals that a .zip exceeded a safety cap while being read; thrown from the
// unzip filter and converted to a user-facing ExportParseError.
class ZipLimitError extends Error {}

@Injectable()
export class ZipExportFileReader implements ExportFileReaderPort {
  constructor(
    @Inject(IMPORT_SETTINGS) private readonly settings: ImportSettings,
  ) {}

  read(file: UploadedFile): ParsedFollower[] {
    const isZip =
      file.filename.toLowerCase().endsWith(".zip") ||
      this.looksZip(file.buffer);
    const content = isZip
      ? this.extractFromZip(file.buffer)
      : file.buffer.toString("utf8");
    return parseFollowersJson(content);
  }

  private looksZip(buffer: Buffer): boolean {
    // ZIP local file header magic "PK\x03\x04".
    return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
  }

  private extractFromZip(buffer: Buffer): string {
    const files = this.unzip(buffer);

    const names = Object.keys(files);
    const followersName =
      names.find((name) => FOLLOWERS_ENTRY.test(name)) ??
      names.find((name) => ANY_JSON.test(name));
    if (!followersName) {
      throw new ExportParseError(
        "O .zip não contém o arquivo de seguidores (followers_*.json).",
      );
    }
    return strFromU8(files[followersName]);
  }

  // Zip-bomb guard: only JSON entries are inflated (the filter returning false
  // skips decompression entirely), and we cap both the entry count and the
  // total DECLARED uncompressed size before any entry is inflated. The HTTP
  // layer already bounds the compressed upload, so the two together keep a
  // crafted archive from exhausting memory.
  private unzip(buffer: Buffer): Record<string, Uint8Array> {
    let entries = 0;
    let unzippedBudget = this.settings.maxUnzippedBytes;

    const filter = (file: UnzipFileInfo): boolean => {
      if (!ANY_JSON.test(file.name)) return false;
      entries += 1;
      if (entries > this.settings.maxZipEntries) {
        throw new ZipLimitError("too many entries");
      }
      unzippedBudget -= file.originalSize;
      if (file.originalSize > this.settings.maxUnzippedBytes || unzippedBudget < 0) {
        throw new ZipLimitError("uncompressed size over limit");
      }
      return true;
    };

    try {
      return unzipSync(new Uint8Array(buffer), { filter });
    } catch (error) {
      if (error instanceof ZipLimitError) {
        throw new ExportParseError(
          "O arquivo .zip é grande demais quando descompactado.",
        );
      }
      throw new ExportParseError("Não foi possível abrir o arquivo .zip.");
    }
  }
}
