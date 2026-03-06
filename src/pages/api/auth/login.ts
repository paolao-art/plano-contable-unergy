import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password } = req.body;
  const masterPassword = process.env.APP_PASSWORD;

  if (!masterPassword) {
    return res.status(500).json({ error: "App password not configured" });
  }

  if (password === masterPassword) {
    // Set a secure cookie. In the future, this can be a JWT or session ID.
    const cookie = serialize("auth_token", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    res.setHeader("Set-Cookie", cookie);
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ error: "Contraseña incorrecta" });
}
