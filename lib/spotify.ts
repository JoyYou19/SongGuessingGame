import { Track, TrackSummary } from "spotify";
import spotifyPreviewFinder from "spotify-preview-finder";
import { JSDOM } from "jsdom";

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

const clientTrackHistory = new Map<string, Set<string>>();

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
  const seenTrackIds = new Set<string>();

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API Error: ${response.status} ${errorBody}`);
    }

    const data: PlaylistTracksResponse = await response.json();

    //console.log(`Fetched ${data.items.length} items. Next: ${!!data.next}`);

    const newTracks = data.items
      .map((item) => item.track)
      .filter((track): track is Track => track !== null)
      .map((track) => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map((a) => a.name).join(", "),
        previewUrl: track.preview_url,
      }));

    for (const track of newTracks) {
      if (!seenTrackIds.has(track.id)) {
        allTracks.push(track);
        seenTrackIds.add(track.id);
      } else {
        //console.log(`Duplicate found and skipped: ${track.name} (${track.id})`);
      }
    }

    url = data.next || "";
  }
  //
  //console.log(`Total tracks fetched: ${allTracks.length}`);

  return allTracks;
}

export async function getRandomPreview(
  clientId: string,
  clientSecret: string,
  playlistId: string = "37i9dQZF1DX4WYQ3aQLD4K",
  userId: string = "anonymous",
): Promise<{
  previewUrl: string;
  name: string;
  artist: string;
  trackId: string;
  allTracks: TrackSummary[];
  embedHtml: string;
}> {
  try {
    // Check cache first
    let cached = playlistCache.get(playlistId);

    const token = await getSpotifyAccessToken(clientId, clientSecret);
    if (!cached || cached.expires < Date.now()) {
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

    const songClientId = userId || "anonymous"; // Inject this into the function
    const heardSet = clientTrackHistory.get(songClientId) || new Set<string>();

    // Filter to unheard tracks
    const unheardTracks = allTracks.filter((track) => !heardSet.has(track.id));

    if (unheardTracks.length === 0) {
      // If all tracks have been heard, reset the set
      heardSet.clear();
      unheardTracks.push(...allTracks);
    }

    while (attempts < MAX_ATTEMPTS) {
      // Pick random track
      const randomTrack =
        allTracks[Math.floor(Math.random() * allTracks.length)];

      // Try to get preview URL
      let previewUrl = randomTrack.previewUrl;

      // If no Spotify preview, use the preview finder
      if (!previewUrl) {
        previewUrl = await getSpotifyPreviewUrl(randomTrack.id);
      }

      // If no Spotify preview, use the preview finder
      if (!previewUrl) {
        previewUrl = await getPreviewFromTrackId(randomTrack.id, token);
      }

      if (!previewUrl) {
        previewUrl = await getPreviewFromTrackUrl(randomTrack.id);
      }

      if (!previewUrl) {
        previewUrl = await getPreviewFromName(randomTrack.name);
      }

      if (previewUrl) {
        heardSet.add(randomTrack.id);
        clientTrackHistory.set(songClientId, heardSet);

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

async function getPreviewFromTrackId(
  trackId: string,
  token: string,
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      console.error(`Failed to fetch track ${trackId}: ${response.status}`);
      return null;
    }

    const track = await response.json();
    return track.preview_url || null;
  } catch (error) {
    console.error(`Error fetching track ${trackId}:`, error);
    return null;
  }
}

async function getPreviewFromTrackUrl(trackId: string): Promise<string | null> {
  try {
    const trackUrl = `https://open.spotify.com/track/${trackId}`;
    const response = await fetch(trackUrl);
    const html = await response.text();

    // Parse the HTML to find preview URLs
    const previewUrlRegex = /"preview_url":"([^"]+)"/;
    const match = html.match(previewUrlRegex);

    return match ? match[1] : null;
  } catch (error) {
    console.error(`Failed to scrape preview for track ${trackId}:`, error);
    return null;
  }
}

export function getSpotifyEmbed(
  trackId: string,
  width: number = 400,
  height: number = 300,
): string {
  return `
<iframe style="border-radius:12px" src="https://open.spotify.com/embed/track/${trackId}?utm_source=generator" width="${width}" height="${height}" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
  `;
}

// Or if you need just the embed URL:
export function getSpotifyEmbedUrl(trackId: string): string {
  return `https://open.spotify.com/embed/track/${trackId}`;
}

async function getSpotifyPreviewUrl(trackId: string): Promise<string | null> {
  try {
    const trackUrl = `https://open.spotify.com/track/${trackId}`;

    // Fetch the track page
    const response = await fetch(trackUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // Parse the HTML with JSDOM
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Look for the preview URL in the page metadata
    const previewUrl = findPreviewUrlInDocument(document);

    if (!previewUrl) {
      throw new Error("Preview URL not found in page");
    }

    return previewUrl;
  } catch (error) {
    console.error(`Failed to fetch preview for track ${trackId}:`, error);
    return null;
  }
}

function findPreviewUrlInDocument(document: Document): string | null {
  // Method 1: Check meta tags
  const metaTags = document.querySelectorAll("meta");
  for (const tag of metaTags) {
    if (
      tag.getAttribute("property") === "og:audio" ||
      tag.getAttribute("name") === "preview_url"
    ) {
      return tag.getAttribute("content");
    }
  }

  // Method 2: Check script tags for JSON data
  const scripts = document.querySelectorAll(
    'script[type="application/ld+json"]',
  );
  for (const script of scripts) {
    try {
      const json = JSON.parse(script.textContent || "");
      if (json?.previewUrl) {
        return json.previewUrl;
      }
    } catch (e) {
      console.log(e);
      continue;
    }
  }

  // Method 3: Search for p.scdn.co links in attributes
  const elements = document.querySelectorAll("*");
  for (const element of elements) {
    for (const attr of element.attributes) {
      if (attr.value.includes("p.scdn.co")) {
        return attr.value;
      }
    }
  }

  return null;
}
