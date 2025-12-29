import { getRandomPreview } from "@/lib/spotify";
import { NextResponse } from "next/server";

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

    const clientIdFromQuery = searchParams.get("clientId") || "anonymous";

    const track = await getRandomPreview(
      clientId,
      clientSecret,
      playlistId,
      clientIdFromQuery,
    );
    return NextResponse.json(track);
  } catch (error) {
    console.error(error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch track";

    if (
      error instanceof Error &&
      (error.message.includes("404") ||
        error.message.includes("Resource not found"))
    ) {
      return NextResponse.json(
        { error: "Playlist not found. Please check the playlist ID or URL." },
        { status: 404 },
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
