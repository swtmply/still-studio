import { delay } from './media';

export const GIF_FRAMES = 12;
export const GIF_FRAME_MS = 250;
export const SHOT_INTERVAL = 7_000;

export type InkShot = { photo: string; frames: ImageData[] };

function cameraCanvas(video: HTMLVideoElement, width: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.round(width * video.videoHeight / video.videoWidth);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare the camera image.');
  context.setTransform(-1, 0, 0, 1, canvas.width, 0);
  return { canvas, context };
}

export async function captureInkShot(video: HTMLVideoElement, shutterAt: number, signal: AbortSignal, onShutter: () => void): Promise<InkShot> {
  await delay(Math.max(0, shutterAt - performance.now() - 1500), signal);
  if (video.readyState < 2) throw new Error('The camera stopped responding. Start the camera again.');
  const sample = cameraCanvas(video, 240);
  const frames: ImageData[] = [];
  let photo = '';
  for (let i = 0; i < GIF_FRAMES; i++) {
    const time = shutterAt - 1500 + GIF_FRAME_MS * i;
    await delay(Math.max(0, time - performance.now()), signal);
    if (video.readyState < 2) throw new Error('The camera stopped responding. Start the camera again.');
    sample.context.drawImage(video, 0, 0, sample.canvas.width, sample.canvas.height);
    frames.push(sample.context.getImageData(0, 0, sample.canvas.width, sample.canvas.height));
    if (i === 6) {
      const still = cameraCanvas(video, Math.min(video.videoWidth, 1600));
      still.context.drawImage(video, 0, 0, still.canvas.width, still.canvas.height);
      photo = still.canvas.toDataURL('image/jpeg', 0.92);
      onShutter();
    }
  }
  return { photo, frames };
}
