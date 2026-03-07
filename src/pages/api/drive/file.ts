import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing file id" });
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    return res.status(500).json({ error: "Missing credentials" });
  }

  try {
    const auth = new google.auth.JWT({
      email,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/spreadsheets.readonly",
      ],
    });

    const drive = google.drive({ version: "v3", auth });

    // Get MIME type first
    const meta = await drive.files.get({ fileId: id, fields: "mimeType" });
    const mimeType = meta.data.mimeType || "application/pdf";

    // Stream file content back to the browser
    const fileRes = await drive.files.get(
      { fileId: id, alt: "media" },
      { responseType: "stream" },
    );

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "private, max-age=3600");

    (fileRes.data as NodeJS.ReadableStream).pipe(res);
  } catch (error: unknown) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el archivo." });
  }
}
