/**
 * GET /api/drive/image?fileId=XXX
 * Proxies a Google Drive file through the service account so private images
 * can be displayed in the browser. Caches 24 h via CDN headers.
 */
import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { fileId } = req.query;
  if (!fileId || typeof fileId !== "string") {
    return res.status(400).json({ error: "fileId is required" });
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    return res.status(404).end();
  }

  try {
    const auth = new google.auth.JWT({
      email,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    const drive = google.drive({ version: "v3", auth });

    const response = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "stream" },
    );

    const contentType =
      (response.headers as Record<string, string>)["content-type"] || "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");

    (response.data as NodeJS.ReadableStream).pipe(res);
  } catch {
    res.status(404).end();
  }
}
