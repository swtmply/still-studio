export const POSTCARD = { width: 1110, height: 1710, inches: { width: 3.7, height: 5.7 } };
export const FRAME_MAX_BYTES = 2_000_000;
export const GIF_MAX_BYTES = 450_000;
export const SHARE_TTL_MS = 6 * 60 * 60 * 1000;

export const inkLayouts = [
  { id: 'six', label: '2 × 3', columns: 2, rows: 3, count: 6 },
  { id: 'four', label: '2 × 2', columns: 2, rows: 2, count: 4 },
  { id: 'one', label: '1 photo', columns: 1, rows: 1, count: 1 },
] as const;

export type InkLayout = (typeof inkLayouts)[number];
export type InkUpload = { kind: 'upload'; id: string; name: string; layout: InkLayout['id']; url: string };
export type InkPreset = { kind: 'preset'; id: string; name: string; design: string };
export type InkFrame = InkUpload | InkPreset;

export function inkLayout(id: FormDataEntryValue | null) {
  return inkLayouts.find((layout) => layout.id === id);
}
