import { filters } from './strip';
import { GIF_MAX_BYTES, POSTCARD, type InkLayout } from './ink-layouts';
import { GIF_FRAMES, GIF_FRAME_MS, type InkShot } from './ink-capture';

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

function paintCell(context: CanvasRenderingContext2D, image: HTMLImageElement | HTMLCanvasElement, index: number, layout: InkLayout) {
  const { width, height } = context.canvas;
  const column = index % layout.columns;
  const row = Math.floor(index / layout.columns);
  const x = Math.round(column * width / layout.columns);
  const y = Math.round(row * height / layout.rows);
  const w = Math.round((column + 1) * width / layout.columns) - x;
  const h = Math.round((row + 1) * height / layout.rows) - y;
  const scale = Math.max(w / image.width, h / image.height);
  const sourceWidth = w / scale;
  const sourceHeight = h / scale;
  context.drawImage(image, (image.width - sourceWidth) / 2, (image.height - sourceHeight) / 2, sourceWidth, sourceHeight, x, y, w, h);
}

export async function renderInkPrint(shots: InkShot[], layout: InkLayout, filter: string, overlay?: string) {
  const [images, frame] = await Promise.all([Promise.all(shots.map(({ photo }) => loadImage(photo))), overlay ? loadImage(overlay) : null]);
  const { canvas, context } = canvasAt(POSTCARD.width, POSTCARD.height);
  context.filter = filters[filter] ?? 'none';
  images.forEach((image, i) => paintCell(context, image, i, layout));
  context.filter = 'none';
  if (frame) context.drawImage(frame, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

export async function renderInkGif(shots: InkShot[], layout: InkLayout, filter: string, overlay?: string) {
  const [{ GIFEncoder, quantize, applyPalette }, frame] = await Promise.all([import('gifenc'), overlay ? loadImage(overlay) : null]);
  const sample = shots[0].frames[0];
  const scratch = canvasAt(sample.width, sample.height);
  for (const [width, height] of [[185, 285], [148, 228]]) {
    const { context } = canvasAt(width, height);
    const encoder = GIFEncoder();
    for (let i = 0; i < GIF_FRAMES; i++) {
      context.filter = filters[filter] ?? 'none';
      shots.forEach((shot, index) => {
        const sample = shot.frames[i];
        if (scratch.canvas.height !== sample.height) scratch.canvas.height = sample.height;
        scratch.context.putImageData(sample, 0, 0);
        paintCell(context, scratch.canvas, index, layout);
      });
      context.filter = 'none';
      if (frame) context.drawImage(frame, 0, 0, width, height);
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
