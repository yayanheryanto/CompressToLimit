import { formatSize } from './format-size';

type ProgressCallback = (percent: number, step: string) => void;

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      mimeType,
      quality
    );
  });
}

export async function compressImage(
  file: File,
  targetBytes: number,
  onProgress?: ProgressCallback
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(url);

      try {
        const MAX_DIM = 4096;
        let w = img.width;
        let h = img.height;

        if (w > MAX_DIM || h > MAX_DIM) {
          const scale = Math.min(MAX_DIM / w, MAX_DIM / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);

        // PNG → JPEG for better compression
        const outputMime = file.type === 'image/png' ? 'image/jpeg' : file.type;

        // Binary search quality
        let lo = 0.05;
        let hi = 1.0;
        let bestBlob: Blob | null = null;
        const MAX_ITER = 14;

        onProgress?.(10, 'Starting binary search on quality…');

        for (let i = 0; i < MAX_ITER; i++) {
          const mid = (lo + hi) / 2;
          const blob = await canvasToBlob(canvas, outputMime, mid);
          const pct = 10 + ((i + 1) / MAX_ITER) * 60;

          onProgress?.(pct, `Quality ${Math.round(mid * 100)}% → ${formatSize(blob.size)}`);

          if (blob.size <= targetBytes) {
            bestBlob = blob;
            lo = mid;
            if (targetBytes - blob.size < targetBytes * 0.05) break;
          } else {
            hi = mid;
          }

          if (hi - lo < 0.005) break;
        }

        // Still too big → scale down dimensions
        if (!bestBlob || bestBlob.size > targetBytes) {
          onProgress?.(72, 'Quality limit reached — scaling dimensions…');

          for (let s = 0.9; s >= 0.2; s -= 0.1) {
            const nw = Math.round(w * s);
            const nh = Math.round(h * s);
            const sc = document.createElement('canvas');
            sc.width = nw;
            sc.height = nh;
            sc.getContext('2d')!.drawImage(canvas, 0, 0, nw, nh);
            const blob = await canvasToBlob(sc, outputMime, lo || 0.6);
            onProgress?.(72 + (0.9 - s) * 28, `Scale ${Math.round(s * 100)}% → ${formatSize(blob.size)}`);
            if (blob.size <= targetBytes) {
              bestBlob = blob;
              break;
            }
          }
        }

        onProgress?.(100, 'Compression complete.');

        if (!bestBlob) {
          reject(new Error('Could not compress image to target size. Try a larger target.'));
          return;
        }

        resolve(bestBlob);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Compression failed'));
      }
    };

    img.onerror = () => reject(new Error('Failed to load image. File may be corrupted.'));
    img.src = url;
  });
}
