import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Read or generate SVG
const svgPath = path.join(publicDir, 'icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

// Create maskable SVG with 15% padding so Android circle/squircle crop doesn't touch outer border
const svgContent = fs.readFileSync(svgPath, 'utf-8');
const svgInner = svgContent.replace(/<svg[^>]*>|<\/svg>/g, '');
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#080c14" />
  <g transform="translate(51.2, 51.2) scale(0.8)">
    ${svgInner}
  </g>
</svg>`;
const maskableBuffer = Buffer.from(maskableSvg);

async function generate() {
  console.log('Generating PNG icons for PWA compliance...');
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
  await sharp(maskableBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(svgBuffer).resize(64, 64).png().toFile(path.join(publicDir, 'favicon.ico'));
  console.log('PWA icons successfully generated in /public!');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
