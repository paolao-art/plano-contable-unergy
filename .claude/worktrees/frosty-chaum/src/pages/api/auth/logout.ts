import type { NextApiRequest, NextApiResponse } from "next";
import { serialize } from "cookie";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const cookie = serialize("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0),
    path: "/",
  });

  res.setHeader("Set-Cookie", cookie);
  return res.status(200).json({ success: true });
}
