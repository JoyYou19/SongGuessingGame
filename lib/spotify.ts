import spotifyPreviewFinder from "spotify-preview-finder";

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export interface Artist {
  name: string;
}

export interface Track {
  preview_url: string | null;
  name: string;
  artists: Artist[];
}

export interface PlaylistTrackItem {
  track: Track | null;
}

export interface PlaylistTracksResponse {
  items: PlaylistTrackItem[];
  next: string | null;
}

type TrackSummary = { name: string; artist: string };

export async function getSpotifyAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!resp.ok) {
    const errorBody = await resp.text();
    throw new Error(`Failed to get token: ${resp.status} ${errorBody}`);
  }

  const data: SpotifyTokenResponse = await resp.json();
  return data.access_token;
}

export async function getRandomPreview(
  clientId: string,
  clientSecret: string,
  playlistId: string = "37i9dQZF1DX4WYQ3aQLD4K",
): Promise<{
  previewUrl: string;
  name: string;
  artist: string;
  allTracks: TrackSummary[];
}> {
  console.log(`Starting track fetch for playlist: ${playlistId}`);

  try {
    const token = await getSpotifyAccessToken(clientId, clientSecret);
    console.log("Successfully obtained access token");

    const url = new URL(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    );
    url.searchParams.set("market", "US");
    url.searchParams.set(
      "fields",
      "items(track(preview_url,name,artists)),next",
    );
    url.searchParams.set("limit", "50");

    console.log("Making request to:", url.toString());
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("API request failed:", {
        status: response.status,
        errorBody,
      });
      throw new Error(`API Error: ${response.status} ${errorBody}`);
    }

    const data = (await response.json()) as PlaylistTracksResponse;
    console.log("API Response - Total items:", data.items.length);

    // Debug: Log first 5 tracks and their preview status
    data.items.slice(0, 5).forEach((item, index) => {
      console.log(`Track ${index + 1}:`, {
        name: item.track?.name || "Unknown",
        hasPreview: !!item.track?.preview_url,
        previewUrl: item.track?.preview_url || "None",
      });
    });
    const tracks = data.items
      .map((item) => item.track)
      .filter((track): track is Track => track !== null);

    if (tracks.length === 0) {
      throw new Error("No tracks found in the playlist");
    }

    const allTracks = tracks.map((track) => ({
      name: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
    }));

    // Pick one random track
    const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];

    // Fetch preview URL from spotify-preview-finder for that track name
    const previewUrl = await getPreviewFromName(randomTrack.name);

    if (!previewUrl) {
      throw new Error(`No preview found for track: ${randomTrack.name}`);
    }

    return {
      previewUrl,
      name: randomTrack.name,
      artist: randomTrack.artists.map((a) => a.name).join(", "),
      allTracks,
    };
  } catch (error) {
    console.error("Full error details:", error);
    throw error;
  }
}

async function getPreviewFromName(trackName: string): Promise<string | null> {
  try {
    const result = await spotifyPreviewFinder(trackName, 1);
    if (result.success && result.results.length > 0) {
      // Return the first preview url found
      return result.results[0].previewUrls[0] || null;
    }
    return null;
  } catch (e) {
    console.error("Preview finder error:", e);
    return null;
  }
}
