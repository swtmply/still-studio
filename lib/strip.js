export const PHOTO_COUNTS = [4, 6, 8];

export const layouts = [
  { id: 'strip-4', name: 'Classic strip', photoCount: 4, columns: 1, width: 1200, height: 3600, margin: 60, gap: 55, top: 100, bottom: 455 },
  { id: 'grid-4', name: 'Square quartet', photoCount: 4, columns: 2, width: 1800, height: 1800, margin: 80, gap: 40, top: 100, bottom: 340 },
  { id: 'wide-4', name: 'Photo row', photoCount: 4, columns: 4, width: 3600, height: 1350, margin: 120, gap: 60, top: 120, bottom: 450 },
  { id: 'grid-6', name: 'Six together', photoCount: 6, columns: 2, width: 2400, height: 3000, margin: 120, gap: 60, top: 140, bottom: 520 },
  { id: 'wide-6', name: 'Wide six', photoCount: 6, columns: 3, width: 3000, height: 2100, margin: 120, gap: 60, top: 140, bottom: 440 },
  { id: 'strip-6', name: 'Long story', photoCount: 6, columns: 1, width: 1200, height: 5100, margin: 60, gap: 45, top: 100, bottom: 455 },
  { id: 'grid-8', name: 'Eight moments', photoCount: 8, columns: 2, width: 2400, height: 3720, margin: 120, gap: 60, top: 140, bottom: 440 },
  { id: 'wide-8', name: 'Memory board', photoCount: 8, columns: 4, width: 3600, height: 2400, margin: 120, gap: 60, top: 140, bottom: 540 },
];

export function getLayout(photoCount = 4, id) {
  return layouts.find((layout) => layout.id === id && layout.photoCount === photoCount)
    || layouts.find((layout) => layout.photoCount === photoCount);
}

export const frames = [
  { id: 'classic', name: 'Classic', paper: '#fffdf8', ink: '#39372e', motif: '' },
  { id: 'midnight', name: 'Midnight', paper: '#343b37', ink: '#f1ecd9', motif: '' },
  { id: 'petal', name: 'Petal', paper: '#f0d5d6', ink: '#875864', motif: '♡' },
  { id: 'butter', name: 'Butter', paper: '#f5e7b3', ink: '#887137', motif: '☀' },
  { id: 'olive', name: 'Olive', paper: '#d5dcc8', ink: '#53654c', motif: '❧' },
  { id: 'postcard', name: 'Postcard', paper: '#f6f0e2', ink: '#9b5440', motif: '', pattern: 'airmail' },
  { id: 'sakura', name: 'Sakura', paper: '#f9e8eb', ink: '#93566c', accent: '#d58aa0', motif: '♡', pattern: 'petals' },
  { id: 'ocean', name: 'Ocean', paper: '#dceef1', ink: '#366979', accent: '#86b6c0', motif: '~', pattern: 'waves' },
  { id: 'gingham', name: 'Gingham', paper: '#fbefd9', ink: '#806249', accent: '#ddb393', motif: '', pattern: 'checks' },
  { id: 'confetti', name: 'Confetti', paper: '#fff4dd', ink: '#9b633e', accent: '#d98d70', motif: '✦', pattern: 'confetti' },
  { id: 'starlight', name: 'Starlight', paper: '#252a40', ink: '#f5e8c6', accent: '#dbbf7f', motif: '✦', pattern: 'stars' },
  { id: 'film', name: 'Film club', paper: '#242424', ink: '#f2e9d6', accent: '#c2bbaa', motif: '', pattern: 'film' },
];

export const filterOptions = [
  { id: 'color', name: 'Original', value: 'none' },
  { id: 'mono', name: 'B & W', value: 'grayscale(1)' },
  { id: 'warm', name: 'Warm', value: 'sepia(0.35) saturate(0.85)' },
  { id: 'vintage', name: 'Vintage', value: 'sepia(0.6) contrast(0.9) saturate(0.75)' },
  { id: 'cool', name: 'Cool', value: 'saturate(0.8) hue-rotate(12deg) brightness(1.06)' },
  { id: 'faded', name: 'Faded', value: 'contrast(0.8) brightness(1.12) saturate(0.7)' },
  { id: 'noir', name: 'Noir', value: 'grayscale(1) contrast(1.4) brightness(0.95)' },
  { id: 'rose', name: 'Rose', value: 'sepia(0.3) hue-rotate(320deg) saturate(1.25)' },
  { id: 'golden', name: 'Golden', value: 'sepia(0.45) saturate(1.3) brightness(1.08)' },
];
export const filters = Object.fromEntries(filterOptions.map(({ id, value }) => [id, value]));

export function dateLabel(date) {
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).toUpperCase();
}

export function photoRects(layout) {
  const rows = layout.photoCount / layout.columns;
  const width = (layout.width - 2 * layout.margin - (layout.columns - 1) * layout.gap) / layout.columns;
  const height = (layout.height - layout.top - layout.bottom - (rows - 1) * layout.gap) / rows;
  return Array.from({ length: layout.photoCount }, (_, index) => ({
    x: layout.margin + (index % layout.columns) * (width + layout.gap),
    y: layout.top + Math.floor(index / layout.columns) * (height + layout.gap),
    width, height,
  }));
}

