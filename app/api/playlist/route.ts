import { NextResponse } from "next/server";
import { getSpotifyAccessToken } from "@/lib/spotify";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const playlistId = searchParams.get("playlistId");

    if (!playlistId) {
      return NextResponse.json(
        { error: "Missing playlistId" },
        { status: 400 },
      );
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("Missing Spotify credentials");
    }

    const token = await getSpotifyAccessToken(clientId, clientSecret);

    const res = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Spotify API error ${res.status}: ${body}`);
    }

    const data = await res.json();

    return NextResponse.json({
      id: data.id,
      name: data.name,
      image: data.images?.[0]?.url ?? null,
      owner: data.owner?.display_name ?? "Unknown",
      totalTracks: data.tracks?.total ?? 0,
      spotifyUrl: data.external_urls?.spotify,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch playlist";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
