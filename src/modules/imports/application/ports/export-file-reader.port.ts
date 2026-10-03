import type { ParsedFollower } from "@/modules/imports/domain/instagram-export.parser";

export type UploadedFile = {
  filename: string;
  buffer: Buffer;
};

export interface ExportFileReaderPort {
  /**
   * Extracts the followers list from an uploaded export (.json or .zip).
   * @throws ExportParseError when no followers list can be read.
   */
  read(file: UploadedFile): ParsedFollower[];
}

export const EXPORT_FILE_READER = Symbol("EXPORT_FILE_READER");
