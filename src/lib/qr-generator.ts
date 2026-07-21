/* eslint-disable prefer-const */
import QRCode from 'qrcode';

export interface QRStyleConfig {
  fgColor?: string;
  bgColor?: string;
  dotType?: 'square' | 'rounded' | 'dots';
  logoUrl?: string;
  frameType?: 'none' | 'standard' | 'label';
  labelText?: string;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
}

export interface GenerateQRResult {
  svg: string;
  matrixSize: number;
}

export function generateQRCodeSVG(
  text: string,
  config: QRStyleConfig = {}
): GenerateQRResult {
  const fgColor = config.fgColor || '#000000';
  const bgColor = config.bgColor || '#ffffff';
  const dotType = config.dotType || 'square';
  const logoUrl = config.logoUrl || '';
  const frameType = config.frameType || 'none';
  const labelText = config.labelText || '';
  const errorCorrection = config.errorCorrection || (logoUrl ? 'H' : 'Q');

  // 1. Create the QR Code matrix using 'qrcode'
  const qr = QRCode.create(text, { errorCorrectionLevel: errorCorrection });
  const matrixSize = qr.modules.size;
  const matrix = qr.modules;

  // 2. SVG Sizing Config
  const blockSize = 10;
  const qrPadding = 20;
  const qrSize = matrixSize * blockSize;
  const qrFullSize = qrSize + qrPadding * 2;

  // Define sizes for frame layouts
  let svgWidth = qrFullSize;
  let svgHeight = qrFullSize;
  let qrOffsetY = qrPadding;
  let qrOffsetX = qrPadding;

  if (frameType === 'standard') {
    svgWidth = qrFullSize + 20;
    svgHeight = qrFullSize + 20;
    qrOffsetX = qrPadding + 10;
    qrOffsetY = qrPadding + 10;
  } else if (frameType === 'label') {
    svgWidth = qrFullSize + 20;
    svgHeight = qrFullSize + 60; // Extra room for label
    qrOffsetX = qrPadding + 10;
    qrOffsetY = qrPadding + 10;
  }

  // 3. Define the Logo mask zone (skip rendering QR modules in this area)
  let logoStart = -1;
  let logoEnd = -1;
  let hasLogo = !!logoUrl;

  if (hasLogo) {
    // Logo should occupy about 20-25% of the blocks in the center
    const logoBlockSize = Math.floor(matrixSize * 0.25) | 1; // force odd number for symmetry
    logoStart = Math.floor((matrixSize - logoBlockSize) / 2);
    logoEnd = logoStart + logoBlockSize - 1;
  }

  // 4. Generate SVG Elements for QR modules
  let paths: string[] = [];

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Check if this cell is filled
      if (matrix.get(r, c)) {
        // Skip rendering if inside the logo mask zone
        if (hasLogo && r >= logoStart && r <= logoEnd && c >= logoStart && c <= logoEnd) {
          continue;
        }

        const x = qrOffsetX + c * blockSize;
        const y = qrOffsetY + r * blockSize;

        if (dotType === 'dots') {
          const cx = x + blockSize / 2;
          const cy = y + blockSize / 2;
          const radius = blockSize * 0.4;
          paths.push(`<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${fgColor}" />`);
        } else if (dotType === 'rounded') {
          const rx = blockSize * 0.35;
          paths.push(
            `<rect x="${x}" y="${y}" width="${blockSize}" height="${blockSize}" rx="${rx}" ry="${rx}" fill="${fgColor}" />`
          );
        } else {
          // Default square
          paths.push(
            `<rect x="${x}" y="${y}" width="${blockSize}" height="${blockSize}" fill="${fgColor}" />`
          );
        }
      }
    }
  }

  // 5. Draw the Logo overlay in the center
  let logoElement = '';
  if (hasLogo && logoStart !== -1) {
    const logoBlockSize = logoEnd - logoStart + 1;
    const logoSizePx = logoBlockSize * blockSize;
    const logoX = qrOffsetX + logoStart * blockSize;
    const logoY = qrOffsetY + logoStart * blockSize;

    // Draw white background backing for the logo to avoid QR overlap bleeding
    logoElement = `
      <rect x="${logoX - 2}" y="${logoY - 2}" width="${logoSizePx + 4}" height="${logoSizePx + 4}" fill="${bgColor}" rx="${blockSize * 0.4}" />
      <image href="${logoUrl}" x="${logoX}" y="${logoY}" width="${logoSizePx}" height="${logoSizePx}" preserveAspectRatio="xMidYMid meet" />
    `;
  }

  // 6. Draw Frame options
  let frameElements = '';
  if (frameType === 'standard') {
    frameElements = `
      <rect x="5" y="5" width="${svgWidth - 10}" height="${svgHeight - 10}" fill="none" stroke="${fgColor}" stroke-width="4" rx="10" />
    `;
  } else if (frameType === 'label') {
    const labelY = svgHeight - 22;
    frameElements = `
      <rect x="5" y="5" width="${svgWidth - 10}" height="${svgHeight - 10}" fill="none" stroke="${fgColor}" stroke-width="4" rx="10" />
      <line x1="5" y1="${svgHeight - 50}" x2="${svgWidth - 5}" y2="${svgHeight - 50}" stroke="${fgColor}" stroke-width="2" />
      <rect x="5" y="${svgHeight - 50}" width="${svgWidth - 10}" height="45" fill="${bgColor}" rx="10" />
      <text x="50%" y="${labelY}" text-anchor="middle" fill="${fgColor}" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14">${labelText || 'SCAN ME'}</text>
    `;
  }

  // 7. Assemble SVG
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="100%">
      <rect width="100%" height="100%" fill="${bgColor}" />
      <g>
        ${paths.join('\n')}
      </g>
      ${logoElement}
      ${frameElements}
    </svg>
  `.trim();

  return {
    svg,
    matrixSize,
  };
}
