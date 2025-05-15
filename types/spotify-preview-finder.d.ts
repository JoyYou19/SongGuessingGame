declare module "spotify-preview-finder" {
  interface PreviewFinderResult {
    success: boolean;
    results: Array<{
      previewUrls: string[];
      name?: string;
      artist?: string;
    }>;
  }

  export default function spotifyPreviewFinder(
    trackName: string,
    limit?: number,
  ): Promise<PreviewFinderResult>;
}
