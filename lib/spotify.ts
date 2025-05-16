import { Track, TrackSummary } from "spotify";
import spotifyPreviewFinder from "spotify-preview-finder";

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export interface PlaylistTrackItem {
  track: Track | null;
}

export interface PlaylistTracksResponse {
  items: PlaylistTrackItem[];
  next: string | null;
}

interface PlaylistCache {
  tracks: TrackSummary[];
  expires: number;
}

const playlistCache = new Map<string, PlaylistCache>();
const CACHE_TTL = 5 * 60 * 1000;

let cachedToken: {
  token: string;
  expires: number;
} | null = null;
const TOKEN_TTL = 55 * 60 * 1000;

export async function getSpotifyAccessToken(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  // Check if we have a token in the cache already
  if (cachedToken && cachedToken.expires > Date.now()) {
    return cachedToken.token;
  }

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

  cachedToken = {
    token: data.access_token,
    expires: Date.now() + TOKEN_TTL,
  };
  return data.access_token;
}

async function fetchAllPlaylistTracks(
  token: string,
  playlistId: string,
): Promise<TrackSummary[]> {
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
  const params = new URLSearchParams({
    fields: "items(track(id,preview_url,name,artists)),next",
    limit: "100",
  });
  url += `?${params}`;

  const allTracks: TrackSummary[] = [];

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API Error: ${response.status} ${errorBody}`);
    }

    const data: PlaylistTracksResponse = await response.json();

    const tracks = data.items
      .map((item) => item.track)
      .filter((track): track is Track => track !== null)
      .map((track) => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map((a) => a.name).join(", "),
        previewUrl: track.preview_url,
      }));

    allTracks.push(...tracks);
    url = data.next || "";
  }

  return allTracks;
}

export async function getRandomPreview(
  clientId: string,
  clientSecret: string,
  playlistId: string = "37i9dQZF1DX4WYQ3aQLD4K",
): Promise<{
  previewUrl: string;
  name: string;
  artist: string;
  trackId: string;
  allTracks: TrackSummary[];
  embedHtml: string;
}> {
  console.log(`Starting track fetch for playlist: ${playlistId}`);

  try {
    // Check cache first
    let cached = playlistCache.get(playlistId);
    if (!cached || cached.expires < Date.now()) {
      const token = await getSpotifyAccessToken(clientId, clientSecret);
      const allTracks = await fetchAllPlaylistTracks(token, playlistId);

      playlistCache.set(playlistId, {
        tracks: allTracks,
        expires: Date.now() + CACHE_TTL,
      });
      cached = { tracks: allTracks, expires: Date.now() + CACHE_TTL };
    }

    const { tracks: allTracks } = cached;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    while (attempts < MAX_ATTEMPTS) {
      // Pick random track
      const randomTrack =
        allTracks[Math.floor(Math.random() * allTracks.length)];

      // Try to get preview URL
      let previewUrl = randomTrack.previewUrl;

      // If no Spotify preview, use the preview finder
      if (!previewUrl) {
        previewUrl = await getPreviewFromName(randomTrack.name);
      }

      if (previewUrl) {
        return {
          previewUrl,
          name: randomTrack.name,
          artist: randomTrack.artist,
          trackId: randomTrack.id,
          allTracks,
          embedHtml: getSpotifyEmbed(randomTrack.id),
        };
      }

      attempts++;
      console.warn(
        `No preview found for ${randomTrack.name}, attempt ${attempts}/${MAX_ATTEMPTS}`,
      );
    }

    throw new Error(`Could not find preview after ${MAX_ATTEMPTS} attempts`);
  } catch (error) {
    console.error("Full error details:", error);
    throw error;
  }
}

const previewFinderCache = new Map<string, string>();
const RATE_LIMIT = 100; // 1 second between calls

let lastCall = 0;

async function getPreviewFromName(trackName: string): Promise<string | null> {
  // Check cache first
  const cached = previewFinderCache.get(trackName);
  if (cached) return cached;

  // Rate limit
  const now = Date.now();
  if (now - lastCall < RATE_LIMIT) {
    await new Promise((resolve) =>
      setTimeout(resolve, RATE_LIMIT - (now - lastCall)),
    );
  }

  try {
    const result = await spotifyPreviewFinder(trackName, 1);
    const previewUrl = result.success
      ? result.results[0]?.previewUrls[0]
      : null;

    if (previewUrl) {
      previewFinderCache.set(trackName, previewUrl);
      lastCall = Date.now();
    }

    return previewUrl;
  } catch (error) {
    console.error(`Preview finder failed for ${trackName}:`, error);
    return null;
  }
}

export function getSpotifyEmbed(
  trackId: string,
  width: number = 400,
  height: number = 400,
): string {
  console.log("This is the trackid: ", trackId);
  return `
<iframe style="border-radius:12px" src="https://open.spotify.com/embed/track/${trackId}?utm_source=generator" width="${width}" height="${height}" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
  `;
}

// Or if you need just the embed URL:
export function getSpotifyEmbedUrl(trackId: string): string {
  return `https://open.spotify.com/embed/track/${trackId}`;
}
