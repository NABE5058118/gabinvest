import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const QUALITY = 80;

export async function processImage(inputPath: string): Promise<string> {
  if (inputPath.toLowerCase().endsWith('.webp')) {
    return inputPath;
  }

  const outputPath = inputPath.replace(/\.\w+$/, '.webp');

  await sharp(inputPath)
    .rotate()
    .resize(MAX_WIDTH, MAX_HEIGHT, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: QUALITY })
    .toFile(outputPath);

  if (fs.existsSync(inputPath)) {
    try {
      fs.unlinkSync(inputPath);
    } catch {
      // ignore cleanup errors
    }
  }

  return outputPath;
}
