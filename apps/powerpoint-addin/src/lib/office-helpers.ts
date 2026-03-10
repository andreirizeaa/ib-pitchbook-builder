/**
 * Insert slides from a PPTX base64 string into the active presentation.
 * Uses the Office.js PowerPoint API `insertSlidesFromBase64`.
 */
export async function insertSlidesFromBase64(base64: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // @ts-ignore — Office.js global
    PowerPoint.run(async (context: any) => {
      context.presentation.insertSlidesFromBase64(base64);
      await context.sync();
      resolve();
    }).catch(reject);
  });
}

/**
 * Delete all slides in the current presentation (for replacing with fresh ones).
 */
export async function deleteAllSlides(): Promise<void> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    PowerPoint.run(async (context: any) => {
      const slides = context.presentation.slides;
      slides.load('items');
      await context.sync();

      // Delete from end to start to avoid index shifting
      for (let i = slides.items.length - 1; i >= 0; i--) {
        slides.items[i].delete();
      }
      await context.sync();
      resolve();
    }).catch(reject);
  });
}

/**
 * Replace all slides: delete existing then insert new ones from base64.
 */
export async function replaceSlides(base64: string): Promise<void> {
  await deleteAllSlides();
  await insertSlidesFromBase64(base64);
}

/**
 * Fetch a PPTX file from a URL and return as base64 string.
 */
export async function fetchPptxAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
