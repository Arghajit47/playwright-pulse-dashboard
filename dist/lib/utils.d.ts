import { type ClassValue } from "clsx";
export declare function cn(...inputs: ClassValue[]): string;
export declare function ansiToHtml(text: string | null | undefined): string;
/**
 * Converts a string containing ANSI escape codes into a plain text string.
 * It does this by splitting the string by the escape codes and only keeping
 * the segments that are not escape codes.
 *
 * @param text The input string, possibly containing ANSI codes.
 * @returns A plain text string with all ANSI codes removed.
 */
export declare function ansiToText(text: string | null | undefined): string;
/**
 * Generates the correct public URL for an asset.
 * It expects the input path to be relative to the 'pulse-report' directory,
 * or specifically, if it starts with 'attachments/', it assumes it's relative
 * from 'pulse-report/attachments/'.
 * @param pathFromReport The path string from the report data.
 *                       e.g., "attachments/folder/image.png" or "folder/image.png" if attachments is implied.
 * @returns A string URL to fetch the asset, or "#" if the path is invalid.
 */
export declare function getAssetPath(pathFromReport: string | undefined | null): string;
//# sourceMappingURL=utils.d.ts.map