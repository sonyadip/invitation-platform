import { Mp3Encoder } from '@breezystack/lamejs';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function floatTo16BitPCM(floatSamples: Float32Array): Int16Array {
  const int16 = new Int16Array(floatSamples.length);
  for (let i = 0; i < floatSamples.length; i++) {
    const s = Math.max(-1, Math.min(1, floatSamples[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

/**
 * Compresses an image file in the browser using HTML5 Canvas & WebP export.
 * Default: Max 1600px dimension, 82% quality WebP.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<{ file: File; originalSize: number; compressedSize: number; didCompress: boolean }> {
  const originalSize = file.size;

  // Skip non-images, animated GIFs, SVGs, or already lightweight images (< 180 KB)
  if (
    !file.type.startsWith('image/') ||
    file.type === 'image/gif' ||
    file.type === 'image/svg+xml' ||
    originalSize < 180 * 1024
  ) {
    return { file, originalSize, compressedSize: originalSize, didCompress: false };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return resolve({ file, originalSize, compressedSize: originalSize, didCompress: false });
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= originalSize) {
            return resolve({ file, originalSize, compressedSize: originalSize, didCompress: false });
          }

          const baseName = file.name.replace(/\.[^.]+$/, '');
          const compressedFile = new File([blob], `${baseName}.webp`, {
            type: 'image/webp',
            lastModified: Date.now()
          });

          resolve({
            file: compressedFile,
            originalSize,
            compressedSize: compressedFile.size,
            didCompress: true
          });
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ file, originalSize, compressedSize: originalSize, didCompress: false });
    };

    img.src = url;
  });
}

/**
 * Compresses an audio file in the browser using Web Audio API + LAME MP3 Encoder.
 * Encodes to crystal clear 128 kbps stereo MP3 (optimal balance between CD-clarity and small file size).
 */
export async function compressAudioFile(
  file: File,
  kbps = 128
): Promise<{ file: File; originalSize: number; compressedSize: number; didCompress: boolean }> {
  const originalSize = file.size;

  // If already MP3/AAC and under 2.5 MB, skip re-encoding
  if (
    (file.type.includes('mpeg') || file.type.includes('mp3') || file.type.includes('aac')) &&
    originalSize < 2.5 * 1024 * 1024
  ) {
    return { file, originalSize, compressedSize: originalSize, didCompress: false };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;

    if (!AudioContextClass) {
      return { file, originalSize, compressedSize: originalSize, didCompress: false };
    }

    const audioCtx = new AudioContextClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    const channels = Math.min(2, audioBuffer.numberOfChannels);
    const sampleRate = audioBuffer.sampleRate;
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel =
      channels > 1 ? audioBuffer.getChannelData(1) : leftChannel;

    const leftInt16 = floatTo16BitPCM(leftChannel);
    const rightInt16 = channels > 1 ? floatTo16BitPCM(rightChannel) : leftInt16;

    const encoder = new Mp3Encoder(channels, sampleRate, kbps);
    const chunkSize = 1152;
    const mp3Chunks: Uint8Array[] = [];

    for (let i = 0; i < leftInt16.length; i += chunkSize) {
      const leftChunk = leftInt16.subarray(i, i + chunkSize);
      const rightChunk = rightInt16.subarray(i, i + chunkSize);
      const buf = encoder.encodeBuffer(leftChunk, rightChunk);
      if (buf.length > 0) {
        mp3Chunks.push(new Uint8Array(buf));
      }
    }

    const flushBuf = encoder.flush();
    if (flushBuf.length > 0) {
      mp3Chunks.push(new Uint8Array(flushBuf));
    }

    await audioCtx.close().catch(() => {});

    const blob = new Blob(mp3Chunks, { type: 'audio/mpeg' });

    if (blob.size >= originalSize && file.name.toLowerCase().endsWith('.mp3')) {
      return { file, originalSize, compressedSize: originalSize, didCompress: false };
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    const compressedFile = new File([blob], `${baseName}.mp3`, {
      type: 'audio/mpeg',
      lastModified: Date.now()
    });

    return {
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      didCompress: true
    };
  } catch (error) {
    console.warn('Client-side audio compression skipped/failed:', error);
    return { file, originalSize, compressedSize: originalSize, didCompress: false };
  }
}

/**
 * Automatically binds auto-compression to all image and audio file inputs within a form.
 */
export function bindAutoMediaCompression(form: HTMLFormElement) {
  if (!form) return;

  const fileInputs = form.querySelectorAll<HTMLInputElement>('input[type="file"]');

  fileInputs.forEach((input) => {
    // Avoid double binding
    if (input.dataset.compressBound === 'true') return;
    input.dataset.compressBound = 'true';

    // Badge container for compression feedback
    let feedbackEl = input.parentElement?.querySelector('.compress-feedback') as HTMLElement | null;
    if (!feedbackEl) {
      feedbackEl = document.createElement('div');
      feedbackEl.className = 'compress-feedback';
      feedbackEl.style.cssText =
        'font-size: 11px; font-weight: 600; margin-top: 4px; display: none; padding: 2px 8px; border-radius: 4px;';
      input.parentElement?.appendChild(feedbackEl);
    }

    input.addEventListener('change', async () => {
      const files = input.files;
      if (!files || files.length === 0) {
        if (feedbackEl) feedbackEl.style.display = 'none';
        return;
      }

      const isAudio =
        input.name === 'musicFile' ||
        input.accept.includes('audio') ||
        files[0].type.startsWith('audio/');

      if (feedbackEl) {
        feedbackEl.style.display = 'inline-block';
        feedbackEl.style.background = '#e0f2fe';
        feedbackEl.style.color = '#0369a1';
        feedbackEl.textContent = isAudio ? '⏳ Mengompres audio (128 kbps)...' : '⏳ Mengompres gambar...';
      }

      const dt = new DataTransfer();
      let totalOrig = 0;
      let totalComp = 0;
      let anyCompressed = false;

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (isAudio) {
          const res = await compressAudioFile(f);
          dt.items.add(res.file);
          totalOrig += res.originalSize;
          totalComp += res.compressedSize;
          if (res.didCompress) anyCompressed = true;
        } else if (f.type.startsWith('image/')) {
          const res = await compressImageFile(f);
          dt.items.add(res.file);
          totalOrig += res.originalSize;
          totalComp += res.compressedSize;
          if (res.didCompress) anyCompressed = true;
        } else {
          dt.items.add(f);
        }
      }

      input.files = dt.files;

      if (feedbackEl) {
        if (anyCompressed && totalOrig > totalComp) {
          const savedPercent = Math.round(((totalOrig - totalComp) / totalOrig) * 100);
          feedbackEl.style.background = '#dcfce7';
          feedbackEl.style.color = '#15803d';
          feedbackEl.textContent = `✓ Dioptimasi: ${formatBytes(totalOrig)} ➔ ${formatBytes(totalComp)} (-${savedPercent}%)`;
        } else {
          feedbackEl.style.background = '#f1f5f9';
          feedbackEl.style.color = '#475569';
          feedbackEl.textContent = `✓ File siap: ${formatBytes(totalComp)}`;
        }
      }
    });
  });
}
