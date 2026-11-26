import { dateLabel, drawFrame, filters, frames, photoRects } from './strip';
import { GIF_MAX_BYTES, POSTCARD, type InkFrame, type InkLayout } from './ink-layouts';
import { GIF_FRAMES, GIF_FRAME_MS, type InkShot } from './ink-capture';

export type InkOverlay =
  | { kind: 'preset'; image: HTMLCanvasElement }
  | { kind: 'upload'; image: HTMLImageElement }
  | null;

const presetSpacing = { margin: 50, gap: 22, top: 110, bottom: 224 };

export function inkPhotoRects(layout: InkLayout, framed: boolean) {
  return photoRects({
    width: POSTCARD.width,
    height: POSTCARD.height,
    photoCount: layout.count,
    columns: layout.columns,
    ...(framed ? presetSpacing : { margin: 0, gap: 0, top: 0, bottom: 0 }),
  });
}

function canvasAt(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: width < 200 });
  if (!context) throw new Error('Could not prepare the postcard.');
  return { canvas, context };
}

async function loadImage(src: string) {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
}

export function drawInkPreset(canvas: HTMLCanvasElement, design: string, layout: InkLayout) {
  const context = canvas.getContext('2d');
  const frame = frames.find((item) => item.id === design);
  if (!context || !frame) return;
  const { width, height } = POSTCARD;
  context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  drawFrame(context, frame, { width, height, margin: presetSpacing.margin * 2 });
  for (const rect of inkPhotoRects(layout, true)) {
    context.clearRect(rect.x, rect.y, rect.width, rect.height);
  }

  const footerTop = height - presetSpacing.bottom;
  context.fillStyle = frame.ink;
  context.font = 'bold 24px Arial';
  context.textAlign = 'left';
  context.fillText('MOMENTS IN INK', presetSpacing.margin, 68);
  context.textAlign = 'right';
  context.fillText(`${layout.count} LITTLE MOMENT${layout.count === 1 ? '' : 'S'}`, width - presetSpacing.margin, 68);
  context.textAlign = 'center';
  context.font = 'bold 76px Georgia';
  context.fillText(`Moments in Ink${frame.motif ? ' ' + frame.motif : ''}`, width / 2, footerTop + 88);
  context.font = '24px Arial';
  context.fillText('A MOMENT TO KEEP', width / 2, footerTop + 133);
  context.font = '20px Arial';
  context.fillText(dateLabel(new Date()), width / 2, footerTop + 178);
}

async function loadFrame(frame: InkFrame | undefined, layout: InkLayout): Promise<InkOverlay> {
  if (!frame) return null;
  if (frame.kind === 'upload') return { kind: 'upload', image: await loadImage(frame.url) };
  const { canvas } = canvasAt(POSTCARD.print.width, POSTCARD.print.height);
  drawInkPreset(canvas, frame.design, layout);
  return { kind: 'preset', image: canvas };
}

function paintCell(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | HTMLCanvasElement,
  rect: ReturnType<typeof photoRects>[number],
  framed: boolean,
) {
  const scaleX = context.canvas.width / POSTCARD.width;
  const scaleY = context.canvas.height / POSTCARD.height;
  // Preset photos extend under the artwork so scaled window edges never show a seam.
  const bleed = framed ? 1 : 0;
  const x = Math.round(rect.x * scaleX) - bleed;
  const y = Math.round(rect.y * scaleY) - bleed;
  const w = Math.round((rect.x + rect.width) * scaleX) + bleed - x;
  const h = Math.round((rect.y + rect.height) * scaleY) + bleed - y;
  const scale = Math.max(w / image.width, h / image.height);
  const sourceWidth = w / scale;
  const sourceHeight = h / scale;
  context.drawImage(image, (image.width - sourceWidth) / 2, (image.height - sourceHeight) / 2, sourceWidth, sourceHeight, x, y, w, h);
}

export async function renderInkPrint(shots: InkShot[], layout: InkLayout, filter: string, overlay?: InkFrame) {
  const [images, frame] = await Promise.all([Promise.all(shots.map(({ photo }) => loadImage(photo))), loadFrame(overlay, layout)]);
  const { canvas, context } = canvasAt(POSTCARD.print.width, POSTCARD.print.height);
  const framed = frame?.kind === 'preset';
  const rects = inkPhotoRects(layout, framed);
  context.filter = filters[filter] ?? 'none';
  images.forEach((image, i) => paintCell(context, image, rects[i], framed));
  context.filter = 'none';
  if (frame) context.drawImage(frame.image, 0, 0, canvas.width, canvas.height);
  return { image: canvas.toDataURL('image/png'), overlay: frame };
}

export async function renderInkGif(shots: InkShot[], layout: InkLayout, filter: string, frame: InkOverlay) {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
  const sample = shots[0].frames[0];
  const scratch = canvasAt(sample.width, sample.height);
  const framed = frame?.kind === 'preset';
  const rects = inkPhotoRects(layout, framed);
  for (const [width, height] of [[175, 259], [150, 222]]) {
    const { context } = canvasAt(width, height);
    const encoder = GIFEncoder();
    for (let i = 0; i < GIF_FRAMES; i++) {
      context.filter = filters[filter] ?? 'none';
      shots.forEach((shot, index) => {
        const sample = shot.frames[i];
        if (scratch.canvas.height !== sample.height) scratch.canvas.height = sample.height;
        scratch.context.putImageData(sample, 0, 0);
        paintCell(context, scratch.canvas, rects[index], framed);
      });
      context.filter = 'none';
      if (frame) context.drawImage(frame.image, 0, 0, width, height);
      const { data } = context.getImageData(0, 0, width, height);
      const palette = quantize(data, 96);
      encoder.writeFrame(applyPalette(data, palette), width, height, { palette, delay: GIF_FRAME_MS });
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    encoder.finish();
    const bytes = Uint8Array.from(encoder.bytes());
    if (bytes.byteLength <= GIF_MAX_BYTES) return new Blob([bytes], { type: 'image/gif' });
  }
  throw new Error('This GIF is too large to share. You can still print the postcard.');
}
