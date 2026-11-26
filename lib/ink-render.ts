import { drawFrame, filters, frames } from './strip';
import { GIF_MAX_BYTES, POSTCARD, type InkFrame, type InkLayout } from './ink-layouts';
import { GIF_FRAMES, GIF_FRAME_MS, type InkShot } from './ink-capture';

export type InkOverlay = HTMLImageElement | HTMLCanvasElement | null;

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
  const edge = 34;
  const gap = 22;
  const cellWidth = width / layout.columns;
  const cellHeight = height / layout.rows;
  context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  drawFrame(context, frame, { width, height, margin: 100 });
  for (let row = 0; row < layout.rows; row++) {
    for (let column = 0; column < layout.columns; column++) {
      const left = column === 0 ? edge : gap / 2;
      const right = column === layout.columns - 1 ? edge : gap / 2;
      const top = row === 0 ? edge : gap / 2;
      const bottom = row === layout.rows - 1 ? edge : gap / 2;
      context.clearRect(column * cellWidth + left, row * cellHeight + top, cellWidth - left - right, cellHeight - top - bottom);
    }
  }
}

async function loadFrame(frame: InkFrame | undefined, layout: InkLayout) {
  if (!frame) return null;
  if (frame.kind === 'upload') return loadImage(frame.url);
  const { canvas } = canvasAt(POSTCARD.width, POSTCARD.height);
  drawInkPreset(canvas, frame.design, layout);
  return canvas;
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

export async function renderInkPrint(shots: InkShot[], layout: InkLayout, filter: string, overlay?: InkFrame) {
  const [images, frame] = await Promise.all([Promise.all(shots.map(({ photo }) => loadImage(photo))), loadFrame(overlay, layout)]);
  const { canvas, context } = canvasAt(POSTCARD.print.width, POSTCARD.print.height);
  context.filter = filters[filter] ?? 'none';
  images.forEach((image, i) => paintCell(context, image, i, layout));
  context.filter = 'none';
  if (frame) context.drawImage(frame, 0, 0, canvas.width, canvas.height);
  return { image: canvas.toDataURL('image/png'), overlay: frame };
}

export async function renderInkGif(shots: InkShot[], layout: InkLayout, filter: string, frame: InkOverlay) {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
  const sample = shots[0].frames[0];
  const scratch = canvasAt(sample.width, sample.height);
  for (const [width, height] of [[175, 259], [150, 222]]) {
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
