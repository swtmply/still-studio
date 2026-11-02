// Keep the original print-quality PNG on the device; share a smaller JPEG.
export async function compressStrip(blob) {
  const image = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare the smaller shared image.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Image compression failed.')), 'image/jpeg', 0.8));
  } finally { image.close(); }
}