function drawFrame(context, design, layout) {
  const { width, height, margin } = layout;
  context.fillStyle = design.paper;
  context.fillRect(0, 0, width, height);
  context.save();
  context.fillStyle = design.accent || design.ink;
  context.strokeStyle = design.accent || design.ink;
  if (design.pattern === 'airmail') {
    const colors = ['#cc674c', '#faf5e6', '#7894a0', '#faf5e6'];
    for (let edge = -height, index = 0; edge < width; edge += 45, index++) {
      context.fillStyle = colors[index % colors.length];
      context.beginPath();
      context.moveTo(edge, 0); context.lineTo(edge + 45, 0);
      context.lineTo(edge + height + 45, height); context.lineTo(edge + height, height);
      context.fill();
    }
    context.fillStyle = design.paper;
    const border = margin / 3;
    context.fillRect(border, border, width - 2 * border, height - 2 * border);
  } else if (design.pattern === 'film') {
    for (let y = 20; y < height - 20; y += 70) {
      context.fillRect(12, y, margin * 0.45, 40);
      context.fillRect(width - margin * 0.45 - 12, y, margin * 0.45, 40);
    }
  } else if (design.pattern === 'checks') {
    context.globalAlpha = 0.28;
    const size = width / 28;
    for (let row = 0; row * size < height; row++) {
      for (let col = 0; col * size < width; col++) if ((row + col) % 2 === 0) context.fillRect(col * size, row * size, size, size);
    }
  } else if (design.pattern === 'waves') {
    context.globalAlpha = 0.35;
    context.lineWidth = 3;
    for (let y = 30; y < height; y += 85) {
      context.beginPath();
      for (let x = 0; x <= width; x += 8) context.lineTo(x, y + Math.sin(x / 40) * 10);
      context.stroke();
    }
  } else if (design.pattern) {
    context.globalAlpha = design.pattern === 'stars' ? 0.7 : 0.4;
    const count = Math.ceil(width * height / 19000);
    for (let index = 0; index < count; index++) {
      const x = (index * 283 + 29) % width;
      const y = (index * 457 + 37) % height;
      if (design.pattern === 'stars') {
        const radius = index % 3 === 0 ? 10 : 5;
        context.beginPath(); context.moveTo(x - radius, y); context.lineTo(x + radius, y);
        context.moveTo(x, y - radius); context.lineTo(x, y + radius); context.stroke();
      } else if (design.pattern === 'petals') {
        for (let petal = 0; petal < 4; petal++) {
          context.beginPath(); context.ellipse(x + Math.cos(petal * Math.PI / 2) * 8, y + Math.sin(petal * Math.PI / 2) * 8, 5, 11, petal * Math.PI / 2, 0, Math.PI * 2); context.fill();
        }
      } else {
        context.fillStyle = ['#dc846f', '#80a99d', '#e7ba62', '#a09ec5'][index % 4];
        context.save(); context.translate(x, y); context.rotate(index);
        context.fillRect(-5, -12, 10, 24); context.restore();
      }
    }
  }
  context.restore();
}

function drawPhoto(context, image, rect) {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = rect.width / rect.height;
  const width = sourceRatio > targetRatio ? image.naturalHeight * targetRatio : image.naturalWidth;
  const height = sourceRatio > targetRatio ? image.naturalHeight : image.naturalWidth / targetRatio;
  context.drawImage(image, (image.naturalWidth - width) / 2, (image.naturalHeight - height) / 2, width, height, rect.x, rect.y, rect.width, rect.height);
}

export async function makeStrip(photoSources, design, finish, createdAt, layout = getLayout(), scale = 1) {
  if (!layout || photoSources.length !== layout.photoCount) throw new Error('Choose the right number of photos for this layout.');
  const images = await Promise.all(photoSources.map(async (source) => {
    const image = new Image(); image.src = source; await image.decode(); return image;
  }));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(layout.width * scale);
  canvas.height = Math.round(layout.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create the photo print. Your photos are still here; try again.');
  context.scale(scale, scale);
  drawFrame(context, design, layout);
  context.fillStyle = design.ink;
  context.font = `${Math.min(layout.width * 0.018, layout.top * 0.35)}px Arial`;
  context.textAlign = 'left';
  context.fillText('S T I L L   S T U D I O', layout.margin, layout.top * 0.6);
  context.textAlign = 'right';
  context.fillText(`${layout.photoCount} LITTLE MOMENTS`, layout.width - layout.margin, layout.top * 0.6);
  context.filter = filters[finish] || 'none';
  const rects = photoRects(layout);
  images.forEach((image, index) => drawPhoto(context, image, rects[index]));
  context.filter = 'none';
  const footerTop = layout.height - layout.bottom;
  context.textAlign = 'center';
  context.font = `bold ${Math.min(layout.width * 0.13, layout.bottom * 0.42)}px Georgia`;
  context.fillText(`still.${design.motif ? ` ${design.motif}` : ''}`, layout.width / 2, footerTop + layout.bottom * 0.46);
  context.font = `${Math.min(layout.width * 0.02, layout.bottom * 0.065)}px Arial`;
  context.fillText('A   M O M E N T   T O   K E E P', layout.width / 2, footerTop + layout.bottom * 0.67);
  context.globalAlpha = 0.65;
  context.font = `${Math.min(layout.width * 0.018, layout.bottom * 0.058)}px Arial`;
  context.fillText(dateLabel(new Date(createdAt)), layout.width / 2, footerTop + layout.bottom * 0.83);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (blob) resolve(blob); else reject(new Error('Could not export this print. Please try a different design.'));
  }, 'image/png'));
}
