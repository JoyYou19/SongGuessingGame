// /app/api/track/route.ts
import { NextResponse } from "next/server";
import { getRandomPreview } from "@/lib/spotify";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const playlistId =
      searchParams.get("playlistId") || "0XlOyEhV3svED5bXnbimkh"; // default if none provided
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Missing Spotify credentials");
    }

    const track = await getRandomPreview(clientId, clientSecret, playlistId);
    return NextResponse.json(track);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch track" },
      { status: 500 },
    );
  }
}
