export function getPrintSize(layout) {
  // 600 pixels per inch keeps the original classic strip at 2 × 6 inches.
  return { width: layout.width / 600, height: layout.height / 600 };
}

export async function printMoment(frame, imageUrl, layout) {
  const printWindow = frame.contentWindow;
  const printDocument = frame.contentDocument;
  if (!printWindow || !printDocument) throw new Error('Printing is unavailable in this browser. Save the photo print and print it from your device.');

  const { width, height } = getPrintSize(layout);
  printDocument.title = `Still Studio — ${layout.name}`;
  const style = printDocument.createElement('style');
  style.textContent = `
    @page { size: ${width}in ${height}in; margin: 0; }
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
    img { display: block; width: ${width}in; height: ${height}in; object-fit: contain; }
  `;
  printDocument.head.append(style);
  const image = printDocument.createElement('img');
  image.alt = 'Your finished photo print';
  image.src = imageUrl;
  printDocument.body.append(image);
  await image.decode();
  if (!frame.isConnected) return;
  // shortcut: the browser controls printer selection; automatic routing needs a local print service.
  printWindow.focus();
  printWindow.print();
}
