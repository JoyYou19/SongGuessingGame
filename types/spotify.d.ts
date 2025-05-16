declare module "spotify" {
  export interface Artist {
    name: string;
  }
  export interface TrackSummary {
    id: string;
    name: string;
    artist: string;
    previewUrl: string | null;
  }

  export interface Track {
    id: string;
    preview_url: string | null;
    name: string;
    artists: Artist[];
  }

  export interface PlaylistTrack {
    track: Track | null;
  }

  export interface PlaylistResponse {
    tracks: {
      items: PlaylistTrack[];
    };
  }

  export interface DirectApiTrack {
    preview_url: string;
    name: string;
    artists: Artist[];
  }

  export interface DirectApiResponse {
    items: {
      track: DirectApiTrack;
    }[];
  }
}
