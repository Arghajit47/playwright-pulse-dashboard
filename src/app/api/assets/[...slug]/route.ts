// File: app/api/assets/[...slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';

const PULSE_REPORT_ROOT_FROM_PROJECT_ROOT = 'pulse-report';
const ATTACHMENTS_FOLDER_NAME = 'attachments';
const ATTACHMENTS_BASE_PATH = path.resolve(process.cwd(), PULSE_REPORT_ROOT_FROM_PROJECT_ROOT, ATTACHMENTS_FOLDER_NAME);

// Initial log to confirm paths on server start (or first request in dev)
console.log(`[API ASSETS] Initializing:`);
console.log(`[API ASSETS] Project Root (process.cwd()): ${process.cwd()}`);
console.log(`[API ASSETS] Resolved Attachments Base Path: ${ATTACHMENTS_BASE_PATH}`);
try {
    if (fs.existsSync(ATTACHMENTS_BASE_PATH)) {
        console.log(`[API ASSETS] ATTACHMENTS_BASE_PATH (${ATTACHMENTS_BASE_PATH}) exists.`);
    } else {
        console.error(`[API ASSETS] CRITICAL: ATTACHMENTS_BASE_PATH (${ATTACHMENTS_BASE_PATH}) does NOT exist.`);
    }
} catch (e: any) {
    console.error(`[API ASSETS] CRITICAL: Error checking ATTACHMENTS_BASE_PATH: ${e.message}`);
}


export async function GET(
  request: NextRequest,
  context: { params: { slug: string[] } } // Use 'context' or any other name for the second argument
) {
  const slug = context.params.slug; // Then access slug via context.params.slug
  console.log(`[API ASSETS] Params slug:`, slug);
  // ...
  const requestedPathParts = slug; // Use the extracted slug

  try {
    const requestedPathParts = slug;
    if (!requestedPathParts || requestedPathParts.length === 0) {
      console.warn("[API ASSETS] File path (slug) is missing");
      return new NextResponse("File path is required", { status: 400 });
    }
    const relativePath = requestedPathParts.join("/");
    console.log(`[API ASSETS] Relative path from slug: ${relativePath}`);

    if (relativePath.includes("..")) {
      console.warn(`[API ASSETS] Invalid path (contains ..): ${relativePath}`);
      return new NextResponse("Invalid path", { status: 400 });
    }

    const filePath = path.join(ATTACHMENTS_BASE_PATH, relativePath);
    console.log(`[API ASSETS] Attempting to access file at: ${filePath}`);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      console.log(`[API ASSETS] File FOUND: ${filePath}`);
      const fileBuffer = fs.readFileSync(filePath);
      const mimeType = mime.lookup(filePath) || "application/octet-stream";

      const headers = new Headers();
      headers.set("Content-Type", mimeType);
      headers.set("Content-Length", fileBuffer.length.toString());

      if (path.extname(filePath).toLowerCase() === ".zip") {
        headers.set(
          "Content-Disposition",
          `attachment; filename="${path.basename(filePath)}"`
        );
      }
      return new NextResponse(fileBuffer, { status: 200, headers: headers });
    } else {
      console.warn(
        `[API ASSETS] File does NOT exist or is not a file at: ${filePath}`
      );

      // Log parent directory of the base path
      const projectRootContents = fs.readdirSync(process.cwd());
      console.log(
        `[API ASSETS] Contents of Project Root (${process.cwd()}): `,
        projectRootContents.slice(0, 15)
      ); // Log first 15 items

      // Log contents of the attachments base path
      if (
        fs.existsSync(ATTACHMENTS_BASE_PATH) &&
        fs.statSync(ATTACHMENTS_BASE_PATH).isDirectory()
      ) {
        const baseDirContents = fs.readdirSync(ATTACHMENTS_BASE_PATH);
        console.log(
          `[API ASSETS] Contents of ATTACHMENTS_BASE_PATH (${ATTACHMENTS_BASE_PATH}): `,
          baseDirContents.slice(0, 10)
        ); // Log first 10 items
      } else {
        console.warn(
          `[API ASSETS] ATTACHMENTS_BASE_PATH (${ATTACHMENTS_BASE_PATH}) does not exist or is not a directory when checking contents.`
        );
      }

      // Log contents of the specific subfolder if possible
      const subfolderPath = path.dirname(filePath);
      console.log(
        `[API ASSETS] Checking contents of expected parent directory for the file: ${subfolderPath}`
      );
      if (
        subfolderPath !== ATTACHMENTS_BASE_PATH &&
        fs.existsSync(subfolderPath) &&
        fs.statSync(subfolderPath).isDirectory()
      ) {
        const subfolderDirContents = fs.readdirSync(subfolderPath);
        console.log(
          `[API ASSETS] Contents of ${subfolderPath}: `,
          subfolderDirContents
        );
      } else if (subfolderPath === ATTACHMENTS_BASE_PATH) {
        console.log(
          `[API ASSETS] Expected parent directory is the same as ATTACHMENTS_BASE_PATH. Already logged its contents.`
        );
      } else {
        console.warn(
          `[API ASSETS] Expected parent directory ${subfolderPath} does not exist or is not a directory.`
        );
      }

      return new NextResponse("File not found", { status: 404 });
    }
  } catch (error: any) {
    console.error(
      `[API ASSETS] Error serving asset /api/assets/${slug.join("/")}:`,
      error
    );
    return new NextResponse("Internal server error", { status: 500 });
  }
}