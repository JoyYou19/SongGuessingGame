declare module "spotify" {
  export interface Artist {
    name: string;
  }

  export interface Track {
    preview_url: string;
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
