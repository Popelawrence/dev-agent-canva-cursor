/**
 * Canva design formats offered to the user when sending a photo into Canva.
 *
 * Pure data (no Node dependencies) so it can be imported by both the client
 * component and server routes. `width`/`height` of `null` means "match the
 * photo's own dimensions".
 */
export interface CanvaFormat {
  key: string;
  label: string;
  width: number | null;
  height: number | null;
}

export const CANVA_FORMATS: CanvaFormat[] = [
  { key: "match", label: "Match photo", width: null, height: null },
  { key: "instagram_post", label: "Instagram post (1080×1080)", width: 1080, height: 1080 },
  { key: "instagram_story", label: "Instagram story (1080×1920)", width: 1080, height: 1920 },
  { key: "presentation", label: "Presentation (1920×1080)", width: 1920, height: 1080 },
  { key: "poster", label: "Poster (2480×3508)", width: 2480, height: 3508 },
  { key: "facebook_post", label: "Facebook post (1200×630)", width: 1200, height: 630 },
];

export function resolveFormat(key: string): CanvaFormat | undefined {
  return CANVA_FORMATS.find((f) => f.key === key);
}
