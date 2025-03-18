import sharp from 'sharp';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PUBLIC_DIR = join(__dirname, '..', 'public');
const SOURCE_ICON = join(PUBLIC_DIR, 'icon-512x512.png');

// iOS icon sizes
const iosIcons = [
  { size: 152, name: 'icon-152x152.png' },
  { size: 167, name: 'icon-167x167.png' },
  { size: 180, name: 'icon-180x180.png' }
];

// iOS splash screen sizes
const iosSplashScreens = [
  { width: 2048, height: 2732, name: 'splash-2048x2732.png' },
  { width: 1668, height: 2388, name: 'splash-1668x2388.png' },
  { width: 1536, height: 2048, name: 'splash-1536x2048.png' },
  { width: 1125, height: 2436, name: 'splash-1125x2436.png' },
  { width: 1242, height: 2688, name: 'splash-1242x2688.png' },
  { width: 828, height: 1792, name: 'splash-828x1792.png' },
  { width: 750, height: 1334, name: 'splash-750x1334.png' }
];

async function generateIcons() {
  console.log('Generating iOS icons...');
  for (const icon of iosIcons) {
    await sharp(SOURCE_ICON)
      .resize(icon.size, icon.size)
      .toFile(join(PUBLIC_DIR, icon.name));
    console.log(`Generated ${icon.name}`);
  }
}

async function generateSplashScreens() {
  console.log('\nGenerating iOS splash screens...');
  // Create a white background with app icon in the center
  for (const screen of iosSplashScreens) {
    const canvas = sharp({
      create: {
        width: screen.width,
        height: screen.height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    });

    // Calculate icon size (30% of the smallest dimension)
    const iconSize = Math.round(Math.min(screen.width, screen.height) * 0.3);
    
    // Resize the icon
    const icon = await sharp(SOURCE_ICON)
      .resize(iconSize, iconSize)
      .toBuffer();

    // Calculate position to center the icon
    const left = Math.round((screen.width - iconSize) / 2);
    const top = Math.round((screen.height - iconSize) / 2);

    // Composite the icon onto the white background
    await canvas
      .composite([
        {
          input: icon,
          top,
          left
        }
      ])
      .toFile(join(PUBLIC_DIR, screen.name));
    
    console.log(`Generated ${screen.name}`);
  }
}

async function main() {
  try {
    await generateIcons();
    await generateSplashScreens();
    console.log('\nAll PWA assets generated successfully!');
  } catch (error) {
    console.error('Error generating PWA assets:', error);
    process.exit(1);
  }
}

main();
