// Dev-only: render the app icon PNGs from SVG.
import sharp from 'sharp';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#05070a"/>
  <path d="M84 40L36 170M108 40L156 170" stroke="#2a3546" stroke-width="6"/>
  <path d="M96 48v14M96 78v18M96 112v24M96 152v18" stroke="#d8e0e8" stroke-width="5"/>
  <rect x="58" y="112" width="76" height="34" rx="10" fill="#22d3e6"/>
  <rect x="64" y="118" width="18" height="7" rx="2" fill="#ff2e4d"/>
  <rect x="110" y="118" width="18" height="7" rx="2" fill="#ff2e4d"/>
  <path d="M20 128L172 70" stroke="#35f2ff" stroke-width="7" stroke-linecap="round"/>
</svg>`;
await sharp(Buffer.from(svg)).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(Buffer.from(svg)).resize(64, 64).png().toFile('public/favicon.png');
console.log('icons written');
