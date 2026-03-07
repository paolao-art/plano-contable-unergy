/**
 * GET /api/project-images
 * Reads the images spreadsheet and fetches the first image from each project's
 * Google Drive folder. Returns { success, images: { [projectName]: fileId } }.
 * Results are cached in memory for 1 hour.
 */
import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";

const IMAGES_SHEET_ID = "1bJ8_uJCVkIAEmem9BzRSZ8ZgUI5Y3ypZMWS-IscZ-x8";

function extractFolderId(url: string): string | null {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

let _cache: { data: Record<string, string>; expires: number } | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  if (_cache && Date.now() < _cache.expires) {
    res.setHeader("Cache-Control", "public, s-maxage=3600");
    return res.status(200).json({ success: true, images: _cache.data });
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    return res.status(200).json({ success: true, images: {} });
  }

  try {
    const auth = new google.auth.JWT({
      email,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const drive = google.drive({ version: "v3", auth });

    const sheetRes = await sheets.spreadsheets.values.get({
      spreadsheetId: IMAGES_SHEET_ID,
      range: "A2:B200",
    });

    const rows = (sheetRes.data.values as string[][] | undefined) || [];
    const images: Record<string, string> = {};

    await Promise.all(
      rows.map(async (row) => {
        const project = row[0]?.trim();
        const folderUrl = row[1]?.trim();
        if (!project || !folderUrl) return;

        const folderId = extractFolderId(folderUrl);
        if (!folderId) return;

        try {
          const filesRes = await drive.files.list({
            q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
            fields: "files(id,name)",
            pageSize: 5,
            orderBy: "name",
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
          });
          const files = filesRes.data.files || [];
          if (files.length > 0 && files[0].id) {
            images[project] = files[0].id;
          }
        } catch {
          // folder not accessible — skip silently
        }
      }),
    );

    _cache = { data: images, expires: Date.now() + 60 * 60 * 1000 };
    res.setHeader("Cache-Control", "public, s-maxage=3600");
    return res.status(200).json({ success: true, images });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message });
  }
}
