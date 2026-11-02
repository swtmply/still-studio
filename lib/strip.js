export const frames = [
  { id: 'classic', name: 'Classic', paper: '#fffdf8', ink: '#39372e', motif: '' },
  { id: 'midnight', name: 'Midnight', paper: '#343b37', ink: '#f1ecd9', motif: '' },
  { id: 'petal', name: 'Petal', paper: '#f0d5d6', ink: '#875864', motif: '♡' },
  { id: 'butter', name: 'Butter', paper: '#f5e7b3', ink: '#887137', motif: '☀' },
  { id: 'olive', name: 'Olive', paper: '#d5dcc8', ink: '#53654c', motif: '❧' },
  { id: 'postcard', name: 'Postcard', paper: '#f6f0e2', ink: '#9b5440', motif: '' },
];
export const filters = { color: 'none', mono: 'grayscale(1)', warm: 'sepia(0.35) saturate(0.85)' };

export function dateLabel(date) {
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(date).toUpperCase();
}

export async function makeStrip(photoSources, design, finish, createdAt) {
  const images = await Promise.all(photoSources.map(async (source) => {
    const image = new Image();
    image.src = source;
    await image.decode();
    return image;
  }));
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 3600;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create the photo strip. Your photos are still here; try again.');
  context.fillStyle = design.paper;
  context.fillRect(0, 0, 1200, 3600);
  if (design.id === 'postcard') {
    const colors = ['#cc674c', '#faf5e6', '#7894a0', '#faf5e6'];
    for (let edge = -3600; edge < 4800; edge += 45) {
      context.fillStyle = colors[((edge + 3600) / 45) % 4];
      context.beginPath();
      context.moveTo(edge, 0);
      context.lineTo(edge + 45, 0);
      context.lineTo(edge + 3645, 3600);
      context.lineTo(edge + 3600, 3600);
      context.fill();
    }
    context.fillStyle = design.paper;
    context.fillRect(20, 20, 1160, 3560);
  }
  context.fillStyle = design.ink;
  context.font = '22px Arial';
  context.textAlign = 'left';
  context.fillText('S T I L L   S T U D I O', 60, 62);
  context.textAlign = 'right';
  context.fillText('FOUR LITTLE MOMENTS', 1140, 62);
  context.filter = filters[finish];
  images.forEach((image, index) => context.drawImage(image, 60, 100 + index * 775, 1080, 720));
  context.filter = 'none';
  context.textAlign = 'center';
  context.font = 'bold 160px Georgia';
  context.fillText(`still.${design.motif ? ` ${design.motif}` : ''}`, 600, 3332);
  context.font = '24px Arial';
  context.fillText('A   M O M E N T   T O   K E E P', 600, 3410);
  context.globalAlpha = 0.65;
  context.font = '23px Arial';
  context.fillText(dateLabel(new Date(createdAt)), 600, 3490);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error('Could not export this strip. Please try a different frame.'));
  }, 'image/png'));
}
