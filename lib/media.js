export function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timeout);
      reject(new DOMException('Capture cancelled', 'AbortError'));
    };
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

export async function captureShot(video, signal, onShutter) {
  if (video.readyState < 2) throw new Error('The camera stopped. Enable it again to continue.');
  if (!globalThis.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    throw new Error('This browser cannot record video moments. Use a current browser with video recording support.');
  }
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 480;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create the photo. Please try again.');
  let animation;
  function draw() {
    const scale = Math.max(720 / video.videoWidth, 480 / video.videoHeight);
    const width = video.videoWidth * scale;
    const height = video.videoHeight * scale;
    context.setTransform(-1, 0, 0, 1, 720, 0);
    context.drawImage(video, (720 - width) / 2, (480 - height) / 2, width, height);
    animation = requestAnimationFrame(draw);
  }
  draw();
  const recordingStream = canvas.captureStream(15);
  const mimeType = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp8', 'video/webm']
    .find((type) => MediaRecorder.isTypeSupported(type));
  let recorder;
  try {
    recorder = new MediaRecorder(recordingStream, { ...(mimeType ? { mimeType } : {}), videoBitsPerSecond: 800000 });
    const chunks = [];
    const stopped = new Promise((resolve, reject) => {
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => reject(new Error('The video could not be recorded. Please try this shot again.'));
      recorder.onstop = () => {
        const clip = new Blob(chunks, { type: recorder.mimeType });
        if (clip.size) resolve(clip);
        else reject(new Error('The video was empty. Please try this shot again.'));
      };
    });
    // An aborted capture can leave the recorder's stop event to arrive later.
    void stopped.catch(() => {});
    recorder.start();
    await delay(1500, signal);
    const still = document.createElement('canvas');
    still.width = 1080;
    still.height = 720;
    const stillContext = still.getContext('2d');
    if (!stillContext) throw new Error('Could not capture the photo.');
    const scale = Math.max(1080 / video.videoWidth, 720 / video.videoHeight);
    stillContext.setTransform(-1, 0, 0, 1, 1080, 0);
    stillContext.drawImage(video, (1080 - video.videoWidth * scale) / 2, (720 - video.videoHeight * scale) / 2, video.videoWidth * scale, video.videoHeight * scale);
    const photo = still.toDataURL('image/jpeg', 0.9);
    onShutter();
    await delay(1500, signal);
    recorder.stop();
    return { photo, clip: await stopped };
  } finally {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    cancelAnimationFrame(animation);
    for (const track of recordingStream.getTracks()) track.stop();
  }
}
