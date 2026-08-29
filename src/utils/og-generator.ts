/**
 * Helper to generate a 1200x630 Open Graph (OG) image blob from a source image (File or URL).
 * Uses HTML5 Canvas with smart composition:
 * - Output Resolution: 1200 x 630 px (Standard 1.91:1 Open Graph ratio)
 * - Background: Scaled cover with soft frosted blur & subtle darkening
 * - Foreground: Full portrait/landscape image placed centered at full height (no heads cut off)
 * - Shadow: Soft natural drop shadow around the foreground image for separation
 */
export async function createOgImageBlob(source: File | string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const cleanUp = () => {
      if (typeof source !== 'string' && img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 630;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanUp();
          return reject(new Error('Canvas 2D context not available'));
        }

        const targetW = 1200;
        const targetH = 630;
        const imgW = img.naturalWidth || img.width || 1200;
        const imgH = img.naturalHeight || img.height || 630;

        // 1. Draw Blurred Background (Cover fit)
        ctx.save();
        const bgScale = Math.max(targetW / imgW, targetH / imgH) * 1.15; // scale 115% to prevent edge blur gaps
        const bgW = imgW * bgScale;
        const bgH = imgH * bgScale;
        const bgX = (targetW - bgW) / 2;
        const bgY = (targetH - bgH) / 2;

        if (typeof ctx.filter !== 'undefined') {
          ctx.filter = 'blur(24px) brightness(0.65)';
        }
        ctx.drawImage(img, bgX, bgY, bgW, bgH);
        ctx.restore();

        // 2. Add subtle dark overlay for contrast & richness
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.restore();

        // 3. Draw Foreground Image (Full height fit, centered, preserving 100% aspect ratio)
        ctx.save();
        const fgScale = targetH / imgH;
        const fgW = imgW * fgScale;
        const fgX = (targetW - fgW) / 2;
        const fgY = 0;

        // Soft drop shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = 32;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;

        ctx.drawImage(img, fgX, fgY, fgW, targetH);
        ctx.restore();

        cleanUp();

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate OG image blob'));
            }
          },
          'image/jpeg',
          0.9
        );
      } catch (err) {
        cleanUp();
        reject(err);
      }
    };

    img.onerror = () => {
      cleanUp();
      reject(new Error('Failed to load source image for OG generation'));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}
