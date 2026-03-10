import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

const SOFFICE = '/opt/homebrew/bin/soffice';
const PDFTOPPM = '/opt/homebrew/bin/pdftoppm';

/**
 * PPTX Preview Service
 *
 * Converts a PPTX buffer to per-slide PNG images:
 * PPTX → PDF (LibreOffice headless) → PNGs (pdftoppm)
 */
export class PptxPreviewService {

  /**
   * Convert a PPTX buffer to an array of PNG buffers (one per slide).
   */
  async convertToImages(pptxBuffer: Buffer): Promise<Buffer[]> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pptx-preview-'));

    try {
      const pptxPath = path.join(tmpDir, 'presentation.pptx');
      await fs.writeFile(pptxPath, pptxBuffer);

      // Step 1: PPTX → PDF via LibreOffice
      await execFileAsync(SOFFICE, [
        '--headless',
        '--convert-to', 'pdf',
        '--outdir', tmpDir,
        pptxPath,
      ], { timeout: 60_000 });

      const pdfPath = path.join(tmpDir, 'presentation.pdf');
      await fs.access(pdfPath);

      // Step 2: PDF → PNGs via pdftoppm (one per page, 200 DPI for good quality)
      const imgPrefix = path.join(tmpDir, 'slide');
      await execFileAsync(PDFTOPPM, [
        '-png', '-r', '200',
        pdfPath,
        imgPrefix,
      ], { timeout: 60_000 });

      // pdftoppm creates slide-1.png, slide-2.png, etc.
      const files = await fs.readdir(tmpDir);
      const pngFiles = files
        .filter(f => f.startsWith('slide-') && f.endsWith('.png'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/(\d+)/)?.[1] || '0');
          const numB = parseInt(b.match(/(\d+)/)?.[1] || '0');
          return numA - numB;
        });

      const buffers: Buffer[] = [];
      for (const file of pngFiles) {
        buffers.push(await fs.readFile(path.join(tmpDir, file)));
      }

      console.log(`[PptxPreview] Generated ${buffers.length} slide images`);
      return buffers;
    } catch (err: any) {
      console.error('[PptxPreview] Conversion failed:', err.message);
      return [];
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

export const pptxPreview = new PptxPreviewService();
